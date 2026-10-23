import express from 'express';
import cors from 'cors';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { PersonaService } from './services/personaService.ts';
import { SheetsService } from './services/sheetsService.ts';
import { ScriptService } from './services/scriptService.ts';
import { ImageService, CHARACTER_STYLE_PRESETS } from './services/imageService.ts';
import { ProjectService } from './services/projectService.ts';
import { CharacterService } from './services/characterService.ts';
import { ReferencePhotoService } from './services/referencePhotoService.ts';
import { VisualArcService } from './services/visualArcService.ts';
import { AudioService } from './services/audioService.ts';
import { VoiceStudioService } from './services/voiceStudioService.ts';
import { VoiceCatalogService } from './services/voiceCatalogService.ts';
import { JobProgressService } from './services/jobProgressService.ts';
import { StoryBacklogService } from './services/storyBacklogService.ts';
import { YouTubeService } from './services/youtubeService.ts';
import { ChannelStrategyService } from './services/channelStrategyService.ts';
import { SubtitleService } from './services/subtitleService.ts';
import { TranslationService } from './services/translationService.ts';
import { ParallelProductionService } from './services/parallelProductionService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static assets from storage/projects and channels (con cabeceras no-cache para refresco instantáneo)
app.use(
  '/storage',
  express.static(path.resolve(__dirname, '../storage/projects'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  })
);
app.use(
  '/channel-assets',
  express.static(path.resolve(__dirname, '../channels'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  })
);

// 0.0 Progreso en Tiempo Real (SSE) y Control de Tareas en Curso
app.get('/api/jobs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  JobProgressService.addSseClient(res);

  req.on('close', () => {
    JobProgressService.removeSseClient(res);
  });
});

app.get('/api/jobs/active', (req, res) => {
  res.json(JobProgressService.getActiveJobs());
});

app.post('/api/jobs/:jobId/cancel', (req, res) => {
  const ok = JobProgressService.cancelJob(req.params.jobId);
  res.json({ success: ok });
});

// 0. Estado de Configuración (Multi-Proveedor: Google Vertex AI, Agnes AI, OpenAI, OpenRouter, DeepSeek, Gemini, VoiceStudio)
app.get('/api/config/status', async (req, res) => {
  dotenv.config({ override: true });
  let gcpProject = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || '').trim();
  const gcpLocation = (process.env.GOOGLE_CLOUD_LOCATION || 'us-central1').trim();
  let credPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

  if (!credPath) {
    const defaultCred = path.resolve(__dirname, '../gcp-credentials.json');
    if (fs.existsSync(defaultCred)) {
      credPath = 'gcp-credentials.json';
    }
  }

  let hasValidCredFile = false;
  if (credPath) {
    const credFullPath = path.isAbsolute(credPath) ? credPath : path.resolve(__dirname, '../', credPath);
    if (fs.existsSync(credFullPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(credFullPath, 'utf-8'));
        hasValidCredFile = true;
        if (!gcpProject && parsed.project_id) {
          gcpProject = parsed.project_id;
        }
      } catch (e) {}
    }
  }

  const useVertex =
    process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ||
    Boolean(gcpProject) ||
    hasValidCredFile;

  const agnesKey = (process.env.AGNES_API_KEY || '').trim();
  const agnesModel = (process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.1-flash').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const elevenlabsKey = (process.env.ELEVENLABS_API_KEY || '').trim();

  let activeImageEngine = 'Flux 16:9 (Fallback Automático)';
  if (useVertex && (gcpProject || hasValidCredFile || geminiKey)) {
    activeImageEngine = `Google Vertex AI (${gcpProject || 'GCP'} $300 Crédito)`;
  } else if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
    activeImageEngine = 'Google Gemini Direct';
  } else if (openrouterKey) {
    activeImageEngine = 'OpenRouter (Gemini 3.1 Flash 16:9)';
  } else if (agnesKey) {
    activeImageEngine = `Agnes AI (${agnesModel} 16:9 Gratis)`;
  } else if (openaiKey && openaiKey.startsWith('sk-')) {
    activeImageEngine = 'OpenAI DALL-E 3 (16:9)';
  }

  const isVoiceStudioAvailable = await AudioService.isVoiceStudioAvailable();
  const voiceStudioVoices = await AudioService.getVoiceStudioVoices();

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
    hasImageKey: Boolean(
      (useVertex && (gcpProject || credPath || geminiKey)) ||
      agnesKey ||
      openaiKey ||
      openrouterKey ||
      (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui')
    ),
    hasVertex: Boolean(useVertex && (gcpProject || credPath || geminiKey)),
    gcpProject,
    gcpLocation,
    hasCredPath: Boolean(credPath),
    hasAgnes: Boolean(agnesKey),
    agnesModel,
    hasElevenLabs: Boolean(elevenlabsKey),
    hasVoiceStudio: isVoiceStudioAvailable,
    voiceStudioVoices,
    openai: Boolean(openaiKey),
    openrouter: Boolean(openrouterKey),
    deepseek: Boolean(deepseekKey),
    gemini: Boolean(geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui'),
  });
});

