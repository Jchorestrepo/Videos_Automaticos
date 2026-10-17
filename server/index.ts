import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { PersonaService } from './services/personaService.ts';
import { SheetsService } from './services/sheetsService.ts';
import { ScriptService } from './services/scriptService.ts';
import { ImageService } from './services/imageService.ts';
import { ProjectService } from './services/projectService.ts';
import { CharacterService } from './services/characterService.ts';
import { VisualArcService } from './services/visualArcService.ts';
import { AudioService } from './services/audioService.ts';
import { VoiceStudioService } from './services/voiceStudioService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static assets from storage/projects and channels
app.use('/storage', express.static(path.resolve(__dirname, '../storage/projects')));
app.use('/channel-assets', express.static(path.resolve(__dirname, '../channels')));

// 0. Estado de Configuración (Multi-Proveedor: OpenAI, OpenRouter, DeepSeek, Gemini, VoiceStudio)
app.get('/api/config/status', async (req, res) => {
  dotenv.config({ override: true });
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const elevenlabsKey = (process.env.ELEVENLABS_API_KEY || '').trim();

  let activeImageEngine = 'Flux 16:9 (Fallback Automático)';
  if (openrouterKey) {
    activeImageEngine = 'OpenRouter (Gemini 3.1 Flash 16:9)';
  } else if (openaiKey && openaiKey.startsWith('sk-')) {
    activeImageEngine = 'OpenAI DALL-E 3 (16:9)';
  } else if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
    activeImageEngine = 'Google Gemini Image';
  }

  const isVoiceStudioAvailable = await AudioService.isVoiceStudioAvailable();
  const voiceStudioVoices = isVoiceStudioAvailable ? await AudioService.getVoiceStudioVoices() : [];

  let activeVoiceEngine = 'Microsoft Edge Neural (Gratuito)';
  if (isVoiceStudioAvailable) {
    activeVoiceEngine = 'VoiceStudio Local: Gomorra (RTX 3080)';
  } else if (elevenlabsKey) {
    activeVoiceEngine = 'ElevenLabs Multilingual v2';
  } else if (openaiKey && openaiKey.startsWith('sk-')) {
    activeVoiceEngine = 'OpenAI TTS-1';
  }

  res.json({
    activeImageEngine,
    activeVoiceEngine,
    hasImageKey: Boolean(openaiKey || openrouterKey || (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui')),
    hasElevenLabs: Boolean(elevenlabsKey),
    hasVoiceStudio: isVoiceStudioAvailable,
    voiceStudioVoices,
    openai: Boolean(openaiKey),
    openrouter: Boolean(openrouterKey),
    deepseek: Boolean(deepseekKey),
    gemini: Boolean(geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui'),
  });
});

// 1. Canales y Personalidades
app.get('/api/channels', (req, res) => {
  try {
    const channels = PersonaService.getChannels();
    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/channels/:id', (req, res) => {
  const persona = PersonaService.getPersona(req.params.id);
  if (!persona) return res.status(404).json({ error: 'Canal no encontrado' });
  res.json(persona);
});

app.post('/api/channels', (req, res) => {
  try {
    PersonaService.savePersona(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1.1 Biblioteca de Personajes y Arquetipos
app.get('/api/characters/:channelId', (req, res) => {
  try {
    const characters = CharacterService.getCharacters(req.params.channelId);
    res.json(characters);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/characters/:channelId/:characterId', (req, res) => {
  try {
    const character = CharacterService.getCharacter(req.params.channelId, req.params.characterId);
    if (!character) return res.status(404).json({ error: 'Personaje no encontrado' });
    res.json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/characters/:channelId', (req, res) => {
  try {
    const saved = CharacterService.saveCharacter(req.params.channelId, req.body);
    res.json({ success: true, character: saved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/characters/:channelId/draft', (req, res) => {
  try {
    const { name, title, conflict } = req.body;
    const profile = CharacterService.findOrDraftCharacter(
      req.params.channelId,
      name,
      title || 'Historia Documental',
      conflict
    );
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generar Retrato Oficial 3D de un Personaje con IA (antes de las escenas)
app.post('/api/characters/:channelId/:characterId/generate-portrait', async (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    let character = CharacterService.getCharacter(channelId, characterId);
    if (req.body && req.body.name) {
      character = CharacterService.saveCharacter(channelId, {
        ...(character || {}),
        ...req.body,
        character_id: characterId,
        channel_id: channelId,
      });
    }
    if (!character) {
      return res.status(404).json({ error: 'Personaje no encontrado en la biblioteca' });
    }
    const updated = await ImageService.generateCharacterPortrait(channelId, character);
    res.json(updated);
  } catch (error: any) {
    console.error('Error generating character portrait:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subir Versión Propia Mejorada de un Personaje (PNG/JPG/WebP en base64)
app.post('/api/characters/:channelId/:characterId/upload-image', (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const { imageBase64, characterData } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No se recibió imagen en base64' });
    }
    if (characterData && characterData.name) {
      CharacterService.saveCharacter(channelId, {
        ...characterData,
        character_id: characterId,
        channel_id: channelId,
      });
    }
    const updated = CharacterService.saveUploadedCharacterImage(channelId, characterId, imageBase64);
    if (!updated) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Error uploading character image:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/characters/:channelId/:characterId', (req, res) => {
  try {
    const deleted = CharacterService.deleteCharacter(req.params.channelId, req.params.characterId);
    res.json({ success: deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1.2 Reglas de Arco Emocional y Fotometría Cinematográfica
app.get('/api/visual-arc/rules', (req, res) => {
  try {
    res.json(VisualArcService.getAllActRules());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Google Sheets
app.get('/api/sheets/items', async (req, res) => {
  try {
    const url = (req.query.url as string) || undefined;
    const items = await SheetsService.fetchSheetItems(url);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Proyectos y Reutilización Modular (Fork de Voz / Fork de Guion)
app.get('/api/projects', (req, res) => {
  const projects = ProjectService.listProjects();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = ProjectService.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(project);
});

// Crear un nuevo proyecto reutilizando SOLO LA VOZ (audios + wordTimings) para generar otro video
app.post('/api/projects/:id/fork-voice', (req, res) => {
  try {
    const { title } = req.body || {};
    const forked = ProjectService.forkProjectWithVoice(req.params.id, title);
    if (!forked) return res.status(404).json({ error: 'Proyecto origen no encontrado' });
    res.json(forked);
  } catch (error: any) {
    console.error('Error forking project voice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Duplicar solo el guion de un proyecto para trabajar otra versión
app.post('/api/projects/:id/fork-script', (req, res) => {
  try {
    const { title } = req.body || {};
    const forked = ProjectService.forkProjectScriptOnly(req.params.id, title);
    if (!forked) return res.status(404).json({ error: 'Proyecto origen no encontrado' });
    res.json(forked);
  } catch (error: any) {
    console.error('Error forking project script:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const ok = ProjectService.deleteProject(req.params.id);
    res.json({ success: ok });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Subir imagen personalizada para una escena individual del proyecto (archivando en biblioteca)
app.post('/api/projects/:id/scenes/:sceneId/upload-image', (req, res) => {
  try {
    const project = ProjectService.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const sceneIdNum = Number(req.params.sceneId);
    const scene = project.scenes.find((s) => s.scene_id === sceneIdNum);
    if (!scene) return res.status(404).json({ error: 'Escena no encontrada' });

    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Falta imageBase64' });

    const imageUrl = ImageService.saveCustomSceneImage(project.project_id, sceneIdNum, imageBase64);
    scene.imageUrl = imageUrl;
    scene.imageReused = false;

    const persona = PersonaService.getPersona(project.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';
    const character = project.characters?.[0];
    if (character) {
      const updatedChar = CharacterService.addImageToCharacterGallery(
        channelId,
        character.character_id,
        imageUrl,
        {
          prompt: scene.visual_prompt,
          description: scene.chapter,
          placeOrEnvironment: CharacterService.detectPlace(scene.visual_prompt),
          companyOrSubject: project.characterCompany,
          shotType: scene.shot_type,
          tags: CharacterService.extractTags(scene.visual_prompt, character.name, project.characterCompany),
        }
      );
      if (updatedChar) {
        project.characters = [updatedChar];
      }
    }

    ProjectService.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error('Error uploading custom scene image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reutilizar una imagen existente de la biblioteca en una escena específica (0 costo, 0 espera)
app.post('/api/projects/:id/scenes/:sceneId/set-library-image', (req, res) => {
  try {
    const project = ProjectService.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const sceneIdNum = Number(req.params.sceneId);
    const scene = project.scenes.find((s) => s.scene_id === sceneIdNum);
    if (!scene) return res.status(404).json({ error: 'Escena no encontrada' });

    const { imageUrl, prompt } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Falta imageUrl' });

    scene.imageUrl = imageUrl;
    scene.imageReused = true;
    if (prompt) scene.reusedAssetPrompt = prompt;

    ProjectService.saveProject(project);
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Error setting library image on scene:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Generación de Guion con Personajes Auto-vinculados
app.post('/api/script/generate', async (req, res) => {
  try {
    const { topic, channelId, conflict, characters, sources } = req.body;
    const persona = PersonaService.getPersona(channelId);
    if (!persona) {
      return res.status(400).json({ error: `Persona no encontrada para el canal ${channelId}` });
    }

    const script = await ScriptService.generateScript(topic, persona, conflict, characters, sources);

    // Auto-vincular o redactar personaje ancla en la biblioteca del canal
    const characterProfile = CharacterService.findOrDraftCharacter(
      channelId,
      characters || '',
      topic,
      conflict
    );
    script.characters = [characterProfile];
    script.artStyle = '3d_animation';
    script.status = 'characters_ready';

    ProjectService.saveProject(script);
    res.json(script);
  } catch (error: any) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Actualizar Guion
app.post('/api/script/update', (req, res) => {
  try {
    const { project } = req.body;
    ProjectService.saveProject(project);
    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5.1 Traducir y Adaptar Guion Aprobado (Español -> Inglés Nativo Documental para ElevenLabs)
app.post('/api/script/translate-en', async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const translatedProject = await ScriptService.translateProjectToEnglish(project);
    ProjectService.saveProject(translatedProject);
    res.json(translatedProject);
  } catch (error: any) {
    console.error('Error translating script to English:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5.2 Ajuste Quirúrgico y Dirección de Escenas con IA (Director Asistente en Tiempo Real)
app.post('/api/script/ai-adjust', async (req, res) => {
  try {
    const { projectId, sceneId, instruction, autoRegenerateImage, autoRegenerateAudio } = req.body;
    if (!projectId || !instruction) {
      return res.status(400).json({ error: 'Faltan parámetros: projectId e instruction son requeridos' });
    }

    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const result = await ScriptService.adjustWithAI(project, instruction, sceneId);
    let updatedProject = result.project;

    const persona = PersonaService.getPersona(updatedProject.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';
    const character = updatedProject.characters?.[0];
    const artStyle = updatedProject.artStyle || '3d_animation';

    // Si el usuario pidió regenerar imagen automáticamente para las escenas modificadas
    if (autoRegenerateImage && result.changedSceneIds.length > 0) {
      for (const sId of result.changedSceneIds) {
        const sc = updatedProject.scenes.find((s) => s.scene_id === sId);
        if (sc) {
          try {
            const imgUrl = await ImageService.generateSceneImage(
              updatedProject.project_id,
              sc.scene_id,
              sc.visual_prompt,
              sc.chapter,
              channelId,
              character,
              updatedProject.scenes.length,
              artStyle,
              sc.shot_type
            );
            if (imgUrl) {
              sc.imageUrl = imgUrl;
              sc.imageReused = false;
            }
          } catch (imgErr: any) {
            console.warn(`[AI Adjust] Error regenerando imagen para escena ${sId}:`, imgErr.message);
          }
        }
      }
    }

    // Si el usuario pidió regenerar audio automáticamente para las escenas modificadas
    if (autoRegenerateAudio && result.changedSceneIds.length > 0) {
      const isVoiceStudioAvailable = await AudioService.isVoiceStudioAvailable();
      const effectiveProvider: 'voicestudio' | 'elevenlabs' | 'openai' =
        updatedProject.voiceEngine ||
        (isVoiceStudioAvailable ? 'voicestudio' : (updatedProject.language === 'en' ? 'elevenlabs' : 'openai'));

      for (const sId of result.changedSceneIds) {
        const sc = updatedProject.scenes.find((s) => s.scene_id === sId);
        if (sc) {
          try {
            const sceneVoice =
              sc.voiceRole === 'secondary' && updatedProject.voiceMode === 'dual'
                ? updatedProject.secondaryVoice || 'demo0001'
                : updatedProject.primaryVoice || 'gomorra';

            const audioRes = await AudioService.generateSceneAudio(
              updatedProject.project_id,
              sc.scene_id,
              sc.voiceover,
              channelId,
              effectiveProvider,
              sceneVoice
            );
            sc.audioUrl = audioRes.audioUrl;
            sc.durationInSeconds = audioRes.durationInSeconds;
            sc.wordTimings = audioRes.wordTimings;
          } catch (audErr: any) {
            console.warn(`[AI Adjust] Error regenerando audio para escena ${sId}:`, audErr.message);
          }
        }
      }
    }

    ProjectService.saveProject(updatedProject);
    res.json({
      success: true,
      project: updatedProject,
      summary: result.summary,
      changedSceneIds: result.changedSceneIds,
    });
  } catch (error: any) {
    console.error('Error in /api/script/ai-adjust:', error);
    res.status(500).json({ error: error.message });
  }
});


// 6. Generación de Imágenes (Multi-Proveedor con Arco Emocional, Biblioteca y Reutilización Inteligente)
app.post('/api/images/generate', async (req, res) => {
  try {
    const { projectId, sceneId, characterId, customArtStyle, smartReuse, forceAi } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const persona = PersonaService.getPersona(project.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';

    // Determinar personaje ancla activo
    let character = project.characters?.[0];
    if (characterId) {
      const foundChar = CharacterService.getCharacter(channelId, characterId);
      if (foundChar) {
        character = foundChar;
        project.characters = [character];
      }
    }
    if (!character) {
      character = CharacterService.findOrDraftCharacter(
        channelId,
        project.characterCompany || '',
        project.title
      );
      project.characters = [character];
    }

    const totalScenes = project.scenes.length;
    const artStyle = customArtStyle || project.artStyle || '3d_animation';
    const isSmartReuseEnabled = smartReuse !== false;
    project.smartReuseImages = isSmartReuseEnabled;

    if (sceneId !== undefined) {
      // Escena individual
      const scene = project.scenes.find((s) => s.scene_id === sceneId);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada' });

      let reused = false;
      // Si la reutilización inteligente está activa y no se forzó IA explícita
      if (isSmartReuseEnabled && !forceAi) {
        const matchingAsset = CharacterService.findMatchingAsset(
          channelId,
          character?.character_id,
          scene,
          project.characterCompany
        );
        if (matchingAsset) {
          scene.imageUrl = matchingAsset.url;
          scene.imageReused = true;
          scene.reusedAssetPrompt = matchingAsset.prompt;
          reused = true;
          console.log(`[Image Generation] Escena ${scene.scene_id}: Reutilizada de biblioteca (0 costo).`);
        }
      }

      if (!reused) {
        // Generar con IA
        const imageUrl = await ImageService.generateSceneImage(
          projectId,
          scene.scene_id,
          scene.visual_prompt,
          scene.chapter,
          channelId,
          character,
          totalScenes,
          artStyle,
          scene.shot_type
        );
        scene.imageUrl = imageUrl;
        scene.imageReused = false;

        // Guardar automáticamente en la biblioteca permanente con todos sus metadatos
        if (character && imageUrl) {
          const updatedChar = CharacterService.addImageToCharacterGallery(
            channelId,
            character.character_id,
            imageUrl,
            {
              prompt: scene.visual_prompt,
              description: scene.chapter,
              placeOrEnvironment: CharacterService.detectPlace(scene.visual_prompt),
              companyOrSubject: project.characterCompany,
              shotType: scene.shot_type,
              tags: CharacterService.extractTags(scene.visual_prompt, character.name, project.characterCompany),
            }
          );
          if (updatedChar) {
            character = updatedChar;
            project.characters = [character];
          }
        }
      }
    } else {
      // Generar todas las escenas con búsqueda previa en biblioteca para máximo ahorro
      for (const scene of project.scenes) {
        let reused = false;
        if (isSmartReuseEnabled) {
          const matchingAsset = CharacterService.findMatchingAsset(
            channelId,
            character?.character_id,
            scene,
            project.characterCompany
          );
          if (matchingAsset) {
            scene.imageUrl = matchingAsset.url;
            scene.imageReused = true;
            scene.reusedAssetPrompt = matchingAsset.prompt;
            reused = true;
            console.log(`[Smart Batch] Escena ${scene.scene_id}: Reutilizada de biblioteca (${matchingAsset.placeOrEnvironment || matchingAsset.description || matchingAsset.id})`);
          }
        }

        if (!reused) {
          const imageUrl = await ImageService.generateSceneImage(
            projectId,
            scene.scene_id,
            scene.visual_prompt,
            scene.chapter,
            channelId,
            character,
            totalScenes,
            artStyle,
            scene.shot_type
          );
          scene.imageUrl = imageUrl;
          scene.imageReused = false;

          // Guardar automáticamente en la biblioteca permanente con sus metadatos
          if (character && imageUrl) {
            const updatedChar = CharacterService.addImageToCharacterGallery(
              channelId,
              character.character_id,
              imageUrl,
              {
                prompt: scene.visual_prompt,
                description: scene.chapter,
                placeOrEnvironment: CharacterService.detectPlace(scene.visual_prompt),
                companyOrSubject: project.characterCompany,
                shotType: scene.shot_type,
                tags: CharacterService.extractTags(scene.visual_prompt, character.name, project.characterCompany),
              }
            );
            if (updatedChar) {
              character = updatedChar;
            }
          }
        }
      }
      if (character) {
        project.characters = [character];
      }
      project.status = 'images_ready';
    }

    ProjectService.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error('Error generating images:', error);
    res.status(500).json({ error: error.message });
  }
});

// Establecer una imagen de la biblioteca como retrato canónico/oficial del personaje
app.post('/api/characters/:channelId/:characterId/set-canonical', (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const { imageUrl } = req.body;
    const character = CharacterService.getCharacter(channelId, characterId);
    if (!character) return res.status(404).json({ error: 'Personaje no encontrado' });

    character.canonical_image_url = imageUrl;
    character.updatedAt = new Date().toISOString();
    const saved = CharacterService.saveCharacter(channelId, character);
    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Configuración de Voces (Modo 1 Voz o 2 Voces Intercambiables)
app.post('/api/project/voice-config', (req, res) => {
  try {
    const { projectId, voiceMode, primaryVoice, secondaryVoice, scenes } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    if (voiceMode) project.voiceMode = voiceMode;
    if (primaryVoice) project.primaryVoice = primaryVoice;
    if (secondaryVoice !== undefined) project.secondaryVoice = secondaryVoice;

    if (Array.isArray(scenes)) {
      for (const s of scenes) {
        const target = project.scenes.find((sc) => sc.scene_id === s.scene_id);
        if (target) {
          if (s.voiceRole) target.voiceRole = s.voiceRole;
          if (s.voiceProfile) target.voiceProfile = s.voiceProfile;
        }
      }
    }

    ProjectService.saveProject(project);
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Error saving voice config:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.0 Control y Ciclo de Vida de VoiceStudio Local (RTX 3080)
app.get('/api/audio/voicestudio/status', async (req, res) => {
  try {
    const status = await VoiceStudioService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audio/voicestudio/start', async (req, res) => {
  try {
    const status = await VoiceStudioService.start();
    res.json({ success: true, status });
  } catch (error: any) {
    console.error('Error starting VoiceStudio:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audio/voicestudio/stop', async (req, res) => {
  try {
    const result = await VoiceStudioService.stop();
    res.json(result);
  } catch (error: any) {
    console.error('Error stopping VoiceStudio:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.1 Generación de Audio y Locución Multi-Motor (VoiceStudio Gomorra Local RTX 3080 / ElevenLabs Cloud / OpenAI)
app.post('/api/audio/generate', async (req, res) => {
  try {
    const { projectId, sceneId, provider, voice, voiceMode, primaryVoice, secondaryVoice } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    if (voiceMode) project.voiceMode = voiceMode;
    if (primaryVoice) project.primaryVoice = primaryVoice;
    if (secondaryVoice !== undefined) project.secondaryVoice = secondaryVoice;

    const persona = PersonaService.getPersona(project.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';

    const isVoiceStudioAvailable = await AudioService.isVoiceStudioAvailable();

    // Prioridad: provider explícito -> VoiceStudio si está activo -> ElevenLabs si es inglés -> OpenAI/Edge
    const effectiveProvider: 'voicestudio' | 'elevenlabs' | 'openai' =
      provider ||
      project.voiceEngine ||
      (isVoiceStudioAvailable ? 'voicestudio' : (project.language === 'en' ? 'elevenlabs' : 'openai'));
    project.voiceEngine = effectiveProvider;

    // Helper para determinar la voz de una escena según el modo (1 sola voz vs 2 voces)
    const resolveSceneVoice = (scene: any) => {
      // Si se pasa una voz explícita en la llamada individual, tiene prioridad
      if (voice) return voice;

      // Si el proyecto está en modo 2 voces:
      if (project.voiceMode === 'dual') {
        const isSecondary = scene.voiceRole === 'secondary';
        if (isSecondary) {
          return project.secondaryVoice || 'demo0001';
        }
        return project.primaryVoice || 'gomorra';
      }

      // Modo 1 sola voz:
      return project.primaryVoice || 'gomorra';
    };

    if (sceneId !== undefined) {
      // Regenerar audio para una escena específica
      const scene = project.scenes.find((s) => s.scene_id === sceneId);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada' });

      const sceneVoice = resolveSceneVoice(scene);
      const result = await AudioService.generateSceneAudio(
        projectId,
        scene.scene_id,
        scene.voiceover,
        channelId,
        effectiveProvider,
        sceneVoice
      );

      scene.audioUrl = result.audioUrl;
      scene.durationInSeconds = result.durationInSeconds;
      scene.wordTimings = result.wordTimings;
      scene.voiceProfile = sceneVoice;
    } else {
      // Generar audio para todas las escenas
      for (const scene of project.scenes) {
        const sceneVoice = resolveSceneVoice(scene);
        const result = await AudioService.generateSceneAudio(
          projectId,
          scene.scene_id,
          scene.voiceover,
          channelId,
          effectiveProvider,
          sceneVoice
        );

        scene.audioUrl = result.audioUrl;
        scene.durationInSeconds = result.durationInSeconds;
        scene.wordTimings = result.wordTimings;
        scene.voiceProfile = sceneVoice;
      }
      project.status = 'audio_ready';
    }

    ProjectService.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Renderizado de Video en MP4 con Remotion CLI (1080p, Audio y Subtítulos)
app.post('/api/render', async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const projectDir = path.resolve(__dirname, `../storage/projects/${projectId}`);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // 1. Escribir props dinámicas para Remotion CLI
    const propsPath = path.join(projectDir, 'remotion_props.json');
    const remotionProps = {
      channelId: project.channel_id,
      title: project.title,
      scenes: project.scenes,
    };
    fs.writeFileSync(propsPath, JSON.stringify(remotionProps, null, 2), 'utf-8');

    // 2. Ruta de exportación MP4
    const outputPath = path.join(projectDir, 'final_video.mp4');

    console.log(`[Render] Iniciando renderizado Remotion CLI para proyecto ${projectId}...`);
    const rootDir = path.resolve(__dirname, '..');
    const renderCmd = `npx remotion render src/remotion/index.ts DocumentaryVideo "${outputPath}" --props="${propsPath}" --overwrite --concurrency=4`;

    const execPromise = promisify(exec);
    const { stdout, stderr } = await execPromise(renderCmd, {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 10,
    });

    console.log(`[Render] Renderizado completado con éxito:`, stdout.slice(-200));

    // Copiar también a out/DocumentaryVideo.mp4 para conveniencia
    try {
      const outDir = path.resolve(rootDir, 'out');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(outputPath, path.join(outDir, 'DocumentaryVideo.mp4'));
    } catch (copyErr) {
      console.warn('[Render] No se pudo copiar a out/DocumentaryVideo.mp4:', copyErr);
    }

    // 3. Actualizar estado y ruta en el proyecto
    project.outputVideoUrl = `/storage/${projectId}/final_video.mp4`;
    project.status = 'rendered';
    ProjectService.saveProject(project);

    res.json({
      success: true,
      project,
      outputVideoUrl: project.outputVideoUrl,
    });
  } catch (error: any) {
    console.error('Error renderizando video:', error);
    res.status(500).json({ error: error.message || 'Error en el renderizado' });
  }
});

app.listen(PORT, () => {
  console.log(`[API Server] Corriendo en http://localhost:${PORT}`);
});
