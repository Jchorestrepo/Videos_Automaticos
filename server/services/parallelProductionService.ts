import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import type { ProjectScript, SceneItem } from '../../src/types/index.ts';
import { ProjectService } from './projectService.ts';
import { PersonaService } from './personaService.ts';
import { CharacterService } from './characterService.ts';
import { ImageService } from './imageService.ts';
import { AudioService } from './audioService.ts';
import { JobProgressService } from './jobProgressService.ts';
import { StoryBacklogService } from './storyBacklogService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const STORAGE_DIR = path.resolve(ROOT_DIR, 'storage/projects');

export interface ParallelProductionOptions {
  projectId: string;
  customArtStyle?: string;
  smartReuse?: boolean;
  forceAiImages?: boolean;
  preferredAudioProvider?: 'voicestudio' | 'elevenlabs' | 'openai';
  voice?: string;
  voiceMode?: 'single' | 'dual';
  primaryVoice?: string;
  secondaryVoice?: string;
  autoRender?: boolean;
}

export interface ParallelProductionResult {
  success: boolean;
  project: ProjectScript;
  imagesGenerated: number;
  imagesReused: number;
  audiosGenerated: number;
  autoRendered: boolean;
  outputVideoUrl?: string;
}

export class ParallelProductionService {
  /**
   * Ejecuta en paralelo la generación de imágenes (API Cloud) y la síntesis de audio (VoiceStudio Local / Cloud),
   * protegiendo el archivo de proyecto contra condiciones de carrera y permitiendo encadenar el renderizado final.
   */
  static async runParallelProduction(
    options: ParallelProductionOptions
  ): Promise<ParallelProductionResult> {
    const { projectId, autoRender } = options;
    const project = ProjectService.getProject(projectId);
    if (!project) throw new Error(`Proyecto ${projectId} no encontrado`);

    const persona = PersonaService.getPersona(project.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';
    const totalScenes = project.scenes.length;

    // 1. Crear el Job de progreso compuesto
    const job = JobProgressService.createJob({
      type: 'turbo_production',
      title: `⚡ Producción Turbo: ${project.title.slice(0, 32)}`,
      projectId,
      channelId,
      phase: `Iniciando generación simultánea: ${totalScenes} imágenes y ${totalScenes} locuciones...`,
      totalSteps: totalScenes * 2,
    });

    // Cola serializada de guardado para evitar race conditions en disco
    let saveQueue = Promise.resolve();
    const safeSave = (p: ProjectScript) => {
      saveQueue = saveQueue
        .then(() => {
          ProjectService.saveProject(p);
        })
        .catch((err) => {
          console.error('[ParallelProduction] Error guardando proyecto en cola:', err);
        });
      return saveQueue;
    };

    // Asegurar elenco del proyecto
    if (!project.characters || project.characters.length === 0) {
      project.characters = CharacterService.resolveCastForStory(
        channelId,
        project.characterCompany || '',
        project.title
      );
      project.scenes = CharacterService.assignCharactersToScenes(project.scenes, project.characters);
    } else {
      project.characters = project.characters.map(
        (c) => CharacterService.getCharacter(channelId, c.character_id) || c
      );
    }

    if (options.voiceMode) project.voiceMode = options.voiceMode;
    if (options.primaryVoice) project.primaryVoice = options.primaryVoice;
    if (options.secondaryVoice !== undefined) project.secondaryVoice = options.secondaryVoice;

    const isVoiceStudioAvailable = await AudioService.isVoiceStudioAvailable();
    const effectiveAudioProvider: 'voicestudio' | 'elevenlabs' | 'openai' =
      options.preferredAudioProvider ||
      project.voiceEngine ||
      (isVoiceStudioAvailable ? 'voicestudio' : (project.language === 'en' ? 'elevenlabs' : 'openai'));
    project.voiceEngine = effectiveAudioProvider;

    const artStyle = options.customArtStyle || project.artStyle || '3d_animation';
    const isSmartReuseEnabled = options.smartReuse !== false;
    project.smartReuseImages = isSmartReuseEnabled;

    await safeSave(project);

    // Métricas de progreso compartido
    let imagesCompleted = 0;
    let audioCompleted = 0;
    let aiGeneratedCount = 0;
    let reusedCount = 0;

    const updateCombinedProgress = () => {
      const currentStep = imagesCompleted + audioCompleted;
      const totalSteps = totalScenes * 2;
      const percent = Math.min(96, Math.max(5, Math.round((currentStep / totalSteps) * 96)));

      JobProgressService.updateJob(job.jobId, {
        percent,
        currentStep,
        totalSteps,
        phase: `Producción en paralelo: ${imagesCompleted}/${totalScenes} imágenes • ${audioCompleted}/${totalScenes} audios`,
        detail: `🖼️ Imágenes: ${aiGeneratedCount} con IA, ${reusedCount} reutilizadas | 🎙️ Locución: ${effectiveAudioProvider}`,
      });
    };

    // Helper para resolver elenco de escena
    const resolveSceneCast = (sc: SceneItem) => {
      if (Array.isArray(sc.character_ids)) {
        if (sc.character_ids.length === 0) return [];
        return sc.character_ids
          .map(
            (id) =>
              project.characters?.find((c) => c.character_id === id) ||
              CharacterService.getCharacter(channelId, id)
          )
          .filter((c): c is NonNullable<typeof c> => Boolean(c) && c.character_category !== 'company_or_brand');
      }
      return project.characters && project.characters.length > 0
        ? project.characters.filter((c) => c.character_category !== 'company_or_brand').slice(0, 1)
        : [];
    };

    // Helper para resolver voz de escena
    const resolveSceneVoice = (sc: SceneItem) => {
      if (options.voice) return options.voice;
      if (project.voiceMode === 'dual') {
        const isSecondary = sc.voiceRole === 'secondary';
        return isSecondary ? project.secondaryVoice || 'demo0001' : project.primaryVoice || 'gomorra';
      }
      return project.primaryVoice || 'gomorra';
    };

    // ==========================================
    // TAREA 1: Generación de Imágenes (API Cloud)
    // ==========================================
    const imagesTask = async () => {
      const usedUrlsInProject = new Set<string>();
      const usedPromptsInProject = new Set<string>();

      for (const sc of project.scenes) {
        if (sc.visual_prompt) usedPromptsInProject.add(sc.visual_prompt.trim().toLowerCase());
      }

      for (let i = 0; i < project.scenes.length; i++) {
        if (JobProgressService.isCancelled(job.jobId)) break;

        const scene = project.scenes[i];
        const sceneCast = resolveSceneCast(scene);
        const primaryChar = sceneCast[0];

        let reused = false;
        if (isSmartReuseEnabled && !options.forceAiImages) {
          const matchingAsset = CharacterService.findMatchingAsset(
            channelId,
            primaryChar?.character_id,
            scene,
            project.characterCompany,
            {
              currentProjectId: project.project_id,
              excludeUrls: usedUrlsInProject,
              excludePrompts: usedPromptsInProject,
            }
          );
          if (matchingAsset) {
            scene.imageUrl = matchingAsset.url;
            scene.imageReused = true;
            scene.reusedAssetPrompt = matchingAsset.prompt;
            usedUrlsInProject.add(matchingAsset.url);
            if (matchingAsset.prompt) usedPromptsInProject.add(matchingAsset.prompt.trim().toLowerCase());
            reused = true;
            reusedCount++;
          }
        }

        if (!reused) {
          // Pacing para respetar el rate limit de Vertex AI (5 RPM)
          if (aiGeneratedCount > 0) {
            const isUsingVertex =
              process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ||
              Boolean(process.env.GOOGLE_CLOUD_PROJECT);
            const paceMs = isUsingVertex ? 9500 : 1500;
            await new Promise((r) => setTimeout(r, paceMs));
          }

          const imageUrl = await ImageService.generateSceneImage(
            projectId,
            scene.scene_id,
            scene.visual_prompt,
            scene.chapter,
            channelId,
            sceneCast,
            totalScenes,
            artStyle,
            scene.shot_type
          );
          const cleanUrl = (imageUrl || '').split('?')[0];
          scene.imageUrl = cleanUrl ? `${cleanUrl}?t=${Date.now()}` : imageUrl;
          scene.imageReused = false;
          scene.reusedAssetPrompt = undefined;
          aiGeneratedCount++;
          if (imageUrl) usedUrlsInProject.add(imageUrl);

          if (primaryChar && cleanUrl && !cleanUrl.toLowerCase().endsWith('.svg')) {
            CharacterService.addImageToCharacterGallery(
              channelId,
              primaryChar.character_id,
              cleanUrl,
              {
                prompt: scene.visual_prompt,
                description: scene.chapter,
                placeOrEnvironment: CharacterService.detectPlace(scene.visual_prompt),
                companyOrSubject: project.characterCompany,
                shotType: scene.shot_type,
                tags: CharacterService.extractTags(
                  scene.visual_prompt,
                  sceneCast.map((c) => c.name).join(', '),
                  project.characterCompany
                ),
                coCharacterIds: sceneCast.slice(1).map((c) => c.character_id),
                sourceProjectId: project.project_id,
                sourceSceneId: scene.scene_id,
              }
            );
          }
        }

        imagesCompleted++;
        updateCombinedProgress();
        await safeSave(project);
      }
    };

    // ==========================================
    // TAREA 2: Síntesis de Audio (Local / Cloud)
    // ==========================================
    const audioTask = async () => {
      for (let i = 0; i < project.scenes.length; i++) {
        if (JobProgressService.isCancelled(job.jobId)) break;

        const scene = project.scenes[i];
        const sceneVoice = resolveSceneVoice(scene);

        const result = await AudioService.generateSceneAudio(
          projectId,
          scene.scene_id,
          scene.voiceover,
          channelId,
          effectiveAudioProvider,
          sceneVoice
        );

        scene.audioUrl = result.audioUrl;
        scene.voiceoverTextAtAudioGen = scene.voiceover;
        scene.durationInSeconds = result.durationInSeconds;
        scene.wordTimings = result.wordTimings;
        scene.voiceProfile = sceneVoice;

        audioCompleted++;
        updateCombinedProgress();
        await safeSave(project);
      }
    };

    // 2. Ejecutar ambas tareas en paralelo
    console.log(`[ParallelProduction] 🚀 Lanzando imágenes y audios en paralelo para ${projectId}...`);
    await Promise.all([imagesTask(), audioTask()]);

    if (JobProgressService.isCancelled(job.jobId)) {
      throw new Error('Producción cancelada por el usuario');
    }

    // 3. Sincronizar duraciones bilingües y finalizar paso de medios
    await AudioService.synchronizeBilingualDurations(project);
    project.status = 'images_ready';
    project.lastActiveStep = 4;
    project.videoNeedsReRender = true;

    if (project.story_id) {
      await StoryBacklogService.updateStory(channelId, project.story_id, {
        status: 'in_production',
        linkedProjectId: project.project_id,
      });
    }
    await safeSave(project);

    // 4. Si autoRender está activado, encadenar el renderizado con Remotion CLI automáticamente
    let finalVideoUrl: string | undefined = undefined;
    let didAutoRender = false;

    if (autoRender) {
      console.log(`[ParallelProduction] 🎬 Auto-renderizando proyecto ${projectId} con Remotion CLI...`);
      didAutoRender = true;
      finalVideoUrl = await this.renderProjectRemotion(project, job.jobId);
    } else {
      JobProgressService.completeJob(
        job.jobId,
        '⚡ ¡Imágenes y Locución listas en paralelo!',
        `${aiGeneratedCount} imágenes IA, ${reusedCount} reutilizadas • ${totalScenes} audios sintetizados con éxito`
      );
    }

    const updated = ProjectService.getProject(projectId) || project;
    return {
      success: true,
      project: updated,
      imagesGenerated: aiGeneratedCount,
      imagesReused: reusedCount,
      audiosGenerated: audioCompleted,
      autoRendered: didAutoRender,
      outputVideoUrl: finalVideoUrl,
    };
  }

  /**
   * Helper de Renderizado con Remotion CLI con concurrencia adaptativa y soporte bilingüe
   */
  private static async renderProjectRemotion(
    project: ProjectScript,
    jobId: string
  ): Promise<string> {
    const projectId = project.project_id;
    const targetLang = (project.language || 'en') as 'es' | 'en';
    const projectDir = path.resolve(STORAGE_DIR, projectId);
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

    // Preparar escenas exactas para el idioma
    let scenesToRender = project.scenes;
    if (targetLang === 'es' && project.scenes_es && project.scenes_es.length > 0) {
      scenesToRender = project.scenes.map((s, idx) => {
        const es = project.scenes_es?.find((e) => e.scene_id === s.scene_id) || project.scenes_es?.[idx];
        const esAudioPath = path.join(projectDir, 'audio_es', `scene_${s.scene_id}.mp3`);
        const fallbackAudio = path.join(projectDir, 'audio', `scene_${s.scene_id}.mp3`);
        let audioUrl = es?.audioUrl;
        if (!audioUrl) {
          if (fs.existsSync(esAudioPath)) audioUrl = `/storage/${projectId}/audio_es/scene_${s.scene_id}.mp3`;
          else if (fs.existsSync(fallbackAudio)) audioUrl = `/storage/${projectId}/audio/scene_${s.scene_id}.mp3`;
        }
        return {
          ...s,
          chapter: es?.chapter_es || s.chapter,
          voiceover: es?.voiceover_es || s.voiceover,
          audioUrl: audioUrl || s.audioUrl,
          wordTimings: es?.wordTimings || s.wordTimings,
          durationInSeconds: es?.audioDurationSeconds || s.durationInSeconds,
        };
      });
    }

    const totalFrames = Math.max(
      60,
      Math.round(scenesToRender.reduce((acc, s) => acc + (s.durationInSeconds || 3), 0) * 30)
    );

    // Concurrencia adaptativa basada en los núcleos de CPU del sistema
    const cpuCount = os.cpus().length || 4;
    const optimalConcurrency = Math.min(10, Math.max(4, Math.floor(cpuCount * 0.75)));

    JobProgressService.updateJob(jobId, {
      percent: 5,
      phase: `Compilando video 1080p en Remotion (${optimalConcurrency} hilos concurrentes)...`,
      detail: `0 / ${totalFrames} fotogramas (1920x1080 @ 30fps)`,
    });

    const propsPath = path.join(projectDir, 'remotion_props.json');
    const remotionProps = {
      channelId: project.channel_id,
      title: project.title,
      scenes: scenesToRender,
      showCaptions: false,
      showAtmosphere: true,
      showHighlightCards: true,
      showChapterBadge: true,
      motionIntensity: 'standard',
      language: targetLang,
    };
    fs.writeFileSync(propsPath, JSON.stringify(remotionProps, null, 2), 'utf-8');

    const videoFileName = targetLang === 'es' ? 'final_video_es.mp4' : 'final_video_en.mp4';
    const outputPath = path.join(projectDir, videoFileName);

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'npx',
        [
          'remotion',
          'render',
          'src/remotion/index.ts',
          'DocumentaryVideo',
          outputPath,
          `--props=${propsPath}`,
          '--overwrite',
          `--concurrency=${optimalConcurrency}`,
        ],
        { cwd: ROOT_DIR }
      );

      JobProgressService.registerChildProcess(jobId, child);

      let lastLog = '';
      const handleChunk = (chunk: Buffer) => {
        const text = chunk.toString();
        lastLog = text;

        const frameMatch = text.match(/(?:Rendered|Rendering|Stitching)?\s*(\d+)\s*\/\s*(\d+)/i);
        if (frameMatch) {
          const current = Number(frameMatch[1]);
          const total = Number(frameMatch[2]) || totalFrames;
          if (total > 0 && current <= total) {
            const isStitching = /Stitching|Encoding/i.test(text);
            const basePct = isStitching
              ? 88 + Math.round((current / total) * 10)
              : 15 + Math.round((current / total) * 73);
            JobProgressService.updateJob(jobId, {
              percent: Math.min(98, basePct),
              currentStep: current,
              totalSteps: total,
              phase: isStitching
                ? `Codificando y uniendo audio/video MP4 (${current}/${total})...`
                : `Renderizando fotogramas Remotion 1080p (${current} / ${total})...`,
              detail: `${Math.round((current / total) * 100)}% de los frames procesados (${optimalConcurrency} hilos)`,
            });
          }
        }
      };

      child.stdout.on('data', handleChunk);
      child.stderr.on('data', handleChunk);
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (JobProgressService.isCancelled(jobId)) {
          reject(new Error('Renderizado cancelado por el usuario'));
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Remotion finalizó con código ${code}: ${lastLog.slice(-200)}`));
        }
      });
    });

    const renderTimestamp = Date.now();
    const versionedUrl = `/storage/${projectId}/${videoFileName}?v=${renderTimestamp}`;

    if (targetLang === 'es') {
      project.outputVideoUrlEs = versionedUrl;
      project.lastRenderedAtEs = new Date().toISOString();
    } else {
      project.outputVideoUrlEn = versionedUrl;
      project.lastRenderedAtEn = new Date().toISOString();
    }

    project.outputVideoUrl = versionedUrl;
    project.lastRenderedAt = new Date().toISOString();
    project.videoNeedsReRender = false;
    project.status = 'rendered';
    project.lastActiveStep = 6;
    ProjectService.saveProject(project);

    try {
      fs.copyFileSync(outputPath, path.join(projectDir, 'final_video.mp4'));
    } catch {}

    try {
      const outDir = path.resolve(ROOT_DIR, 'out');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(outputPath, path.join(outDir, `DocumentaryVideo_${targetLang}.mp4`));
      fs.copyFileSync(outputPath, path.join(outDir, 'DocumentaryVideo.mp4'));
    } catch {}

    JobProgressService.completeJob(
      jobId,
      `⚡ ¡Producción Turbo Completada: Video 1080p (${targetLang.toUpperCase()}) renderizado!`,
      `Archivo disponible en ${versionedUrl}`
    );

    return versionedUrl;
  }
}
