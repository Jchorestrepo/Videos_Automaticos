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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets from storage/projects
app.use('/storage', express.static(path.resolve(__dirname, '../storage/projects')));
// 0. Estado de Configuración (Multi-Proveedor: OpenAI, OpenRouter, DeepSeek, Gemini)
app.get('/api/config/status', (req, res) => {
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

  res.json({
    activeImageEngine,
    hasImageKey: Boolean(openaiKey || openrouterKey || (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui')),
    hasElevenLabs: Boolean(elevenlabsKey),
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
    CharacterService.saveCharacter(req.params.channelId, req.body);
    res.json({ success: true, character: req.body });
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

// 3. Proyectos
app.get('/api/projects', (req, res) => {
  const projects = ProjectService.listProjects();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = ProjectService.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(project);
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

// 6. Generación de Imágenes (Multi-Proveedor con Arco Emocional y Personaje Ancla)
app.post('/api/images/generate', async (req, res) => {
  try {
    const { projectId, sceneId, characterId, customArtStyle } = req.body;
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

    if (sceneId !== undefined) {
      // Regenerar escena individual
      const scene = project.scenes.find((s) => s.scene_id === sceneId);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada' });

      const imageUrl = await ImageService.generateSceneImage(
        projectId,
        scene.scene_id,
        scene.visual_prompt,
        scene.chapter,
        channelId,
        character,
        totalScenes,
        artStyle
      );
      scene.imageUrl = imageUrl;
    } else {
      // Generar todas las escenas en orden respetando el arco de iluminación
      for (const scene of project.scenes) {
        const imageUrl = await ImageService.generateSceneImage(
          projectId,
          scene.scene_id,
          scene.visual_prompt,
          scene.chapter,
          channelId,
          character,
          totalScenes,
          artStyle
        );
        scene.imageUrl = imageUrl;
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

// 7. Generación de Audio y Locución (ElevenLabs con Timestamps por Palabra)
app.post('/api/audio/generate', async (req, res) => {
  try {
    const { projectId, sceneId } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const persona = PersonaService.getPersona(project.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';

    if (sceneId !== undefined) {
      // Regenerar audio para una escena específica
      const scene = project.scenes.find((s) => s.scene_id === sceneId);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada' });

      const result = await AudioService.generateSceneAudio(
        projectId,
        scene.scene_id,
        scene.voiceover,
        channelId
      );

      scene.audioUrl = result.audioUrl;
      scene.durationInSeconds = result.durationInSeconds;
      scene.wordTimings = result.wordTimings;
    } else {
      // Generar audio para todas las escenas
      for (const scene of project.scenes) {
        const result = await AudioService.generateSceneAudio(
          projectId,
          scene.scene_id,
          scene.voiceover,
          channelId
        );

        scene.audioUrl = result.audioUrl;
        scene.durationInSeconds = result.durationInSeconds;
        scene.wordTimings = result.wordTimings;
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