// Guardar o actualizar la clave de Agnes AI en .env
app.post('/api/config/agnes-key', (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    const newKey = (apiKey || '').trim();
    const newModel = (model || 'agnes-image-2.1-flash').trim();

    if (/^AGNES_API_KEY=/m.test(envContent)) {
      envContent = envContent.replace(/^AGNES_API_KEY=.*$/m, `AGNES_API_KEY=${newKey}`);
    } else {
      envContent += `\nAGNES_API_KEY=${newKey}`;
    }

    if (/^AGNES_IMAGE_MODEL=/m.test(envContent)) {
      envContent = envContent.replace(/^AGNES_IMAGE_MODEL=.*$/m, `AGNES_IMAGE_MODEL=${newModel}`);
    } else {
      envContent += `\nAGNES_IMAGE_MODEL=${newModel}`;
    }

    fs.writeFileSync(envPath, envContent, 'utf-8');
    process.env.AGNES_API_KEY = newKey;
    process.env.AGNES_IMAGE_MODEL = newModel;

    res.json({
      success: true,
      message: 'Configuración de Agnes AI guardada con éxito en .env',
      hasAgnes: Boolean(newKey),
      model: newModel,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Probar la API de Agnes AI con una llamada de validación
app.post('/api/config/test-agnes', async (req, res) => {
  try {
    const keyToTest = (req.body.apiKey || process.env.AGNES_API_KEY || '').trim();
    if (!keyToTest) {
      return res.status(400).json({ error: 'Debes proporcionar una clave API de Agnes AI para probarla' });
    }

    const testRes = await fetch('https://apihub.agnes-ai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${keyToTest}`,
      },
    });

    if (testRes.status === 401) {
      return res.status(401).json({ error: 'Clave API de Agnes AI inválida o no autorizada (HTTP 401).' });
    }

    if (!testRes.ok) {
      const errText = await testRes.text();
      return res.status(testRes.status).json({ error: `Agnes AI HTTP ${testRes.status}: ${errText}` });
    }

    const data = await testRes.json();
    return res.json({
      success: true,
      message: '¡Conexión exitosa con Agnes AI! API Key válida y activa.',
      models: data.data || data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Guardar o actualizar la configuración de Google Cloud Vertex AI en .env
app.post('/api/config/vertex', (req, res) => {
  try {
    const { projectId, location, apiKey, serviceAccountJson } = req.body;
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    let newProject = (projectId || '').trim();
    const newLocation = (location || 'us-central1').trim();
    const newApiKey = (apiKey || '').trim();

    // Si se pegó un JSON de Service Account, guardarlo en gcp-credentials.json
    let credPath = '';
    if (serviceAccountJson && serviceAccountJson.trim()) {
      try {
        const parsed = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        const credFilePath = path.resolve(__dirname, '../gcp-credentials.json');
        fs.writeFileSync(credFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
        credPath = 'gcp-credentials.json';
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
        if (!newProject && parsed.project_id) {
          newProject = parsed.project_id;
        }
      } catch (err: any) {
        return res.status(400).json({ error: 'El contenido de la cuenta de servicio no es un JSON válido: ' + err.message });
      }
    }

    const setEnvVar = (key: string, val: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
      process.env[key] = val;
    };

    setEnvVar('GOOGLE_GENAI_USE_VERTEXAI', 'true');
    if (newProject) setEnvVar('GOOGLE_CLOUD_PROJECT', newProject);
    if (newLocation) setEnvVar('GOOGLE_CLOUD_LOCATION', newLocation);
    if (credPath) setEnvVar('GOOGLE_APPLICATION_CREDENTIALS', credPath);
    if (newApiKey) setEnvVar('GEMINI_API_KEY', newApiKey);

    fs.writeFileSync(envPath, envContent, 'utf-8');

    res.json({
      success: true,
      message: 'Configuración de Google Cloud Vertex AI guardada con éxito en .env',
      projectId: newProject,
      location: newLocation,
      hasCreds: Boolean(credPath),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Probar la conexión con Google Cloud Vertex AI
app.post('/api/config/test-vertex', async (req, res) => {
  try {
    dotenv.config({ override: true });
    const client = ImageService.getGoogleGenAIClient();
    if (!client) {
      return res.status(400).json({
        error: 'No hay credenciales ni proyecto de Google configurados. Ingresa tu Project ID o Service Account JSON.',
      });
    }

    const { ai, isVertex, projectId } = client;
    console.log(`[Vertex Test] Probando conexión con Google ${isVertex ? 'Vertex AI ($300 Crédito)' : 'Gemini'}...`);

    try {
      const response = await ai.models.generateContent({
        model: isVertex ? 'gemini-2.5-flash' : 'gemini-3.8-flash',
        contents: 'ping',
      });

      return res.json({
        success: true,
        message: `¡Conexión exitosa con Google ${isVertex ? 'Vertex AI' : 'Gemini'}! Proyecto: ${projectId || 'Activo'}. Tus $300 USD de crédito están listos.`,
        preview: response.text?.slice(0, 50),
      });
    } catch (testErr: any) {
      const msg = testErr.message || String(testErr);
      let humanDiagnosis = msg;

      if (msg.includes('API_KEY_SERVICE_BLOCKED')) {
        humanDiagnosis =
          'API_KEY_SERVICE_BLOCKED: Tu API Key tiene restricciones en Google Cloud Console. Ve a APIs y Servicios > Credenciales > tu clave API > Restricciones de API > Selecciona "No restringir la clave" o añade "Vertex AI API" a las APIs permitidas. Como alternativa infalible, sube una Service Account JSON con rol "Vertex AI User".';
      } else if (msg.includes('PERMISSION_DENIED') || msg.includes('blocked')) {
        humanDiagnosis =
          'PERMISSION_DENIED: La API de Vertex AI (aiplatform.googleapis.com) debe ser habilitada en tu proyecto de Google Cloud Console. Ve a Google Cloud Marketplace > Busca "Vertex AI API" > Clic en "Habilitar".';
      } else if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('credits are depleted')) {
        humanDiagnosis =
          'RESOURCE_EXHAUSTED: La clave actual se está procesando en Google AI Studio (donde los créditos prepagos están agotados) en lugar de Google Cloud Vertex AI. Para usar los $300 USD de GCP, asegúrate de activar GOOGLE_GENAI_USE_VERTEXAI=true e ingresar tu Project ID.';
      }

      return res.status(400).json({
        success: false,
        error: humanDiagnosis,
        rawError: msg,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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
    const saved = PersonaService.savePersona(req.body);
    res.json({ success: true, channel: saved });
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
    const { name, title, conflict, company, characterCategory, knownFace, loreData } = req.body;
    const profile = CharacterService.findOrDraftCharacter(
      req.params.channelId,
      name,
      title || 'Historia Documental',
      conflict,
      {
        company,
        characterCategory,
        knownFace,
        loreData,
      }
    );
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolver elenco completo (múltiples personajes individuales + personaje con Lore del Canal si falta rostro conocido)
app.post('/api/characters/:channelId/resolve-cast', (req, res) => {
  try {
    const { characterCompany, title, conflict, projectId } = req.body;
    const cast = CharacterService.resolveCastForStory(
      req.params.channelId,
      characterCompany || '',
      title || 'Historia Documental',
      conflict,
      undefined,
      projectId
    );
    res.json({ success: true, characters: cast });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener catálogo de presets de estilo para diseño de personajes
app.get('/api/characters/style-presets', (_req, res) => {
  res.json(CHARACTER_STYLE_PRESETS);
});

// Generar Retrato Oficial 3D de un Personaje con IA (asistido por foto real de referencia y estilo si existen)
app.post('/api/characters/:channelId/:characterId/generate-portrait', async (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const { stylePreset, customStyle, realReferenceBase64, ...charFields } = req.body || {};
    let character = CharacterService.getCharacter(channelId, characterId);
    if (charFields && charFields.name) {
      character = CharacterService.saveCharacter(channelId, {
        ...(character || {}),
        ...charFields,
        character_id: characterId,
        channel_id: channelId,
      });
    }
    if (!character) {
      return res.status(404).json({ error: 'Personaje no encontrado en la biblioteca' });
    }
    const updated = await ImageService.generateCharacterPortrait(channelId, character, {
      stylePreset,
      customStyle,
      realReferenceBase64,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error generating character portrait:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subir Foto Real Frontal de Referencia del Personaje (PNG/JPG/WebP en base64)
app.post('/api/characters/:channelId/:characterId/upload-real-reference', (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No se recibió imagen de referencia en base64' });
    }
    const updated = CharacterService.saveRealReferenceImage(channelId, characterId, imageBase64);
    if (!updated) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Error uploading real reference image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar fotos reales candidatas (Wikipedia/Wikimedia y Google como respaldo)
app.get('/api/characters/:channelId/:characterId/reference-candidates', async (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const character = CharacterService.getCharacter(channelId, characterId);
    if (!character) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    const query = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q : character.name;
    const isCompany =
      character.character_category === 'company_or_brand' ||
      character.entity_type === 'company' ||
      CharacterService.isCompanyOrBrandEntity(character.name);
    const candidates = await ReferencePhotoService.searchCandidates(
      query,
      character.company_or_affiliation,
      isCompany
    );
    res.json({ query, candidates });
  } catch (error: any) {
    console.error('Error searching reference photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Asignar una foto candidata como referencia real del personaje
app.post('/api/characters/:channelId/:characterId/apply-reference', async (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const { imageUrl } = req.body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Falta imageUrl' });
    }
    const updated = await ReferencePhotoService.applyCandidate(channelId, characterId, imageUrl);
    if (!updated) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Error applying reference photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Aprobar Retrato Oficial Canónico de un Personaje
app.post('/api/characters/:channelId/:characterId/approve-portrait', (req, res) => {
  try {
    const { channelId, characterId } = req.params;
    const character = CharacterService.getCharacter(channelId, characterId);
    if (!character) return res.status(404).json({ error: 'Personaje no encontrado' });
    character.portrait_approved = true;
    character.updatedAt = new Date().toISOString();
    const saved = CharacterService.saveCharacter(channelId, character);
    res.json(saved);
  } catch (error: any) {
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

// 2. Historias / Tareas por Canal (Backlog & Sincronización Google Sheets)
app.get('/api/channels/:channelId/stories', async (req, res) => {
  try {
    const sync = req.query.sync === 'true';
    const stories = await StoryBacklogService.getStories(req.params.channelId, sync);
    res.json(stories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/channels/:channelId/stories', async (req, res) => {
  try {
    const created = await StoryBacklogService.createStory(req.params.channelId, req.body);
    const stories = await StoryBacklogService.getStories(req.params.channelId, false);
    res.json({ success: true, story: created, stories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/channels/:channelId/stories/:storyId', async (req, res) => {
  try {
    const updated = await StoryBacklogService.updateStory(
      req.params.channelId,
      req.params.storyId,
      req.body
    );
    if (!updated) return res.status(404).json({ error: 'Historia no encontrada' });
    const stories = await StoryBacklogService.getStories(req.params.channelId, false);
    res.json({ success: true, story: updated, stories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/channels/:channelId/stories/:storyId', async (req, res) => {
  try {
    const deleted = await StoryBacklogService.deleteStory(req.params.channelId, req.params.storyId);
    res.json({ success: deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sheets/items', async (req, res) => {
  try {
    const channelId = (req.query.channelId as string) || 'tech_scandals';
    const sync = req.query.sync === 'true';
    const items = await StoryBacklogService.getStories(channelId, sync);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Proyectos y Reutilización Modular (Fork de Voz / Fork de Guion)
app.get('/api/projects', (req, res) => {
  const channelId = (req.query.channelId as string) || undefined;
  const projects = ProjectService.listProjects(channelId);
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
    const { title, targetChannelId } = req.body || {};
    const forked = ProjectService.forkProjectWithVoice(req.params.id, title, targetChannelId);
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
    const { title, targetChannelId } = req.body || {};
    const forked = ProjectService.forkProjectScriptOnly(req.params.id, title, targetChannelId);
    if (!forked) return res.status(404).json({ error: 'Proyecto origen no encontrado' });
    res.json(forked);
  } catch (error: any) {
    console.error('Error forking project script:', error);
    res.status(500).json({ error: error.message });
  }
});

// Podar personajes no utilizados (0 escenas) del elenco de un proyecto
app.post('/api/projects/:id/prune-characters', (req, res) => {
  try {
    const project = ProjectService.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const initialCount = project.characters?.length || 0;
    project.characters = CharacterService.pruneUnusedCharacters(
      project.scenes || [],
      project.characters || []
    );
    const removedCount = initialCount - (project.characters?.length || 0);
    const saved = ProjectService.saveProject(project);

    res.json({
      success: true,
      removedCount,
      project: saved,
    });
  } catch (error: any) {
    console.error('Error pruning unused characters:', error);
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
    const cleanUrl = imageUrl.split('?')[0];
    scene.imageUrl = `${cleanUrl}?t=${Date.now()}`;
    scene.imageReused = false;

    const persona = PersonaService.getPersona(project.channel_id);
    const channelId = persona ? persona.channel_id : 'tech_scandals';
    const sceneCharacterIds =
      scene.character_ids && scene.character_ids.length > 0
        ? scene.character_ids
        : project.characters?.[0]
          ? [project.characters[0].character_id]
          : [];
    const primaryCharId = sceneCharacterIds[0];
    const primaryChar =
      project.characters?.find((c) => c.character_id === primaryCharId) || project.characters?.[0];

    if (primaryChar) {
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
          tags: CharacterService.extractTags(scene.visual_prompt, primaryChar.name, project.characterCompany),
          coCharacterIds: sceneCharacterIds.slice(1),
        }
      );
      if (project.characters && project.characters.length > 0) {
        project.characters = project.characters.map(
          (c) => CharacterService.getCharacter(channelId, c.character_id) || c
        );
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

    const cleanImgUrl = imageUrl.split('?')[0];
    scene.imageUrl = `${cleanImgUrl}?t=${Date.now()}`;
    scene.imageReused = true;
    if (prompt) scene.reusedAssetPrompt = prompt;

    ProjectService.saveProject(project);
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Error setting library image on scene:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Generación de Guion con Personajes Auto-vinculados + Barra de Progreso en Tiempo Real
app.post('/api/script/generate', async (req, res) => {
  const { topic, channelId, conflict, characters, sources, storyId, durationRange } = req.body;
  const persona = PersonaService.getPersona(channelId);
  if (!persona) {
    return res.status(400).json({ error: `Persona no encontrada para el canal ${channelId}` });
  }

  const job = JobProgressService.createJob({
    type: 'script',
    title: `Generando Guion: ${topic}`,
    channelId,
    phase: 'Iniciando investigación documental y estructuración narrativa...',
    totalSteps: 4,
  });

  try {
    const script = await ScriptService.generateScript(
      topic,
      persona,
      conflict,
      characters,
      sources,
      ScriptService.normalizeDurationRange(durationRange),
      (percent, phase, detail) => {
        JobProgressService.updateJob(job.jobId, {
          percent,
          phase,
          detail,
        });
      }
    );

    JobProgressService.updateJob(job.jobId, {
      percent: 96,
      projectId: script.project_id,
      phase: 'Vinculando elenco individual en la Biblioteca de Personajes del canal...',
    });

    // Preservar el elenco multi-personaje resuelto por ScriptService (o resolver si está vacío)
    if (!script.characters || script.characters.length === 0) {
      script.characters = CharacterService.resolveCastForStory(
        channelId,
        characters || script.characterCompany || '',
        topic,
        conflict
      );
      script.scenes = CharacterService.assignCharactersToScenes(script.scenes, script.characters);
    }
    JobProgressService.updateJob(job.jobId, {
      percent: 97,
      phase: 'Buscando fotos reales de referencia para el elenco...',
    });
    script.characters = await ReferencePhotoService.autoAssignMissingPhotos(
      channelId,
      script.characters
    );
    script.artStyle = '3d_animation';
    script.status = 'characters_ready';
    script.lastActiveStep = 2;

    if (storyId) {
      script.story_id = storyId;
      await StoryBacklogService.updateStory(channelId, storyId, {
        status: 'scripted',
        linkedProjectId: script.project_id,
      });
    } else {
      // Si fue un tema libre escrito a mano, registrarlo también como tarea en el backlog del canal
      const castLabel =
        characters ||
        script.characterCompany ||
        script.characters.map((c) => c.name).join(' y ') ||
        topic;
      const createdStory = await StoryBacklogService.createStory(channelId, {
        title: topic,
        characterCompany: castLabel,
        conflict: conflict || script.hook,
        sources: sources || [],
        status: 'scripted',
      });
      script.story_id = createdStory.id;
      await StoryBacklogService.updateStory(channelId, createdStory.id, {
        linkedProjectId: script.project_id,
        status: 'scripted',
      });
    }

    ProjectService.saveProject(script);
    JobProgressService.completeJob(
      job.jobId,
      `¡Guion de ${script.scenes.length} escenas creado con éxito!`,
      `Proyecto ${script.project_id} listo en el Editor (${script.characters.length} personaje(s) vinculado(s))`
    );
    res.json(script);
  } catch (error: any) {
    console.error('Error generating script:', error);
    JobProgressService.failJob(job.jobId, error.message || 'Error generando guion');
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

// 5.0 Conmutador de Idioma en Vivo (Español <-> Inglés) sin pérdida de datos
app.post('/api/project/switch-language', async (req, res) => {
  try {
    const { projectId, targetLanguage } = req.body;
    if (!projectId || !targetLanguage || !['es', 'en'].includes(targetLanguage)) {
      return res.status(400).json({ error: 'Parámetros inválidos: projectId y targetLanguage son requeridos' });
    }

    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const currentLang = project.language || 'es';
    if (currentLang === targetLanguage) {
      return res.json({ success: true, project });
    }

    const projectDir = path.resolve(__dirname, `../storage/projects/${projectId}`);

    if (targetLanguage === 'es') {
      // 1. Guardar estado actual en scenes_en
      project.scenes_en = project.scenes.map((s) => ({
        scene_id: s.scene_id,
        chapter_en: s.chapter,
        voiceover_en: s.voiceover,
        audioUrl: s.audioUrl,
        wordTimings: s.wordTimings,
        audioDurationSeconds: s.audioDurationSeconds || s.durationInSeconds,
        highlight_metric: s.highlight_metric,
        highlight_label: s.highlight_label,
      }));

      // 2. Si no hay scenes_es, crearlas con el estado actual
      if (!project.scenes_es || project.scenes_es.length === 0) {
        project.scenes_es = project.scenes.map((s) => ({
          scene_id: s.scene_id,
          chapter_es: s.chapter,
          voiceover_es: s.voiceover,
          audioUrl: s.audioUrl,
          wordTimings: s.wordTimings,
          audioDurationSeconds: s.audioDurationSeconds || s.durationInSeconds,
          highlight_metric: s.highlight_metric,
          highlight_label: s.highlight_label,
        }));
      }

      // 3. Restaurar escenas con contenido en español
      project.scenes = project.scenes.map((s) => {
        const es = project.scenes_es?.find((e) => e.scene_id === s.scene_id);
        const esAudioPath = path.join(projectDir, 'audio_es', `scene_${s.scene_id}.mp3`);
        const fallbackAudioPath = path.join(projectDir, 'audio', `scene_${s.scene_id}.mp3`);
        let finalAudioUrl = es?.audioUrl;
        if (!finalAudioUrl) {
          if (fs.existsSync(esAudioPath)) finalAudioUrl = `/storage/${projectId}/audio_es/scene_${s.scene_id}.mp3`;
          else if (fs.existsSync(fallbackAudioPath)) finalAudioUrl = `/storage/${projectId}/audio/scene_${s.scene_id}.mp3`;
        }

        return {
          ...s,
          chapter: es?.chapter_es || s.chapter,
          voiceover: es?.voiceover_es || s.voiceover,
          highlight_metric: es?.highlight_metric || s.highlight_metric,
          highlight_label: es?.highlight_label || s.highlight_label,
          audioUrl: finalAudioUrl,
          wordTimings: es?.wordTimings || s.wordTimings,
          audioDurationSeconds: es?.audioDurationSeconds || s.audioDurationSeconds,
        };
      });

      project.language = 'es';
      if (project.outputVideoUrlEs) {
        project.outputVideoUrl = project.outputVideoUrlEs;
        project.videoNeedsReRender = false;
      } else {
        project.videoNeedsReRender = true;
      }
    } else {
      // targetLanguage === 'en'
      // 1. Guardar estado actual en scenes_es
      project.scenes_es = project.scenes.map((s) => ({
        scene_id: s.scene_id,
        chapter_es: s.chapter,
        voiceover_es: s.voiceover,
        audioUrl: s.audioUrl,
        wordTimings: s.wordTimings,
        audioDurationSeconds: s.audioDurationSeconds || s.durationInSeconds,
        highlight_metric: s.highlight_metric,
        highlight_label: s.highlight_label,
      }));

      // 2. Si no hay scenes_en, crearlas
      if (!project.scenes_en || project.scenes_en.length === 0) {
        project.scenes_en = project.scenes.map((s) => ({
          scene_id: s.scene_id,
          chapter_en: s.chapter,
          voiceover_en: s.voiceover,
          audioUrl: s.audioUrl,
          wordTimings: s.wordTimings,
          audioDurationSeconds: s.audioDurationSeconds || s.durationInSeconds,
          highlight_metric: s.highlight_metric,
          highlight_label: s.highlight_label,
        }));
      }

      // 3. Restaurar escenas con contenido en inglés
      project.scenes = project.scenes.map((s) => {
        const en = project.scenes_en?.find((e) => e.scene_id === s.scene_id);
        const enAudioPath = path.join(projectDir, 'audio_en', `scene_${s.scene_id}.mp3`);
        const fallbackAudioPath = path.join(projectDir, 'audio', `scene_${s.scene_id}.mp3`);
        let finalAudioUrl = en?.audioUrl;
        if (!finalAudioUrl && fs.existsSync(enAudioPath)) {
          finalAudioUrl = `/storage/${projectId}/audio_en/scene_${s.scene_id}.mp3`;
        }

        return {
          ...s,
          chapter: en?.chapter_en || s.chapter,
          voiceover: en?.voiceover_en || s.voiceover,
          highlight_metric: en?.highlight_metric || s.highlight_metric,
          highlight_label: en?.highlight_label || s.highlight_label,
          audioUrl: finalAudioUrl,
          wordTimings: en?.wordTimings,
          audioDurationSeconds: en?.audioDurationSeconds,
        };
      });

      project.language = 'en';
      if (project.outputVideoUrlEn) {
        project.outputVideoUrl = project.outputVideoUrlEn;
        project.videoNeedsReRender = false;
      } else {
        project.videoNeedsReRender = true;
      }
    }

    // Sincronizar duraciones bilingües
    await AudioService.synchronizeBilingualDurations(project);

    ProjectService.saveProject(project);
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Error switching project language:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5.1 Traducir y Adaptar Guion Aprobado (Español -> Inglés Nativo Documental para ElevenLabs)
app.post('/api/script/translate-en', async (req, res) => {
  const { projectId } = req.body;
  const project = ProjectService.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const job = JobProgressService.createJob({
    type: 'translate',
    title: `Traduciendo Guion a Inglés: ${project.title}`,
    projectId,
    channelId: project.channel_id,
    phase: `Adaptando ${project.scenes.length} escenas a Inglés Documental Nativo...`,
  });

  try {
    JobProgressService.updateJob(job.jobId, {
      percent: 40,
      phase: 'Traduciendo locución y métricas con tono documental...',
    });
    const translatedProject = await ScriptService.translateProjectToEnglish(project);
    ProjectService.saveProject(translatedProject);
    JobProgressService.completeJob(job.jobId, '¡Guion adaptado a Inglés Documental!');
    res.json(translatedProject);
  } catch (error: any) {
    console.error('Error translating script to English:', error);
    JobProgressService.failJob(job.jobId, error.message);
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
    const artStyle = updatedProject.artStyle || '3d_animation';

    // Si el usuario pidió regenerar imagen automáticamente para las escenas modificadas
    if (autoRegenerateImage && result.changedSceneIds.length > 0) {
      for (const sId of result.changedSceneIds) {
        const sc = updatedProject.scenes.find((s) => s.scene_id === sId);
        if (sc) {
          try {
            const scChars =
              Array.isArray(sc.character_ids)
                ? (sc.character_ids.length === 0
                    ? []
                    : sc.character_ids
                        .map(
                          (id) =>
                            updatedProject.characters?.find((c) => c.character_id === id) ||
                            CharacterService.getCharacter(channelId, id)
                        )
                        .filter((c): c is NonNullable<typeof c> => Boolean(c) && c.character_category !== 'company_or_brand'))
                : updatedProject.characters?.[0]
                  ? [updatedProject.characters[0]]
                  : [];

            const imgUrl = await ImageService.generateSceneImage(
              updatedProject.project_id,
              sc.scene_id,
              sc.visual_prompt,
              sc.chapter,
              channelId,
              scChars,
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
            sc.voiceoverTextAtAudioGen = sc.voiceover;
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


// 6. Generación de Imágenes (Multi-Proveedor con Arco Emocional, Biblioteca, Reutilización Inteligente sin repetir en el mismo video y Progreso SSE)
app.post('/api/images/generate', async (req, res) => {
  const { projectId, sceneId, characterId, customArtStyle, smartReuse, forceAi, onlyDuplicatesOrMissing } = req.body;
  const project = ProjectService.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const persona = PersonaService.getPersona(project.channel_id);
  const channelId = persona ? persona.channel_id : 'tech_scandals';
  const totalScenes = project.scenes.length;

  const job = JobProgressService.createJob({
    type: 'images',
    title:
      sceneId !== undefined
        ? `Generando Imagen de Escena #${sceneId}`
        : onlyDuplicatesOrMissing
          ? `Corrigiendo Escenas Faltantes o Repetidas (${project.title.slice(0, 32)})`
          : `Generando ${totalScenes} Imágenes 16:9 (${project.title.slice(0, 35)})`,
    projectId,
    channelId,
    phase:
      sceneId !== undefined
        ? `Procesando imagen para la Escena #${sceneId}...`
        : `Preparando generación visual de escenas únicas...`,
    totalSteps: sceneId !== undefined ? 1 : totalScenes,
  });

  try {
    // Asegurar elenco completo del proyecto sin sobrescribir múltiples personajes
    if (!project.characters || project.characters.length === 0) {
      project.characters = CharacterService.resolveCastForStory(
        channelId,
        project.characterCompany || '',
        project.title
      );
      project.scenes = CharacterService.assignCharactersToScenes(project.scenes, project.characters);
    } else {
      // Refrescar perfiles desde disco para obtener los retratos y assets más recientes
      project.characters = project.characters.map(
        (c) => CharacterService.getCharacter(channelId, c.character_id) || c
      );
    }

    // Podar personajes sin escenas para garantizar consistencia del elenco
    project.characters = CharacterService.pruneUnusedCharacters(project.scenes, project.characters);

    if (characterId) {
      const foundChar = CharacterService.getCharacter(channelId, characterId);
      if (foundChar) {
        const existingIdx = project.characters.findIndex((c) => c.character_id === foundChar.character_id);
        if (existingIdx >= 0) {
          project.characters[existingIdx] = foundChar;
        } else {
          project.characters.unshift(foundChar);
        }
      }
    }

    const resolveSceneCast = (sc: typeof project.scenes[0]) => {
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

    const artStyle = customArtStyle || project.artStyle || '3d_animation';
    const isSmartReuseEnabled = smartReuse !== false;
    project.smartReuseImages = isSmartReuseEnabled;

    // Conjunto de URLs y prompts que NO pueden repetirse dentro de este mismo video
    const usedUrlsInProject = new Set<string>();
    const usedPromptsInProject = new Set<string>();

    // Registrar todos los prompts propios de las escenas de este video para que un asset generado en la Escena 1
    // jamás se reutilice en la Escena 6, 7, 12, 13 o 14 del mismo video
    for (const sc of project.scenes) {
      if (sc.visual_prompt) {
        usedPromptsInProject.add(sc.visual_prompt.trim().toLowerCase());
      }
    }

    if (sceneId !== undefined) {
      // Registrar las URLs ya presentes en las OTRAS escenas del proyecto
      for (const sc of project.scenes) {
        if (sc.scene_id !== sceneId && sc.imageUrl) {
          usedUrlsInProject.add(sc.imageUrl);
        }
      }

      // Escena individual
      const scene = project.scenes.find((s) => s.scene_id === sceneId);
      if (!scene) {
        JobProgressService.failJob(job.jobId, 'Escena no encontrada');
        return res.status(404).json({ error: 'Escena no encontrada' });
      }

      const sceneCast = resolveSceneCast(scene);
      const primaryChar = sceneCast[0];

      JobProgressService.updateJob(job.jobId, {
        percent: 30,
        currentStep: 1,
        totalSteps: 1,
        phase: `Generando imagen 16:9 para Escena #${scene.scene_id}: "${scene.chapter}" (${sceneCast.map((c) => c.name).join(' + ') || 'Sin personaje'})...`,
      });

      let reused = false;
      if (isSmartReuseEnabled && !forceAi) {
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
          reused = true;
          console.log(`[Image Generation] Escena ${scene.scene_id}: Reutilizada de otro video en biblioteca (0 costo, única en este video).`);
        }
      }

      if (!reused) {
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
          project.characters = project.characters.map(
            (c) => CharacterService.getCharacter(channelId, c.character_id) || c
          );
        }
      }
      JobProgressService.completeJob(
        job.jobId,
        `¡Imagen de Escena #${scene.scene_id} lista!`,
        reused ? 'Reutilizada de otro video (única en este proyecto)' : 'Generada con IA en formato 16:9'
      );
    } else {
      // Generar escenas en lote garantizando 0 imágenes repetidas dentro del mismo video
      let reusedCount = 0;
      let aiGeneratedCount = 0;
      let skippedUniqueCount = 0;

      // Detectar qué escenas ya tienen una imagen única vs cuáles están repetidas, vacías o con placeholder .svg
      const seenSceneUrls = new Set<string>();
      const scenesNeedingGeneration = new Set<number>();

      // Mapear URLs de galería que en realidad son copias de escenas generadas en este mismo proyecto
      const selfGeneratedGalleryUrls = new Set<string>();
      const allChannelChars = CharacterService.getCharacters(channelId);
      const projectPromptsNorm = new Set(
        project.scenes.map((s) => (s.visual_prompt || '').trim().toLowerCase()).filter(Boolean)
      );
      for (const ch of allChannelChars) {
        for (const asset of ch.assets || []) {
          if (
            asset.sourceProjectId === project.project_id ||
            (asset.prompt && projectPromptsNorm.has(asset.prompt.trim().toLowerCase()))
          ) {
            selfGeneratedGalleryUrls.add(asset.url);
          }
        }
      }

      for (const sc of project.scenes) {
        if (!sc.imageUrl || sc.imageUrl.toLowerCase().endsWith('.svg')) {
          scenesNeedingGeneration.add(sc.scene_id);
        } else if (seenSceneUrls.has(sc.imageUrl)) {
          // Esta escena tiene una imagen repetida de una escena anterior en este mismo video
          scenesNeedingGeneration.add(sc.scene_id);
        } else if (sc.imageReused && selfGeneratedGalleryUrls.has(sc.imageUrl)) {
          // Esta escena reutilizó por error una imagen creada en otra escena de este mismo video
          scenesNeedingGeneration.add(sc.scene_id);
        } else {
          seenSceneUrls.add(sc.imageUrl);
          if (onlyDuplicatesOrMissing) {
            usedUrlsInProject.add(sc.imageUrl);
          }
        }
      }

      for (let i = 0; i < project.scenes.length; i++) {
        if (JobProgressService.isCancelled(job.jobId)) {
          break;
        }
        const scene = project.scenes[i];
        const stepNum = i + 1;
        const pct = Math.round(((stepNum - 1) / totalScenes) * 95) + 3;

        // Si el usuario eligió "Solo Faltantes o Repetidas" y esta escena ya tiene una imagen única válida, conservarla
        if (onlyDuplicatesOrMissing && !scenesNeedingGeneration.has(scene.scene_id)) {
          skippedUniqueCount++;
          if (scene.imageUrl) usedUrlsInProject.add(scene.imageUrl);
          continue;
        }

        const sceneCast = resolveSceneCast(scene);
        const primaryChar = sceneCast[0];

        JobProgressService.updateJob(job.jobId, {
          percent: pct,
          currentStep: stepNum,
          totalSteps: totalScenes,
          phase: `Procesando Escena ${stepNum} de ${totalScenes}: "${scene.chapter}" (${sceneCast.map((c) => c.name).join(' + ') || 'Escena'})...`,
          detail: `${aiGeneratedCount} nuevas con IA • ${reusedCount} reutilizadas de otros videos${skippedUniqueCount > 0 ? ` • ${skippedUniqueCount} únicas conservadas` : ''}`,
        });

        let reused = false;
        if (isSmartReuseEnabled && !forceAi) {
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
            if (matchingAsset.prompt) {
              usedPromptsInProject.add(matchingAsset.prompt.trim().toLowerCase());
            }
            reused = true;
            reusedCount++;
            console.log(`[Smart Batch] Escena ${scene.scene_id}: Reutilizada de otro video (${matchingAsset.placeOrEnvironment || matchingAsset.description || matchingAsset.id}) [Única en este video]`);
          }
        }

        if (!reused) {
          // Pausa entre llamadas consecutivas a IA para evitar saturar el rate-limit de Google Vertex AI (5 RPM)
          if (aiGeneratedCount > 0) {
            const isUsingVertex =
              process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ||
              Boolean(process.env.GOOGLE_CLOUD_PROJECT);
            const paceMs = isUsingVertex ? 9500 : 1500;
            if (isUsingVertex) {
              console.log(
                `[Batch Image Pace] ⏳ Pausando ${(paceMs / 1000).toFixed(1)}s para mantener la tasa de Google Vertex AI dentro del límite de 5 RPM (máxima calidad cinematográfica sostenida)...`
              );
            }
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

        // Guardar incrementalmente para no perder avance si se cancela
        project.characters = project.characters.map(
          (c) => CharacterService.getCharacter(channelId, c.character_id) || c
        );
        ProjectService.saveProject(project);
      }

      project.characters = project.characters.map(
        (c) => CharacterService.getCharacter(channelId, c.character_id) || c
      );
      project.status = 'images_ready';
      project.lastActiveStep = 4;

      if (project.story_id) {
        await StoryBacklogService.updateStory(channelId, project.story_id, {
          status: 'in_production',
          linkedProjectId: project.project_id,
        });
      }

      if (!JobProgressService.isCancelled(job.jobId)) {
        JobProgressService.completeJob(
          job.jobId,
          `¡${totalScenes} escenas visuales listas sin repeticiones!`,
          `${aiGeneratedCount} generadas con IA • ${reusedCount} reutilizadas de otros videos${skippedUniqueCount > 0 ? ` • ${skippedUniqueCount} conservadas` : ''}`
        );
      }
    }

    project.videoNeedsReRender = true;
    ProjectService.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error('Error generating images:', error);
    JobProgressService.failJob(job.jobId, error.message || 'Error generando imágenes');
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

    project.videoNeedsReRender = true;
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

// 7.0.1 Catálogo Unificado y Muestras de Voz (Voice Studio Explorer)
app.get('/api/audio/catalog', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const voices = await VoiceCatalogService.getCatalog(forceRefresh);
    res.json({ success: true, voices });
  } catch (error: any) {
    console.error('Error fetching voice catalog:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para servir la muestra de audio de un perfil de VoiceStudio (directo de disco o de backend 3900)
app.get('/api/audio/voicestudio/proxy-audio/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const voicesDir = '/home/pc/.omnivoice/voices';

    // 1. Intentar servir directamente de disco para latencia 0 y sin requerir que la GPU esté encendida
    if (fs.existsSync(voicesDir)) {
      const candidates = [`${profileId}.ogg`, `${profileId}.wav`, `${profileId}.mp3`];
      for (const cand of candidates) {
        const filePath = path.join(voicesDir, cand);
        if (fs.existsSync(filePath)) {
          const mimeType = cand.endsWith('.ogg') ? 'audio/ogg' : cand.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
          res.setHeader('Content-Type', mimeType);
          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    // 2. Si no se encontró en disco, intentar proxy al backend 3900 si está activo
    const vsUrl = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
    const remoteRes = await fetch(`${vsUrl}/profiles/${profileId}/audio`);
    if (remoteRes.ok && remoteRes.body) {
      const contentType = remoteRes.headers.get('content-type') || 'audio/ogg';
      res.setHeader('Content-Type', contentType);
      const arrayBuffer = await remoteRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    res.status(404).send('Audio sample not found');
  } catch (error: any) {
    console.error('Error proxying voicestudio audio:', error);
    res.status(500).send(error.message);
  }
});

// Laboratorio de prueba de voz con frase personalizada
app.post('/api/audio/preview-test', async (req, res) => {
  try {
    const { provider, voiceId, text } = req.body;
    if (!provider || !voiceId) {
      return res.status(400).json({ error: 'Faltan parámetros: provider y voiceId son requeridos' });
    }

    const previewUrl = await VoiceCatalogService.generatePreviewSample(
      provider,
      voiceId,
      text || 'Esta es una prueba de voz para el documental.'
    );
    res.json({ success: true, previewUrl });
  } catch (error: any) {
    console.error('Error generating preview sample:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7.1 Generación de Audio y Locución Multi-Motor (VoiceStudio Gomorra Local RTX 3080 / ElevenLabs Cloud / OpenAI) + Progreso SSE
app.post('/api/audio/generate', async (req, res) => {
  const { projectId, sceneId, provider, voice, voiceMode, primaryVoice, secondaryVoice } = req.body;
  const project = ProjectService.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const persona = PersonaService.getPersona(project.channel_id);
  const channelId = persona ? persona.channel_id : 'tech_scandals';
  const totalScenes = project.scenes.length;

  const job = JobProgressService.createJob({
    type: 'audio',
    title:
      sceneId !== undefined
        ? `Sintetizando Audio de Escena #${sceneId}`
        : `Sintetizando Locución Completa (${totalScenes} escenas)`,
    projectId,
    channelId,
    phase:
      sceneId !== undefined
        ? `Sintetizando voz para la Escena #${sceneId}...`
        : `Inicializando motor de locución para ${totalScenes} escenas...`,
    totalSteps: sceneId !== undefined ? 1 : totalScenes,
  });

  try {
    if (voiceMode) project.voiceMode = voiceMode;
    if (primaryVoice) project.primaryVoice = primaryVoice;
    if (secondaryVoice !== undefined) project.secondaryVoice = secondaryVoice;

    const isVoiceStudioAvailable = await AudioService.isVoiceStudioAvailable();

    // Prioridad: provider explícito -> VoiceStudio si está activo -> ElevenLabs si es inglés -> OpenAI/Edge
    const effectiveProvider: 'voicestudio' | 'elevenlabs' | 'openai' =
      provider ||
      project.voiceEngine ||
      (isVoiceStudioAvailable ? 'voicestudio' : (project.language === 'en' ? 'elevenlabs' : 'openai'));
    project.voiceEngine = effectiveProvider;

    const resolveSceneVoice = (scene: any) => {
      if (voice) return voice;
      if (project.voiceMode === 'dual') {
        const isSecondary = scene.voiceRole === 'secondary';
        if (isSecondary) {
          return project.secondaryVoice || 'demo0001';
        }
        return project.primaryVoice || 'gomorra';
      }
      return project.primaryVoice || 'gomorra';
    };

    if (sceneId !== undefined) {
      const scene = project.scenes.find((s) => s.scene_id === sceneId);
      if (!scene) {
        JobProgressService.failJob(job.jobId, 'Escena no encontrada');
        return res.status(404).json({ error: 'Escena no encontrada' });
      }

      const sceneVoice = resolveSceneVoice(scene);
      JobProgressService.updateJob(job.jobId, {
        percent: 35,
        currentStep: 1,
        totalSteps: 1,
        phase: `Sintetizando Escena #${scene.scene_id} con ${effectiveProvider} (${sceneVoice})...`,
      });

      const result = await AudioService.generateSceneAudio(
        projectId,
        scene.scene_id,
        scene.voiceover,
        channelId,
        effectiveProvider,
        sceneVoice
      );

      scene.audioUrl = result.audioUrl;
      scene.voiceoverTextAtAudioGen = scene.voiceover;
      scene.durationInSeconds = result.durationInSeconds;
      scene.wordTimings = result.wordTimings;
      scene.voiceProfile = sceneVoice;

      JobProgressService.completeJob(
        job.jobId,
        `¡Audio de Escena #${scene.scene_id} listo (${result.durationInSeconds}s)!`
      );
    } else {
      for (let i = 0; i < project.scenes.length; i++) {
        if (JobProgressService.isCancelled(job.jobId)) {
          break;
        }
        const scene = project.scenes[i];
        const stepNum = i + 1;
        const pct = Math.round(((stepNum - 1) / totalScenes) * 95) + 3;
        const sceneVoice = resolveSceneVoice(scene);

        JobProgressService.updateJob(job.jobId, {
          percent: pct,
          currentStep: stepNum,
          totalSteps: totalScenes,
          phase: `Sintetizando locución: Escena ${stepNum} de ${totalScenes} ("${scene.chapter}")...`,
          detail: `Motor: ${effectiveProvider} • Voz: ${sceneVoice}`,
        });

        const result = await AudioService.generateSceneAudio(
          projectId,
          scene.scene_id,
          scene.voiceover,
          channelId,
          effectiveProvider,
          sceneVoice
        );

        scene.audioUrl = result.audioUrl;
        scene.voiceoverTextAtAudioGen = scene.voiceover;
        scene.durationInSeconds = result.durationInSeconds;
        scene.wordTimings = result.wordTimings;
        scene.voiceProfile = sceneVoice;

        ProjectService.saveProject(project);
      }

      project.status = 'audio_ready';
      project.lastActiveStep = 4;
      project.videoNeedsReRender = true;

      if (project.story_id) {
        await StoryBacklogService.updateStory(channelId, project.story_id, {
          status: 'in_production',
          linkedProjectId: project.project_id,
        });
      }

      if (!JobProgressService.isCancelled(job.jobId)) {
        const totalSec = Math.round(
          project.scenes.reduce((acc, s) => acc + s.durationInSeconds, 0)
        );
        JobProgressService.completeJob(
          job.jobId,
          `¡Locución de ${totalScenes} escenas completada (${Math.round(totalSec / 60)} min)!`
        );
      }
    }

    project.videoNeedsReRender = true;
    ProjectService.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error('Error generating audio:', error);
    JobProgressService.failJob(job.jobId, error.message || 'Error generando audio');
    res.status(500).json({ error: error.message });
  }
});

// 7.2 Producción Turbo: Generación Concurrente de Imágenes (Cloud API) + Audio (Local/Cloud) + Auto-Render opcional
app.post('/api/project/generate-all-assets', async (req, res) => {
  try {
    const {
      projectId,
      customArtStyle,
      smartReuse,
      forceAiImages,
      preferredAudioProvider,
      voice,
      voiceMode,
      primaryVoice,
      secondaryVoice,
      autoRender,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId es obligatorio' });
    }

    const result = await ParallelProductionService.runParallelProduction({
      projectId,
      customArtStyle,
      smartReuse,
      forceAiImages,
      preferredAudioProvider,
      voice,
      voiceMode,
      primaryVoice,
      secondaryVoice,
      autoRender: Boolean(autoRender),
    });

    res.json(result);
  } catch (error: any) {
    console.error('[TurboProduction] Error en producción concurrente:', error);
    res.status(500).json({ error: error.message || 'Error en producción concurrente' });
  }
});

// 8. Renderizado de Video en MP4 con Remotion CLI (1080p, Audio y Subtítulos) + Progreso Real por Frame
app.post('/api/render', async (req, res) => {
  const {
    projectId,
    showCaptions,
    showAtmosphere,
    showHighlightCards,
    showChapterBadge,
    motionIntensity,
    language,
    scenes,
  } = req.body;
  const project = ProjectService.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  // Si el cliente envía escenas actualizadas (nuevas voces, textos, etc.), sincronizarlas
  if (Array.isArray(scenes) && scenes.length > 0) {
    project.scenes = scenes;
  }

  // Sincronizar duraciones bilingües antes del renderizado
  await AudioService.synchronizeBilingualDurations(project);
  ProjectService.saveProject(project);

  const targetLang = ((language || project.language || 'en') as string).toLowerCase() === 'es' ? 'es' : 'en';
  const projectDir = path.resolve(__dirname, `../storage/projects/${projectId}`);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Preparar escenas exactas para el idioma objetivo (voces, textos y duraciones)
  let scenesToRender = project.scenes;
  if (targetLang === 'es' && project.scenes_es && project.scenes_es.length > 0) {
    scenesToRender = project.scenes.map((s, idx) => {
      const es = project.scenes_es?.find((e) => e.scene_id === s.scene_id) || project.scenes_es?.[idx];
      const esAudioPath = path.join(projectDir, 'audio_es', `scene_${s.scene_id}.mp3`);
      const fallbackAudio = path.join(projectDir, 'audio', `scene_${s.scene_id}.mp3`);
      let audioUrl = es?.audioUrl;
      if (!audioUrl) {
        if (fs.existsSync(esAudioPath)) audioUrl = `/storage/${projectId}/audio_es/scene_${s.scene_id}.mp3`;
        else if (project.language === 'es' && fs.existsSync(fallbackAudio)) audioUrl = `/storage/${projectId}/audio/scene_${s.scene_id}.mp3`;
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
  } else if (targetLang === 'en' && project.scenes_en && project.scenes_en.length > 0) {
    scenesToRender = project.scenes.map((s, idx) => {
      const en = project.scenes_en?.find((e) => e.scene_id === s.scene_id) || project.scenes_en?.[idx];
      const enAudioPath = path.join(projectDir, 'audio_en', `scene_${s.scene_id}.mp3`);
      const fallbackAudio = path.join(projectDir, 'audio', `scene_${s.scene_id}.mp3`);
      let audioUrl = en?.audioUrl;
      if (!audioUrl) {
        if (fs.existsSync(enAudioPath)) audioUrl = `/storage/${projectId}/audio_en/scene_${s.scene_id}.mp3`;
        else if (project.language === 'en' && fs.existsSync(fallbackAudio)) audioUrl = `/storage/${projectId}/audio/scene_${s.scene_id}.mp3`;
      }
      return {
        ...s,
        chapter: en?.chapter_en || s.chapter,
        voiceover: en?.voiceover_en || s.voiceover,
        audioUrl: audioUrl || s.audioUrl,
        wordTimings: en?.wordTimings || s.wordTimings,
        durationInSeconds: en?.audioDurationSeconds || s.durationInSeconds,
      };
    });
  }

  const totalFrames = Math.max(
    60,
    Math.round(scenesToRender.reduce((acc, s) => acc + (s.durationInSeconds || 3), 0) * 30)
  );

  const isCleanRender = showCaptions === false || showCaptions === undefined;
  const job = JobProgressService.createJob({
    type: 'render',
    title: `Renderizando MP4 1080p (${targetLang.toUpperCase()} • ${isCleanRender ? 'Video Limpio para YouTube' : 'Con Subtítulos'}): ${project.title.slice(0, 30)}`,
    projectId,
    channelId: project.channel_id,
    phase: 'Preparando escenas y empaquetando composición Remotion...',
    totalSteps: totalFrames,
  });

  try {
    // 1. Escribir props dinámicas para Remotion CLI
    const propsPath = path.join(projectDir, 'remotion_props.json');
    const remotionProps = {
      channelId: project.channel_id,
      title: project.title,
      scenes: scenesToRender,
      showCaptions: typeof showCaptions === 'boolean' ? showCaptions : false,
      showAtmosphere: typeof showAtmosphere === 'boolean' ? showAtmosphere : true,
      showHighlightCards: typeof showHighlightCards === 'boolean' ? showHighlightCards : true,
      showChapterBadge: typeof showChapterBadge === 'boolean' ? showChapterBadge : true,
      motionIntensity: motionIntensity || 'standard',
      language: targetLang,
    };
    fs.writeFileSync(propsPath, JSON.stringify(remotionProps, null, 2), 'utf-8');

    // 2. Ruta de exportación MP4 según idioma (final_video_es.mp4 o final_video_en.mp4 para no sobreescribir)
    const videoFileName = targetLang === 'es' ? 'final_video_es.mp4' : 'final_video_en.mp4';
    const outputPath = path.join(projectDir, videoFileName);

    const cpuCount = os.cpus().length || 4;
    const optimalConcurrency = Math.min(10, Math.max(4, Math.floor(cpuCount * 0.75)));

    console.log(`[Render] Iniciando renderizado Remotion CLI para proyecto ${projectId} (${optimalConcurrency} hilos concurrentes)...`);
    const rootDir = path.resolve(__dirname, '..');

    JobProgressService.updateJob(job.jobId, {
      percent: 6,
      phase: `Empaquetando código y recursos multimedia con Remotion (${optimalConcurrency} hilos)...`,
      detail: `0 / ${totalFrames} fotogramas (1920x1080 @ 30fps)`,
    });

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
        { cwd: rootDir }
      );

      JobProgressService.registerChildProcess(job.jobId, child);

      let lastLog = '';
      const handleChunk = (chunk: Buffer) => {
        const text = chunk.toString();
        lastLog = text;

        // Detectar empaquetado (Bundling X%)
        const bundleMatch = text.match(/Bundling[\s\S]*?(\d+)%/i);
        if (bundleMatch) {
          const bPct = Number(bundleMatch[1]);
          const mapped = Math.min(14, Math.max(5, Math.round(bPct * 0.14)));
          JobProgressService.updateJob(job.jobId, {
            percent: mapped,
            phase: `Empaquetando motor de video Remotion (${bPct}%)...`,
          });
        }

        // Detectar fotogramas renderizados (Rendered 120/1800 o 120/1800)
        const frameMatch = text.match(/(?:Rendered|Rendering|Stitching)?\s*(\d+)\s*\/\s*(\d+)/i);
        if (frameMatch) {
          const current = Number(frameMatch[1]);
          const total = Number(frameMatch[2]) || totalFrames;
          if (total > 0 && current <= total) {
            const isStitching = /Stitching|Encoding/i.test(text);
            const basePct = isStitching
              ? 88 + Math.round((current / total) * 10)
              : 15 + Math.round((current / total) * 73);
            JobProgressService.updateJob(job.jobId, {
              percent: Math.min(98, basePct),
              currentStep: current,
              totalSteps: total,
              phase: isStitching
                ? `Codificando y uniendo audio/video MP4 (${current}/${total})...`
                : `Renderizando fotogramas en 1080p (${current} / ${total})...`,
              detail: `${Math.round((current / total) * 100)}% de los frames procesados`,
            });
          }
        }
      };

      child.stdout.on('data', handleChunk);
      child.stderr.on('data', handleChunk);

      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (JobProgressService.isCancelled(job.jobId)) {
          reject(new Error('Renderizado cancelado por el usuario'));
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Remotion finalizó con código ${code}: ${lastLog.slice(-200)}`));
        }
      });
    });

    console.log(`[Render] Renderizado completado con éxito para ${projectId}`);

    // Sincronizar final_video.mp4 para mantener retrocompatibilidad
    try {
      fs.copyFileSync(outputPath, path.join(projectDir, 'final_video.mp4'));
    } catch (copyErr) {
      console.warn('[Render] No se pudo copiar a final_video.mp4:', copyErr);
    }

    // Copiar también a out/DocumentaryVideo_${targetLang}.mp4 y out/DocumentaryVideo.mp4 para conveniencia
    try {
      const outDir = path.resolve(rootDir, 'out');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(outputPath, path.join(outDir, `DocumentaryVideo_${targetLang}.mp4`));
      fs.copyFileSync(outputPath, path.join(outDir, 'DocumentaryVideo.mp4'));
    } catch (copyErr) {
      console.warn('[Render] No se pudo copiar a out/:', copyErr);
    }

    // 3. Actualizar estado y rutas bilingües en el proyecto (con timestamp para cache busting)
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

    if (project.story_id) {
      await StoryBacklogService.updateStory(project.channel_id, project.story_id, {
        status: 'completed',
        finished: true,
        linkedProjectId: project.project_id,
      });
    } else {
      // Sincronizar historias del canal para que detecte el proyecto completado
      await StoryBacklogService.getStories(project.channel_id, false);
    }

    JobProgressService.completeJob(
      job.jobId,
      `¡Video MP4 1080p (${targetLang.toUpperCase()}) renderizado con éxito!`,
      `Archivo disponible en ${versionedUrl}`
    );

    res.json({
      success: true,
      project,
      outputVideoUrl: versionedUrl,
      outputVideoUrlEs: project.outputVideoUrlEs,
      outputVideoUrlEn: project.outputVideoUrlEn,
      renderedLanguage: targetLang,
    });
  } catch (error: any) {
    console.error('Error renderizando video:', error);
    JobProgressService.failJob(job.jobId, error.message || 'Error en el renderizado');
    res.status(500).json({ error: error.message || 'Error en el renderizado' });
  }
});

// ============================================================================
// 7. EMPAQUE YOUTUBE & GENERACIÓN DE MINIATURAS (Thumbnail Studio & SEO Suite)
// ============================================================================

app.post('/api/youtube/metadata/generate', async (req, res) => {
  try {
    const { projectId, channelId } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const channel = PersonaService.getPersona(channelId || project.channel_id);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    console.log(`[API] Generando empaque SEO para proyecto: ${project.title}`);
    const metadata = await YouTubeService.generateYouTubeMetadata(project, channel);

    project.youtubeMetadata = metadata;
    if (metadata.selectedTitle) {
      project.title = metadata.selectedTitle;
    }
    ProjectService.saveProject(project);

    res.json({ success: true, metadata, project });
  } catch (err: any) {
    console.error('[API] Error generando metadata de YouTube:', err);
    res.status(500).json({ error: err.message || 'Error generando metadata' });
  }
});

app.post('/api/youtube/thumbnail/generate-background', async (req, res) => {
  try {
    const { projectId, channelId, prompt } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const channel = PersonaService.getPersona(channelId || project.channel_id);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    console.log(`[API] Generando fondo con IA para miniatura: ${project.title}`);
    const result = await YouTubeService.generateThumbnailBackground(project, channel, prompt);

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API] Error generando fondo de miniatura:', err);
    res.status(500).json({ error: err.message || 'Error generando fondo' });
  }
});

app.post('/api/youtube/thumbnail/save', async (req, res) => {
  try {
    const { projectId, base64Image, metadata, thumbnailConfig } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    console.log(`[API] Guardando miniatura final para proyecto: ${project.project_id}`);
    const saved = YouTubeService.saveThumbnail(projectId, base64Image);

    project.thumbnailUrl = saved.publicUrl;
    if (metadata) {
      project.youtubeMetadata = {
        ...(project.youtubeMetadata || {}),
        ...metadata,
        thumbnailConfig: thumbnailConfig || metadata.thumbnailConfig,
      };
    }
    ProjectService.saveProject(project);

    res.json({
      success: true,
      thumbnailUrl: saved.publicUrl,
      project,
    });
  } catch (err: any) {
    console.error('[API] Error guardando miniatura:', err);
    res.status(500).json({ error: err.message || 'Error guardando miniatura' });
  }
});

// 7.1 Generación de Subtítulos Oficiales (.srt / .vtt) en Inglés y Español para YouTube CC
app.post('/api/youtube/subtitles/generate', async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    console.log(`[Subtitles] Generando subtítulos oficiales para ${projectId}...`);

    // 1. Subtítulos en Inglés (Master)
    const cuesEn = SubtitleService.generateProjectCues(project);
    const subEn = SubtitleService.saveProjectSubtitles(projectId, 'en', cuesEn);
    project.subtitlesEnUrl = subEn.srtUrl;

    // 2. Subtítulos en Español
    // Si existen escenas traducidas en project.scenes_es, usamos sus textos
    let cuesEs = cuesEn;
    if (project.scenes_es && project.scenes_es.length > 0) {
      const mergedScenesForEs = project.scenes.map((s, idx) => ({
        ...s,
        voiceover: project.scenes_es?.[idx]?.voiceover_es || s.voiceover,
        wordTimings: project.scenes_es?.[idx]?.wordTimings,
      }));
      cuesEs = SubtitleService.generateProjectCues(project, mergedScenesForEs);
    }
    const subEs = SubtitleService.saveProjectSubtitles(projectId, 'es', cuesEs);
    project.subtitlesEsUrl = subEs.srtUrl;

    ProjectService.saveProject(project);

    res.json({
      success: true,
      subtitlesEn: subEn,
      subtitlesEs: subEs,
      project,
    });
  } catch (err: any) {
    console.error('[Subtitles] Error generando subtítulos:', err);
    res.status(500).json({ error: err.message || 'Error generando subtítulos' });
  }
});

// 7.2 Generación y Sincronización de Pista de Doblaje en Español (Audio Track -14 LUFS)
app.post('/api/youtube/dubbing/generate', async (req, res) => {
  const { projectId, preferredVoiceProvider } = req.body;
  const project = ProjectService.getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  const channel = PersonaService.getPersona(project.channel_id);

  const job = JobProgressService.createJob({
    type: 'audio',
    title: `Generando Doblaje en Español: ${project.title.slice(0, 35)}`,
    projectId,
    channelId: project.channel_id,
    phase: 'Traduciendo guion y sincronizando locución...',
    totalSteps: project.scenes.length + 2,
  });

  try {
    const projectDir = path.resolve(__dirname, `../storage/projects/${projectId}`);

    // 1. Traducir escenas al español solo si no existen previamente
    if (!project.scenes_es || project.scenes_es.length === 0) {
      JobProgressService.updateJob(job.jobId, {
        percent: 10,
        phase: 'Traduciendo y adaptando locución cinematográfica al español...',
      });
      const translated = await TranslationService.translateScenes(project.scenes, 'es', channel || undefined);
      project.scenes_es = translated;
      ProjectService.saveProject(project);
    }

    const provider = preferredVoiceProvider || 'edge';
    const totalScenes = project.scenes.length;
    const forceRegenerate = req.body.forceRegenerate === true;

    // 2. Generar o reutilizar audio para cada escena en español
    for (let i = 0; i < totalScenes; i++) {
      const scene = project.scenes[i];
      const sceneEs = project.scenes_es[i];
      const voiceoverText = sceneEs?.voiceover_es || scene.voiceover;

      const dubAudioDir = path.join(projectDir, 'audio_es');
      if (!fs.existsSync(dubAudioDir)) {
        try { fs.mkdirSync(dubAudioDir, { recursive: true }); } catch {}
      }
      const dubFilePath = path.join(dubAudioDir, `scene_${scene.scene_id}.mp3`);
      const origFilePath = path.join(projectDir, 'audio', `scene_${scene.scene_id}.mp3`);

      // Si existe audio en audio/ y no en audio_es/, copiarlo para reutilizarlo
      if (!fs.existsSync(dubFilePath) && fs.existsSync(origFilePath) && (!project.language || project.language === 'es' || sceneEs?.audioUrl?.includes(`/audio/scene_${scene.scene_id}.mp3`))) {
        try {
          fs.copyFileSync(origFilePath, dubFilePath);
        } catch {}
      }

      let audioRes;
      const fileAlreadyExists = fs.existsSync(dubFilePath);

      if (fileAlreadyExists && !forceRegenerate) {
        const probedDur = (await AudioService.probeAudioDuration(dubFilePath)) || sceneEs?.audioDurationSeconds || scene.durationInSeconds;
        audioRes = {
          audioUrl: `/storage/${projectId}/audio_es/scene_${scene.scene_id}.mp3`,
          durationInSeconds: probedDur,
          wordTimings: sceneEs?.wordTimings && sceneEs.wordTimings.length > 0
            ? sceneEs.wordTimings
            : AudioService.alignWordsToExactDuration(voiceoverText, probedDur),
          providerUsed: 'voicestudio' as any,
        };
      } else {
        JobProgressService.updateJob(job.jobId, {
          percent: 15 + Math.round(((i + 1) / totalScenes) * 65),
          currentStep: i + 1,
          totalSteps: totalScenes,
          phase: `Sintetizando escena ${scene.scene_id}/${totalScenes} en español...`,
          detail: voiceoverText.slice(0, 50) + '...',
        });

        audioRes = await AudioService.generateDubSceneAudio(
          projectId,
          scene.scene_id,
          voiceoverText,
          project.channel_id,
          provider,
          project.primaryVoice
        );
      }

      if (sceneEs) {
        sceneEs.audioUrl = audioRes.audioUrl;
        sceneEs.wordTimings = audioRes.wordTimings;
        sceneEs.audioDurationSeconds = audioRes.durationInSeconds;
      }
    }

    // Sincronizar duraciones bilingües antes del empaquetado final
    await AudioService.synchronizeBilingualDurations(project);
    ProjectService.saveProject(project);

    // 3. Concatenar y normalizar a -14 LUFS con FFmpeg
    JobProgressService.updateJob(job.jobId, {
      percent: 88,
      phase: 'Concatenando y normalizando audio a -14 LUFS para YouTube...',
      detail: 'Alineando tiempos exactos escena por escena',
    });

    const stitched = await AudioService.stitchAudioTrack(
      projectId,
      project.scenes,
      'es'
    );

    project.spanishAudioUrl = stitched.audioUrl;

    // 4. Regenerar también los subtítulos en español con los nuevos timings
    const mergedScenesForEs = project.scenes.map((s, idx) => ({
      ...s,
      voiceover: project.scenes_es?.[idx]?.voiceover_es || s.voiceover,
      wordTimings: project.scenes_es?.[idx]?.wordTimings,
    }));
    const cuesEs = SubtitleService.generateProjectCues(project, mergedScenesForEs);
    const subEs = SubtitleService.saveProjectSubtitles(projectId, 'es', cuesEs);
    project.subtitlesEsUrl = subEs.srtUrl;

    ProjectService.saveProject(project);

    JobProgressService.completeJob(
      job.jobId,
      '¡Pista de doblaje en español y subtítulos generados con éxito!',
      `Pista lista: ${stitched.audioUrl}`
    );

    res.json({
      success: true,
      spanishAudioUrl: stitched.audioUrl,
      duration: stitched.duration,
      project,
    });
  } catch (err: any) {
    console.error('[Dubbing] Error generando doblaje en español:', err);
    JobProgressService.failJob(job.jobId, err.message || 'Error en doblaje');
    res.status(500).json({ error: err.message || 'Error en doblaje' });
  }
});

// 7.3 Generación del Paquete Maestro YouTube (Opción 1)
app.post('/api/youtube/bundle/generate', (req, res) => {
  try {
    const { projectId } = req.body;
    const project = ProjectService.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const channel = PersonaService.getPersona(project.channel_id);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });

    console.log(`[YouTube Bundle] Generando paquete maestro para ${projectId}...`);
    const bundle = YouTubeService.generateYouTubeBundle(project, channel);

    res.json({
      success: true,
      bundle,
    });
  } catch (err: any) {
    console.error('[YouTube Bundle] Error generando paquete:', err);
    res.status(500).json({ error: err.message || 'Error generando paquete' });
  }
});

// ============================================================================
// 8. INCUBADORA DE CANALES & AUDITORÍA ESTRATÉGICA DE CRECIMIENTO IA
// ============================================================================

app.post('/api/channels/incubator/brainstorm', async (req, res) => {
  try {
    const { topic, preferredTone, language } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'El tema o nicho es requerido' });
    }
    console.log(`[Incubator] Incubando propuesta de canal para: "${topic}"`);
    const concept = await ChannelStrategyService.incubateChannelStrategy(
      topic,
      preferredTone,
      language
    );
    res.json({ success: true, concept });
  } catch (err: any) {
    console.error('[Incubator API] Error incubando canal:', err);
    res.status(500).json({ error: err.message || 'Error en la incubación' });
  }
});

app.post('/api/channels/incubator/generate-asset', async (req, res) => {
  try {
    const { channelId, type, prompt, aesthetic } = req.body;
    if (!channelId || !type || !prompt) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    const result = await ChannelStrategyService.generateBrandAsset(
      channelId,
      type,
      prompt,
      aesthetic
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Incubator API] Error generando asset:', err);
    res.status(500).json({ error: err.message || 'Error generando asset' });
  }
});

app.post('/api/channels/incubator/create-full', async (req, res) => {
  try {
    const { persona, launchBatch } = req.body;
    if (!persona || !persona.name) {
      return res.status(400).json({ error: 'Datos de persona incompletos' });
    }
    const result = await ChannelStrategyService.createChannelWithLaunchBatch(
      persona,
      launchBatch
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Incubator API] Error creando canal oficial:', err);
    res.status(500).json({ error: err.message || 'Error creando canal' });
  }
});

app.get('/api/channels/:channelId/audit', async (req, res) => {
  try {
    const { channelId } = req.params;
    const force = req.query.force === 'true';
    if (!force) {
      const cached = ChannelStrategyService.getSavedAuditReport(channelId);
      if (cached) {
        return res.json({ success: true, report: cached, cached: true });
      }
    }
    const report = await ChannelStrategyService.auditChannel(channelId);
    res.json({ success: true, report, cached: false });
  } catch (err: any) {
    console.error('[Audit API] Error auditando canal:', err);
    res.status(500).json({ error: err.message || 'Error auditando canal' });
  }
});

app.post('/api/channels/:channelId/audit', async (req, res) => {
  try {
    const { channelId } = req.params;
    const report = await ChannelStrategyService.auditChannel(channelId);
    res.json({ success: true, report, cached: false });
  } catch (err: any) {
    console.error('[Audit API] Error forzando auditoría:', err);
    res.status(500).json({ error: err.message || 'Error auditando canal' });
  }
});

app.post('/api/channels/:channelId/inject-hit', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { recommendation } = req.body;
    if (!recommendation || !recommendation.title) {
      return res.status(400).json({ error: 'Recomendación inválida' });
    }
    const story = await ChannelStrategyService.injectHitStory(channelId, recommendation);
    res.json({ success: true, story });
  } catch (err: any) {
    console.error('[Audit API] Error inyectando historia:', err);
    res.status(500).json({ error: err.message || 'Error inyectando historia' });
  }
});

app.listen(PORT, () => {
  console.log(`[API Server] Corriendo en http://localhost:${PORT}`);
});



