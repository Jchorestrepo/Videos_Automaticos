import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectScript } from '../../src/types/index.ts';
import { CharacterService } from './characterService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export class ProjectService {
  static saveProject(project: ProjectScript): void {
    const projectDir = path.join(STORAGE_DIR, project.project_id);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const filePath = path.join(projectDir, 'script.json');
    if (fs.existsSync(filePath)) {
      try {
        const diskProject = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProjectScript;
        if (!project.voiceEngine && diskProject.voiceEngine) project.voiceEngine = diskProject.voiceEngine;
        if (!project.primaryVoice && diskProject.primaryVoice) project.primaryVoice = diskProject.primaryVoice;
        if (!project.secondaryVoice && diskProject.secondaryVoice) project.secondaryVoice = diskProject.secondaryVoice;
        if (!project.voiceMode && diskProject.voiceMode) project.voiceMode = diskProject.voiceMode;

        if (Array.isArray(project.scenes) && Array.isArray(diskProject.scenes)) {
          for (const s of project.scenes) {
            const diskScene = diskProject.scenes.find((ds) => ds.scene_id === s.scene_id);
            if (diskScene) {
              if (!s.audioUrl && diskScene.audioUrl) {
                s.audioUrl = diskScene.audioUrl;
                if (!s.wordTimings && diskScene.wordTimings) s.wordTimings = diskScene.wordTimings;
                if (!s.audioDurationSeconds && diskScene.audioDurationSeconds) s.audioDurationSeconds = diskScene.audioDurationSeconds;
                if (!s.voiceoverTextAtAudioGen && diskScene.voiceoverTextAtAudioGen) s.voiceoverTextAtAudioGen = diskScene.voiceoverTextAtAudioGen;
                if (!s.voiceProfile && diskScene.voiceProfile) s.voiceProfile = diskScene.voiceProfile;
              }
              if (!s.imageUrl && diskScene.imageUrl) {
                s.imageUrl = diskScene.imageUrl;
                if (s.imageReused === undefined && diskScene.imageReused !== undefined) s.imageReused = diskScene.imageReused;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[ProjectService.saveProject] Error fusionando con disco para ${project.project_id}:`, err);
      }
    }

    project.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
  }

  static getProject(projectId: string): ProjectScript | null {
    const filePath = path.join(STORAGE_DIR, projectId, 'script.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const project = JSON.parse(content) as ProjectScript;
      const channelId = project.channel_id || 'tech_scandals';

      // Migrar automáticamente si el proyecto tenía un personaje combinado antiguo o escenas sin character_ids
      const hasLegacyCombinedChar = (project.characters || []).some((c) =>
        [
          'david_karp_tumblr_y_marissa_ma',
          'dom_hofmann_rus_yusupov_y_coli',
          'kevin_rose___digg',
        ].includes(c.character_id) ||
        /\s+y\s+|,/i.test(c.name)
      );

      let modified = false;
      if (hasLegacyCombinedChar || !project.characters || project.characters.length === 0) {
        const rawSource =
          project.characters?.[0]?.name || project.characterCompany || project.title;
        project.characters = CharacterService.resolveCastForStory(
          channelId,
          rawSource,
          project.title,
          undefined,
          project.researchDossier,
          project.project_id
        );
        modified = true;
      } else {
        // Sincronizar con la versión más reciente de cada personaje en la biblioteca del canal
        project.characters = project.characters.map(
          (c) => CharacterService.getCharacter(channelId, c.character_id) || c
        );
      }

      const needsSceneAssignment = project.scenes?.some((s) => s.character_ids === undefined);
      if (needsSceneAssignment && project.characters && project.characters.length > 0) {
        project.scenes = CharacterService.assignCharactersToScenes(
          project.scenes,
          project.characters
        );
        modified = true;
      }

      // Sincronizar y preservar videos bilingües renderizados (final_video_es.mp4 y final_video_en.mp4)
      const projectDir = path.join(STORAGE_DIR, projectId);
      const esVideoPath = path.join(projectDir, 'final_video_es.mp4');
      const enVideoPath = path.join(projectDir, 'final_video_en.mp4');
      const defaultVideoPath = path.join(projectDir, 'final_video.mp4');

      if (!project.outputVideoUrlEs && fs.existsSync(esVideoPath)) {
        project.outputVideoUrlEs = `/storage/${projectId}/final_video_es.mp4`;
        modified = true;
      }
      if (!project.outputVideoUrlEn && fs.existsSync(enVideoPath)) {
        project.outputVideoUrlEn = `/storage/${projectId}/final_video_en.mp4`;
        modified = true;
      }

      // Migrar video único histórico si no existían los específicos
      if (fs.existsSync(defaultVideoPath) && !fs.existsSync(esVideoPath) && !fs.existsSync(enVideoPath)) {
        if (project.language === 'es') {
          try {
            fs.copyFileSync(defaultVideoPath, esVideoPath);
            project.outputVideoUrlEs = `/storage/${projectId}/final_video_es.mp4`;
            modified = true;
          } catch {}
        } else {
          try {
            fs.copyFileSync(defaultVideoPath, enVideoPath);
            project.outputVideoUrlEn = `/storage/${projectId}/final_video_en.mp4`;
            modified = true;
          } catch {}
        }
      }

      // Asegurar que outputVideoUrl apunte al video del idioma activo si está disponible
      if (project.language === 'es' && project.outputVideoUrlEs && project.outputVideoUrl !== project.outputVideoUrlEs) {
        project.outputVideoUrl = project.outputVideoUrlEs;
        modified = true;
      } else if (project.language === 'en' && project.outputVideoUrlEn && project.outputVideoUrl !== project.outputVideoUrlEn) {
        project.outputVideoUrl = project.outputVideoUrlEn;
        modified = true;
      }

      // Reconciliar audios existentes en disco si la escena no tiene audioUrl
      const audioDir = path.join(projectDir, 'audio');
      if (fs.existsSync(audioDir) && Array.isArray(project.scenes)) {
        for (const s of project.scenes) {
          const directAudioPath = path.join(audioDir, `scene_${s.scene_id}.mp3`);
          if (!s.audioUrl && fs.existsSync(directAudioPath)) {
            s.audioUrl = `/storage/${projectId}/audio/scene_${s.scene_id}.mp3`;
            modified = true;
          }
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
      }

      return project;
    } catch (err) {
      console.error(`Error loading project ${projectId}:`, err);
      return null;
    }
  }

  static listProjects(channelId?: string): ProjectScript[] {
    if (!fs.existsSync(STORAGE_DIR)) {
      return [];
    }
    const dirs = fs.readdirSync(STORAGE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const projects: ProjectScript[] = [];
    for (const dir of dirs) {
      const p = this.getProject(dir);
      if (p) {
        if (!channelId || p.channel_id === channelId) {
          projects.push(p);
        }
      }
    }
    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Crea un nuevo proyecto reutilizando la voz (archivos MP3 + wordTimings + duraciones)
   * de un proyecto existente, limpiando las imágenes y el render para crear otro video.
   */
  static forkProjectWithVoice(
    sourceProjectId: string,
    customTitle?: string,
    targetChannelId?: string
  ): ProjectScript | null {
    const source = this.getProject(sourceProjectId);
    if (!source) return null;

    const newProjectId = `proj_${Date.now()}`;
    const newProjectDir = path.join(STORAGE_DIR, newProjectId);
    const newAudioDir = path.join(newProjectDir, 'audio');
    fs.mkdirSync(newAudioDir, { recursive: true });

    const sourceAudioDir = path.join(STORAGE_DIR, sourceProjectId, 'audio');
    if (fs.existsSync(sourceAudioDir)) {
      const audioFiles = fs.readdirSync(sourceAudioDir);
      for (const file of audioFiles) {
        const srcFile = path.join(sourceAudioDir, file);
        const destFile = path.join(newAudioDir, file);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }

    const forkedScenes = source.scenes.map((scene) => {
      const expectedFile = `scene_${scene.scene_id}.mp3`;
      const hasCopiedAudio = fs.existsSync(path.join(newAudioDir, expectedFile));
      return {
        ...scene,
        imageUrl: undefined,
        audioUrl: hasCopiedAudio
          ? `/storage/${newProjectId}/audio/${expectedFile}`
          : scene.audioUrl
          ? scene.audioUrl.replace(sourceProjectId, newProjectId)
          : undefined,
      };
    });

    const nowIso = new Date().toISOString();
    const forkedProject: ProjectScript = {
      ...source,
      project_id: newProjectId,
      channel_id: targetChannelId || source.channel_id,
      title: customTitle || `${source.title} (Nuevo Video • Misma Voz)`,
      scenes: forkedScenes,
      status: 'audio_ready',
      lastActiveStep: 3,
      createdAt: nowIso,
      updatedAt: nowIso,
      parent_project_id: sourceProjectId,
      fork_type: 'voice_only',
      outputVideoUrl: undefined,
      outputVideoUrlEs: undefined,
      outputVideoUrlEn: undefined,
      lastRenderedAt: undefined,
      lastRenderedAtEs: undefined,
      lastRenderedAtEn: undefined,
      thumbnailUrl: undefined,
    };

    this.saveProject(forkedProject);
    return forkedProject;
  }

  /**
   * Duplica solo el guion y el dossier de investigación para trabajar una nueva versión desde cero.
   */
  static forkProjectScriptOnly(
    sourceProjectId: string,
    customTitle?: string,
    targetChannelId?: string
  ): ProjectScript | null {
    const source = this.getProject(sourceProjectId);
    if (!source) return null;

    const newProjectId = `proj_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const forkedScenes = source.scenes.map((scene) => ({
      ...scene,
      imageUrl: undefined,
      audioUrl: undefined,
      wordTimings: undefined,
    }));

    const forkedProject: ProjectScript = {
      ...source,
      project_id: newProjectId,
      channel_id: targetChannelId || source.channel_id,
      title: customTitle || `${source.title} (Copia de Guion)`,
      scenes: forkedScenes,
      status: 'characters_ready',
      lastActiveStep: 2,
      createdAt: nowIso,
      updatedAt: nowIso,
      parent_project_id: sourceProjectId,
      fork_type: 'script_only',
      outputVideoUrl: undefined,
      outputVideoUrlEs: undefined,
      outputVideoUrlEn: undefined,
      lastRenderedAt: undefined,
      lastRenderedAtEs: undefined,
      lastRenderedAtEn: undefined,
      thumbnailUrl: undefined,
    };

    this.saveProject(forkedProject);
    return forkedProject;
  }

  static deleteProject(projectId: string): boolean {
    const projectDir = path.join(STORAGE_DIR, projectId);
    if (!fs.existsSync(projectDir)) return false;
    fs.rmSync(projectDir, { recursive: true, force: true });
    return true;
  }
}
