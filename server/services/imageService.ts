import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { VisualArcService } from './visualArcService.ts';
import { CharacterService } from './characterService.ts';
import type { CharacterProfile, ShotType } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');
const CHANNELS_DIR = path.resolve(__dirname, '../../channels');

export const CHARACTER_STYLE_PRESETS: Record<
  string,
  { id: string; label: string; prompt: string; description: string }
> = {
  '3d_pixar_arcane': {
    id: '3d_pixar_arcane',
    label: 'Pixar & Arcane 3D (Documental Premium)',
    description: 'Estilo 3D estilizado de alta gama, iluminación volumétrica de estudio y acabados CGI cinematográficos.',
    prompt:
      'Masterpiece 3D stylized character design in high-end Pixar and Arcane 3D documentary animation aesthetic. Expressive stylized facial geometry, subtle subsurface skin scattering, volumetric studio rim lighting, cinematic depth, 8k render, Unreal Engine 5 look.',
  },
  'cinematic_realism': {
    id: 'cinematic_realism',
    label: 'Cine Hiperrealista 8K',
    description: 'Fotografía documental de 85mm con microtexturas reales e iluminación naturalista.',
    prompt:
      'Cinematic hyperrealistic 8k film still, dramatic volumetric lighting, Hasselblad 85mm portrait photography, authentic skin pores and micro-textures, cinematic documentary color grading.',
  },
  'stylized_concept_art': {
    id: 'stylized_concept_art',
    label: 'Concept Art Cinematográfico',
    description: 'Pintura digital de producción cinematográfica, pincelada artística refinada y atmósfera dramática.',
    prompt:
      'Cinematic digital concept art, dramatic brushwork and refined lighting, character design bible quality, ArtStation trending, atmospheric rim light.',
  },
  'modern_anime_hybrid': {
    id: 'modern_anime_hybrid',
    label: 'Anime / Ilustración 3D Híbrida',
    description: 'Líneas limpias expresivas con profundidad tridimensional e iluminación atmosférica.',
    prompt:
      'Modern cinematic anime aesthetic with 3D depth, clean expressive linework, subtle cell shading and luminous atmospheric lighting, Makoto Shinkai and Studio Wit aesthetic.',
  },
  'vintage_retro_doc': {
    id: 'vintage_retro_doc',
    label: 'Documental Histórico / Retro',
    description: 'Estética de archivo histórico, grano analógico sutil e iluminación claroscuro atemporal.',
    prompt:
      'Textured vintage historical aesthetic, rich archival tone, subtle analog film grain, dramatic chiaroscuro Rembrandt lighting, timeless character depth.',
  },
};

export class ImageService {
  /**
   * Resuelve la imagen canónica del personaje en disco (si existe y es raster) para enviarla como referencia multimodal
   */
  static resolveCharacterReferenceBase64(
    character?: CharacterProfile
  ): { base64: string; mimeType: string } | null {
    if (!character?.canonical_image_url) return null;
    return CharacterService.resolveImageFileBase64(character.canonical_image_url);
  }

  /**
   * Inicializa el cliente oficial de Google GenAI soportando tanto Google AI Studio como
   * Google Cloud Vertex AI (para aprovechar los $300 USD de crédito de prueba gratuita en GCP).
   */
  static getGoogleGenAIClient(): {
    ai: GoogleGenAI;
    isVertex: boolean;
    projectId?: string;
    location?: string;
  } | null {
    dotenv.config({ override: true });
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    let gcpProject = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || '').trim();
    const gcpLocation = (process.env.GOOGLE_CLOUD_LOCATION || 'us-central1').trim();
    const credPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

    // Detección automática de archivo de credenciales de Service Account
    let serviceAccountData: any = null;
    let resolvedCredPath = '';

    if (credPath) {
      resolvedCredPath = path.isAbsolute(credPath)
        ? credPath
        : path.resolve(__dirname, '../../', credPath);
    } else {
      const defaultCredPath = path.resolve(__dirname, '../../gcp-credentials.json');
      if (fs.existsSync(defaultCredPath)) {
        resolvedCredPath = defaultCredPath;
      }
    }

    if (resolvedCredPath && fs.existsSync(resolvedCredPath)) {
      try {
        serviceAccountData = JSON.parse(fs.readFileSync(resolvedCredPath, 'utf-8'));
        if (!gcpProject && serviceAccountData.project_id) {
          gcpProject = serviceAccountData.project_id;
          process.env.GOOGLE_CLOUD_PROJECT = gcpProject;
        }
        console.log(`[Google Cloud Vertex AI] ✓ Usando Service Account JSON (${gcpProject}) desde: ${resolvedCredPath}`);
      } catch (e: any) {
        console.warn(`[Google Cloud Vertex AI] Error leyendo archivo de credenciales: ${e.message}`);
      }
    }

    const useVertex =
      process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ||
      Boolean(gcpProject) ||
      Boolean(serviceAccountData);

    if (useVertex) {
      const options: any = {
        vertexai: true,
        project: gcpProject || undefined,
        location: gcpLocation || 'us-central1',
      };

      if (serviceAccountData) {
        options.googleAuthOptions = { credentials: serviceAccountData };
        // Cuando se usa Service Account, la autenticación OAuth2 de GCP prevalece
      } else if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
        options.apiKey = geminiKey;
      }

      return {
        ai: new GoogleGenAI(options),
        isVertex: true,
        projectId: gcpProject,
        location: gcpLocation,
      };
    }

    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      return {
        ai: new GoogleGenAI({ apiKey: geminiKey }),
        isVertex: false,
      };
    }

    return null;
  }

  /**
   * Genera imágenes con Google GenAI / Vertex AI.
   * Soporta generación multimodal basada en imagen de referencia (para transferir facciones reales sin alucinación)
   * y generación de alta fidelidad con Nano Banana (gemini-2.5-flash-image) e Imagen 3 (imagen-3.0-generate-002).
   */
  /**
   * Intento individual de generar imagen con Google GenAI / Vertex AI.
   */
  private static async attemptGenerateImageWithGoogle(
    prompt: string,
    options: {
      refImage?: { base64: string; mimeType: string } | null;
      refImages?: Array<{ base64: string; mimeType: string; charName?: string }>;
      aspectRatio?: '16:9' | '1:1';
      isPortrait?: boolean;
    } = {}
  ): Promise<{ buffer: Buffer; modelUsed: string } | { error: string }> {
    const clientInfo = this.getGoogleGenAIClient();
    if (!clientInfo) {
      return { error: 'No hay configuración de Google Gemini o Vertex AI en .env' };
    }

    const { ai, isVertex } = clientInfo;
    const allRefs = options.refImages && options.refImages.length > 0
      ? options.refImages
      : options.refImage
      ? [options.refImage]
      : [];
    const is16x9 = options.aspectRatio === '16:9';

    // Modelos multimodales para preservación y transferencia facial (en Vertex AI us-central1 el modelo activo y validado es gemini-2.5-flash-image)
    const multimodalModels = isVertex
      ? ['gemini-2.5-flash-image']
      : ['gemini-2.5-flash-image'];

    let lastError = '';

    if (allRefs.length > 0) {
      const contents: any = [
        ...allRefs.slice(0, 2).map((ref) => ({
          inlineData: {
            mimeType: ref.mimeType,
            data: ref.base64,
          },
        })),
        prompt,
      ];

      for (const model of multimodalModels) {
        try {
          console.log(
            `[Google ${isVertex ? 'Vertex AI ($300 Crédito)' : 'Gemini'}] Generando con modelo multimodal ${model} (${allRefs.length} ref portrait${allRefs.length > 1 ? 's' : ''})...`
          );
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              responseModalities: ['IMAGE'],
            },
          });

          const candidate = response.candidates?.[0];
          const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
          if (imagePart?.inlineData?.data) {
            return {
              buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
              modelUsed: model,
            };
          }
        } catch (err: any) {
          lastError = err.message || String(err);
          console.warn(`[Google ${isVertex ? 'Vertex AI' : 'Gemini'}] Fallo con ${model}:`, lastError.slice(0, 160));
          if (lastError.includes('API_KEY_SERVICE_BLOCKED') || lastError.includes('RESOURCE_EXHAUSTED') || lastError.includes('429')) {
            break;
          }
        }
      }
    }

    // Texto a imagen (usando gemini-2.5-flash-image mediante generateContent)
    for (const model of multimodalModels) {
      try {
        console.log(`[Google ${isVertex ? 'Vertex AI' : 'Gemini'}] Generando con ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseModalities: ['IMAGE'],
          },
        });

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
        if (imagePart?.inlineData?.data) {
          return {
            buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
            modelUsed: model,
          };
        }
      } catch (err: any) {
        lastError = err.message || String(err);
        console.warn(`[Google ${isVertex ? 'Vertex AI' : 'Gemini'}] Fallo con ${model}:`, lastError.slice(0, 160));
        if (lastError.includes('API_KEY_SERVICE_BLOCKED') || lastError.includes('RESOURCE_EXHAUSTED') || lastError.includes('429')) {
          break;
        }
      }
    }

    return { error: lastError || 'Google GenAI no retornó datos de imagen' };
  }

  /**
   * Genera imágenes con Google GenAI / Vertex AI incorporando reintentos con backoff
   * automático en caso de saturar temporalmente la cuota por minuto (429 Rate Limit / RESOURCE_EXHAUSTED).
   */
  static async generateImageWithGoogle(
    prompt: string,
    options: {
      refImage?: { base64: string; mimeType: string } | null;
      refImages?: Array<{ base64: string; mimeType: string; charName?: string }>;
      aspectRatio?: '16:9' | '1:1';
      isPortrait?: boolean;
    } = {}
  ): Promise<{ buffer: Buffer; modelUsed: string } | { error: string }> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      const result = await this.attemptGenerateImageWithGoogle(prompt, options);
      if ('buffer' in result) {
        return result;
      }

      const err = result.error || '';
      const isRateLimit =
        err.includes('429') ||
        err.includes('RESOURCE_EXHAUSTED') ||
        err.includes('quota') ||
        err.includes('Resource has been exhausted');

      if (isRateLimit && attempt < maxRetries) {
        const waitSec = 14 + attempt * 5; // 19s intento 1, 24s intento 2
        console.warn(
          `[Google Vertex AI] ⏳ Límite de cuota por minuto alcanzado (429 Rate Limit / RPM). Esperando ${waitSec}s para renovar la ventana de cuota y preservar la calidad 16:9 HD de Google (intento ${attempt}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      return result;
    }

    return { error: 'Reintentos de cuota agotados en Google GenAI' };
  }

  /**
   * Genera una imagen utilizando la API de Agnes AI (apihub.agnes-ai.com)
   * Modelo por defecto: agnes-image-2.1-flash (o agnes-image-2.5-flash)
   * OpenAI-compatible format con soporte de 16:9 y 1:1
   */
  static async generateWithAgnesAI(
    prompt: string,
    options: {
      aspectRatio?: '16:9' | '1:1';
      size?: string;
      customModel?: string;
    } = {}
  ): Promise<Buffer | null> {
    dotenv.config({ override: true });
    const agnesKey = (process.env.AGNES_API_KEY || '').trim();
    if (!agnesKey) return null;

    const baseUrl = (process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1').replace(/\/+$/, '');
    const model = (options.customModel || process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.1-flash').trim();
    const is16x9 = options.aspectRatio === '16:9';
    const targetSize = options.size || (is16x9 ? '1792x1024' : '1024x1024');

    console.log(`[Agnes AI] 🚀 Generando imagen con ${model} (${options.aspectRatio || (is16x9 ? '16:9' : '1:1')})...`);

    const payloads = [
      {
        model,
        prompt,
        size: targetSize,
        aspect_ratio: options.aspectRatio || (is16x9 ? '16:9' : '1:1'),
        n: 1,
      },
      {
        model,
        prompt,
        size: is16x9 ? '1280x720' : '1024x1024',
        n: 1,
      },
      {
        model,
        prompt,
        size: '1024x1024',
        n: 1,
      },
    ];

    for (const bodyPayload of payloads) {
      try {
        const res = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agnesKey}`,
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          const data: any = await res.json();
          const item = data.data?.[0];
          const imgUrl = item?.url;
          const b64 = item?.b64_json || item?.image;

          if (imgUrl) {
            console.log(`[Agnes AI] ✓ Descargando imagen desde URL: ${imgUrl.slice(0, 60)}...`);
            const imgRes = await fetch(imgUrl);
            const buf = Buffer.from(await imgRes.arrayBuffer());
            if (buf.length > 1000) return buf;
          } else if (b64) {
            const clean = b64.replace(/^data:image\/\w+;base64,/, '');
            const buf = Buffer.from(clean, 'base64');
            if (buf.length > 1000) return buf;
          }
        } else {
          const errText = await res.text();
          console.warn(`[Agnes AI] Error HTTP ${res.status}: ${errText.slice(0, 180)}`);
          if (res.status === 401) break;
        }
      } catch (err: any) {
        console.warn(`[Agnes AI] Excepción: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Genera un retrato oficial (Concept Art 3D) del personaje antes de crear las escenas del video.
   * Si se dispone de una foto real de frente, se envía a la IA multimodal para capturar sus facciones exactas sin alucinar,
   * enfocando el prompt en el estilo artístico deseado (Pixar 3D, Realista, etc.).
   */
  static async generateCharacterPortrait(
    channelId: string,
    character: CharacterProfile,
    options?: {
      customStyle?: string;
      stylePreset?: string;
      realReferenceBase64?: string;
    }
  ): Promise<CharacterProfile> {
    dotenv.config({ override: true });

    // Si se envió una nueva foto de referencia en base64, guardarla primero
    let activeChar = character;
    if (options?.realReferenceBase64) {
      const savedWithRef = CharacterService.saveRealReferenceImage(
        channelId,
        character.character_id,
        options.realReferenceBase64
      );
      if (savedWithRef) activeChar = savedWithRef;
    }

    const assetsDir = CharacterService.getChannelCharacterAssetsDir(channelId);
    const timestamp = Date.now();
    const imageFilename = `${activeChar.character_id}_ai_${timestamp}.jpg`;
    const imagePath = path.join(assetsDir, imageFilename);
    const publicUrl = `/channel-assets/${channelId}/characters/assets/${imageFilename}`;

    const loreQuirks = activeChar.channel_lore?.peculiarities?.length
      ? `Distinctive recurring character traits: ${activeChar.channel_lore.peculiarities.join(', ')}.`
      : '';

    // Determinar estilo seleccionado y notas adicionales
    const selectedPresetKey =
      options?.stylePreset || activeChar.preferred_style_preset || '3d_pixar_arcane';
    const preset =
      CHARACTER_STYLE_PRESETS[selectedPresetKey] || CHARACTER_STYLE_PRESETS['3d_pixar_arcane'];
    const customStyle = options?.customStyle ?? activeChar.custom_style_prompt ?? '';

    // Verificar si existe foto real de frente de referencia
    const refImage = activeChar.real_reference_image_url
      ? CharacterService.resolveImageFileBase64(activeChar.real_reference_image_url)
      : null;

    const isCompany =
      activeChar.character_category === 'company_or_brand' ||
      activeChar.entity_type === 'company' ||
      CharacterService.isCompanyOrBrandEntity(activeChar.name);

    const ageDetail = activeChar.age ? `Specific age / life era: ${activeChar.age}.` : '';

    let portraitPrompt = '';
    if (isCompany) {
      if (refImage) {
        // PROMPT GUIADO POR LOGO O FOTO DE SEDE DE LA EMPRESA
        portraitPrompt = [
          `TRANSFORM THE ATTACHED REFERENCE PHOTO / LOGO OF THE COMPANY ${activeChar.name} into an iconic 3D stylized centerpiece:`,
          `ARTISTIC STYLE TARGET: ${preset.prompt}`,
          customStyle ? `ADDITIONAL AESTHETIC DIRECTIVES: ${customStyle}.` : '',
          `IDENTITY DIRECTIVE: Faithfully translate the recognizable branding, signature colors, architectural facade or logo geometry of ${activeChar.name} from the reference into this artistic 3D style. Do NOT generate a human face. This is an iconic company headquarters campus or stylized 3D brand centerpiece.`,
          `COMPOSITION: Iconic centerpiece representation of ${activeChar.name} (sleek modern corporate headquarters or stylized 3D emblem with cinematic volumetric lighting and ambient documentary tech environment).`,
          activeChar.signature_props?.length
            ? `Signature visual elements: ${activeChar.signature_props.join(', ')}.`
            : '',
          `STUDIO POLISH: Volumetric rim lighting, dramatic architectural illumination, clean documentary backdrop, 8k render, Unreal Engine 5 look.`,
        ]
          .filter(Boolean)
          .join(' ');
        console.log(
          `[Character Studio] 🏢 Generando imagen oficial 3D asistida por LOGO/SEDE DE REFERENCIA para la empresa "${activeChar.name}" (${preset.label})...`
        );
      } else {
        // PROMPT GENERATIVO DE TEXTO PARA EMPRESA
        portraitPrompt = [
          `Masterpiece 3D stylized cinematic visual representation of ${activeChar.name} (${activeChar.role}).`,
          activeChar.anchor_prompt,
          `STYLE: ${preset.prompt}`,
          customStyle ? `STYLE DIRECTIVES: ${customStyle}.` : '',
          `COMPOSITION: Iconic centerpiece representation of the company / brand ${activeChar.name}, modern architectural campus or bold 3D company motif, volumetric dramatic studio lighting, 8k documentary render, clean presentation, NO random human face in center.`,
          activeChar.signature_props?.length
            ? `Key visual motifs: ${activeChar.signature_props.join(', ')}.`
            : '',
        ]
          .filter(Boolean)
          .join(' ');
        console.log(
          `[Character Studio] 🏢 Generando imagen oficial 3D (sin foto) para la empresa "${activeChar.name}" (${preset.label})...`
        );
      }
    } else if (refImage) {
      // PROMPT GUIADO POR FOTO REAL HUMANA: Se enfoca en estilo deseado y fidelidad de facciones para evitar alucinaciones
      portraitPrompt = [
        `TRANSFORM THE REAL PERSON SHOWN IN THE ATTACHED REFERENCE PHOTO into an individual stylized character portrait:`,
        `ARTISTIC STYLE TARGET: ${preset.prompt}`,
        customStyle ? `ADDITIONAL AESTHETIC DIRECTIVES: ${customStyle}.` : '',
        ageDetail,
        `FACIAL LIKENESS DIRECTIVE: Strictly preserve and capture the identifiable facial likeness, facial bone geometry, eye shape, nose structure, lips, jawline, hair color, haircut and beard/mustache of the real human in the reference photograph. Do NOT invent a different person. Faithfully translate their real-world features into this artistic style.`,
        `COMPOSITION & POSING: Strictly ONE SINGLE INDIVIDUAL PERSON IN FRAME (solo centered front-facing bust portrait of ${activeChar.name} alone, looking directly towards the viewer, NO second person, NO background crowd, NO split screen). Direct confident gaze.`,
        loreQuirks,
        activeChar.signature_props?.length
          ? `Signature accessories: ${activeChar.signature_props.join(', ')}.`
          : '',
        `STUDIO POLISH: Volumetric rim lighting, dramatic three-point studio lighting, deep clean documentary backdrop, 8k render, Unreal Engine 5 look, NO text, NO watermarks.`,
      ]
        .filter(Boolean)
        .join(' ');
      console.log(
        `[Character Studio] 📸 Generando retrato con IA asistido por FOTO REAL DE FRENTE para "${activeChar.name}" (${preset.label})...`
      );
    } else {
      // PROMPT GENERATIVO DE TEXTO PARA PERSONA (para figuras muy conocidas o personajes de Lore sin foto real)
      portraitPrompt = [
        `Masterpiece solo character portrait of ${activeChar.name} (${activeChar.role}).`,
        ageDetail,
        activeChar.anchor_prompt,
        `STYLE: ${preset.prompt}`,
        customStyle ? `STYLE DIRECTIVES: ${customStyle}.` : '',
        loreQuirks,
        activeChar.signature_props?.length
          ? `Subtle signature elements: ${activeChar.signature_props.join(', ')}.`
          : '',
        `COMPOSITION: STRICTLY ONE SINGLE INDIVIDUAL PERSON IN FRAME (solo centered bust portrait of ${activeChar.name} alone, NO second person, NO group, NO split screen), expressive facial structure, dramatic studio volumetric rim lighting, 8k render, NO text, NO watermarks.`,
      ]
        .filter(Boolean)
        .join(' ');
      console.log(
        `[Character Studio] 🎨 Generando retrato con IA (sin foto real) para "${activeChar.name}" (${preset.label})...`
      );
    }

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const agnesKey = (process.env.AGNES_API_KEY || '').trim();

    let generated = false;
    let lastGoogleError = '';

    // 0. GOOGLE CLOUD VERTEX AI / GEMINI (PRIORIDAD NÚMERO 1: Máxima calidad, usa los $300 USD de crédito y entrada multimodal)
    const googleClient = ImageService.getGoogleGenAIClient();
    if (googleClient && !generated) {
      try {
        console.log(`[Character Studio] Generando retrato oficial con Google ${googleClient.isVertex ? 'Vertex AI ($300 Crédito)' : 'Gemini'}...`);
        const res = await ImageService.generateImageWithGoogle(portraitPrompt, {
          refImage,
          aspectRatio: '1:1',
          isPortrait: true,
        });
        if ('buffer' in res && res.buffer) {
          fs.writeFileSync(imagePath, res.buffer);
          generated = true;
          console.log(`[Character Studio] ✓ Retrato guardado con Google ${googleClient.isVertex ? 'Vertex AI' : 'Gemini'} (${res.modelUsed}) en ${imagePath}`);
        } else if ('error' in res) {
          lastGoogleError = res.error;
        }
      } catch (err: any) {
        lastGoogleError = err.message || String(err);
        console.warn(`[Character Studio] Google Vertex AI aviso:`, lastGoogleError);
      }
    }

    // 1. OpenRouter (Gemini 3.1 Flash Image) con soporte multimodal de foto de referencia
    if (openrouterKey && !generated) {
      try {
        console.log(`[Character Studio] Generando con OpenRouter (Gemini 3.1 Flash Image)...`);
        const userContent: any = refImage
          ? [
              { type: 'text', text: portraitPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${refImage.mimeType};base64,${refImage.base64}`,
                },
              },
            ]
          : portraitPrompt;

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Studio Multi-Canal',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image',
            messages: [{ role: 'user', content: userContent }],
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const msg = data.choices?.[0]?.message;
          let b64: string | null = null;
          if (msg?.images && msg.images.length > 0) {
            const imgUrl = msg.images[0].image_url?.url || '';
            if (imgUrl.startsWith('data:image/')) {
              b64 = imgUrl.split(',')[1];
            } else if (imgUrl.startsWith('http')) {
              const imgRes = await fetch(imgUrl);
              fs.writeFileSync(imagePath, Buffer.from(await imgRes.arrayBuffer()));
              generated = true;
            }
          } else if (msg?.parts) {
            const part = msg.parts.find((p: any) => p.inlineData);
            if (part?.inlineData?.data) b64 = part.inlineData.data;
          }
          if (b64) {
            fs.writeFileSync(imagePath, Buffer.from(b64, 'base64'));
            generated = true;
          }
        }
      } catch (err: any) {
        console.warn(`[Character Studio] OpenRouter aviso: ${err.message}`);
      }
    }

    // 2. Agnes AI (Si está configurada y no hay foto de referencia real que requiera multimodal nativo)
    if (agnesKey && !refImage && !generated) {
      try {
        console.log(`[Character Studio] Generando retrato con Agnes AI (${process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.1-flash'})...`);
        const buf = await ImageService.generateWithAgnesAI(portraitPrompt, {
          aspectRatio: '1:1',
          size: '1024x1024',
        });
        if (buf && buf.length > 1000) {
          fs.writeFileSync(imagePath, buf);
          generated = true;
          console.log(`[Character Studio] ✓ Retrato guardado con Agnes AI en ${imagePath}`);
        }
      } catch (err: any) {
        console.warn(`[Character Studio] Agnes AI aviso: ${err.message}`);
      }
    }

    // 3. OpenAI Image (DALL-E 3) solo para personajes sin foto real
    if (openaiKey && openaiKey.startsWith('sk-') && !refImage && !generated) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1-mini',
            prompt: portraitPrompt.slice(0, 950),
            n: 1,
            size: '1024x1024',
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const imgUrl = data.data?.[0]?.url;
          const b64 = data.data?.[0]?.b64_json;
          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            fs.writeFileSync(imagePath, Buffer.from(await imgRes.arrayBuffer()));
            generated = true;
          } else if (b64) {
            fs.writeFileSync(imagePath, Buffer.from(b64, 'base64'));
            generated = true;
          }
        }
      } catch (err: any) {
        console.warn(`[Character Studio] OpenAI aviso: ${err.message}`);
      }
    }

    // CRITICAL: SI HAY FOTO DE REFERENCIA REAL Y FALLARON LOS MOTORES OFICIALES MULTIMODALES,
    // NUNCA DEGRADAR A FLUX/POLLINATIONS PORQUE NO TIENE ACCESO A LA FOTO Y CREA UN PERSONAJE AL AZAR.
    if (refImage && !generated) {
      let helpfulTip = '';
      if (lastGoogleError.includes('API_KEY_SERVICE_BLOCKED')) {
        helpfulTip = 'Tu clave API de Google Cloud tiene restricciones activas. Ve a Google Cloud Console > APIs y Servicios > Credenciales > tu clave API > Restricciones de API > Selecciona "No restringir la clave" o añade "Vertex AI API" a las permitidas.';
      } else if (lastGoogleError.includes('RESOURCE_EXHAUSTED') || lastGoogleError.includes('credits are depleted')) {
        helpfulTip = 'Tu cuenta de AI Studio no tiene créditos prepagos. Para activar tus $300 USD de crédito de Google Cloud en Vertex AI, ve al modal de Vertex AI arriba y configura tu Project ID de GCP.';
      } else if (lastGoogleError.includes('PERMISSION_DENIED') || lastGoogleError.includes('blocked')) {
        helpfulTip = 'La API de Vertex AI (aiplatform.googleapis.com) debe ser habilitada en tu proyecto de Google Cloud Console.';
      }

      throw new Error(
        `No se pudo generar el retrato fiel a partir de la foto real de "${activeChar.name}".\n\n` +
        `Google Vertex AI reportó: ${lastGoogleError || 'No autorizado o sin cuota'}.\n` +
        (helpfulTip ? `\n💡 Solución: ${helpfulTip}` : '')
      );
    }

    // 4. Flux Clean Engine SOLO para personajes sin foto real (arquetipos/lore)
    if (!generated) {
      try {
        const cleanPrompt = encodeURIComponent(portraitPrompt.replace(/["\n\r]/g, ' ').slice(0, 480));
        const seed = Math.abs(
          activeChar.character_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 2026)
        );
        const fluxUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
        generated = await new Promise<boolean>((resolve) => {
          const fileStream = fs.createWriteStream(imagePath);
          https
            .get(fluxUrl, { timeout: 30000 }, (res) => {
              if (res.statusCode === 200) {
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  resolve(fs.existsSync(imagePath) && fs.statSync(imagePath).size > 1000);
                });
              } else {
                resolve(false);
              }
            })
            .on('error', () => resolve(false));
        });
      } catch {
        generated = false;
      }
    }

    let finalUrl = publicUrl;
    if (!generated) {
      // Fallback SVG Retrato de Estudio
      const svgFilename = `${activeChar.character_id}_ai_${timestamp}.svg`;
      const svgPath = path.join(assetsDir, svgFilename);
      const svgPortrait = `<svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="pbg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#pbg)" />
  <circle cx="400" cy="290" r="115" fill="#334155" stroke="#38bdf8" stroke-width="3" />
  <path d="M 220 620 C 220 460, 580 460, 580 620 Z" fill="#334155" stroke="#38bdf8" stroke-width="3" />
  <text x="400" y="690" text-anchor="middle" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="#ffffff">${activeChar.name}</text>
  <text x="400" y="730" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="#38bdf8">${activeChar.role}</text>
</svg>`;
      fs.writeFileSync(svgPath, svgPortrait, 'utf-8');
      finalUrl = `/channel-assets/${channelId}/characters/assets/${svgFilename}`;
    }

    const updated: CharacterProfile = {
      ...activeChar,
      canonical_image_url: finalUrl,
      custom_uploaded: false,
      portrait_approved: true,
      preferred_style_preset: selectedPresetKey,
      custom_style_prompt: customStyle,
      reference_gallery: [
        finalUrl,
        ...(activeChar.reference_gallery || []).filter((u) => u !== finalUrl),
      ].slice(0, 24),
      updatedAt: new Date().toISOString(),
    };

    return CharacterService.saveCharacter(channelId, updated);
  }

  /**
   * Permite al usuario subir su propia imagen para reemplazar o establecer una escena específica
   */
  static saveCustomSceneImage(projectId: string, sceneId: number, base64Data: string): string {
    const projectDir = path.join(STORAGE_DIR, projectId, 'images');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    let ext = 'jpg';
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:image/')) {
      const match = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        cleanBase64 = match[2];
      } else {
        cleanBase64 = base64Data.split(',')[1] || base64Data;
      }
    }

    const filename = `scene_${sceneId}_custom_${Date.now()}.${ext}`;
    const filePath = path.join(projectDir, filename);
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    return `/storage/${projectId}/images/${filename}`;
  }

  static async generateSceneImage(
    projectId: string,
    sceneId: number,
    sceneActionPrompt: string,
    chapter: string,
    channelId: string,
    characterOrCast?: CharacterProfile | CharacterProfile[],
    totalScenes: number = 24,
    customArtStyle?: string,
    shotType?: ShotType
  ): Promise<string> {
    dotenv.config({ override: true });

    const projectDir = path.join(STORAGE_DIR, projectId, 'images');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const imageFilename = `scene_${sceneId}.jpg`;
    const imagePath = path.join(projectDir, imageFilename);

    const sceneCharacters: CharacterProfile[] = Array.isArray(characterOrCast)
      ? characterOrCast.filter(Boolean)
      : characterOrCast
      ? [characterOrCast]
      : [];
    const primaryChar = sceneCharacters[0];

    // 1. Construir prompt enriquecido con Arco Emocional, Tipo de Plano y Personajes de la escena
    const { fullPrompt, actRule } = VisualArcService.enrichScenePrompt(
      sceneActionPrompt,
      primaryChar?.anchor_prompt || null,
      sceneId - 1,
      totalScenes,
      customArtStyle,
      shotType,
      sceneCharacters
    );

    const charRefs = sceneCharacters
      .map((c) => {
        const resolved = this.resolveCharacterReferenceBase64(c);
        return resolved ? { char: c, ...resolved } : null;
      })
      .filter((r): r is { char: CharacterProfile; base64: string; mimeType: string } => Boolean(r));

    const hasExplicitChar = sceneCharacters.length > 0 && sceneCharacters.some((c) => c.character_category !== 'company_or_brand');
    const isHumanShot =
      shotType !== 'object_detail' &&
      shotType !== 'concept_diagram' &&
      shotType !== 'environment_wide';

    const useCharImageRef = charRefs.length > 0 && hasExplicitChar && isHumanShot;

    const castLabel =
      sceneCharacters.length > 0 ? sceneCharacters.map((c) => c.name).join(' + ') : 'Sin personaje (Entorno / Objeto)';

    console.log(`\n========================================================`);
    console.log(`🎬 [Escena ${sceneId}/${totalScenes}] ${actRule.act_name} | Plano: ${shotType || 'auto'}`);
    console.log(
      `   🎭 Personaje(s) en escena: ${castLabel} ${
        useCharImageRef ? `(+ ${charRefs.length} Retrato(s) de Referencia Activo(s))` : ''
      }`
    );
    console.log(`   💡 Iluminación: ${actRule.lighting_prompt.slice(0, 80)}...`);
    console.log(`========================================================`);

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const agnesKey = (process.env.AGNES_API_KEY || '').trim();

    const svgFilename = `scene_${sceneId}.svg`;
    const svgPath = path.join(projectDir, svgFilename);
    const cleanupStaleSvg = () => {
      try {
        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);
      } catch {
        // ignore
      }
    };

    // =========================================================================
    // 0. GOOGLE CLOUD VERTEX AI & GEMINI (Usa tus $300 USD de crédito de Google - 16:9 Panorámico)
    // =========================================================================
    const googleClient = ImageService.getGoogleGenAIClient();
    if (googleClient) {
      try {
        console.log(`[Google ${googleClient.isVertex ? 'Vertex AI ($300 Crédito)' : 'Gemini'}] Generando escena ${sceneId} (16:9)...`);
        const effectiveRefs = useCharImageRef
          ? charRefs.slice(0, 2).map((r) => ({ base64: r.base64, mimeType: r.mimeType, charName: r.char.name }))
          : [];
        const res = await ImageService.generateImageWithGoogle(
          `Widescreen 16:9 cinematic documentary shot: ${fullPrompt}`,
          {
            refImage: effectiveRefs[0] || null,
            refImages: effectiveRefs,
            aspectRatio: '16:9',
          }
        );
        if ('buffer' in res && res.buffer) {
          fs.writeFileSync(imagePath, res.buffer);
          cleanupStaleSvg();
          console.log(`[Google ${googleClient.isVertex ? 'Vertex AI' : 'Gemini'}] ✓ Escena ${sceneId} guardada en ${imagePath} (${res.modelUsed})`);
          return `/storage/${projectId}/images/${imageFilename}`;
        } else if ('error' in res) {
          console.warn(`[Google ${googleClient.isVertex ? 'Vertex AI' : 'Gemini'}] Aviso:`, res.error.slice(0, 160));
        }
      } catch (err: any) {
        console.warn(`[Google Vertex AI] Error en escena ${sceneId}:`, err.message);
      }
    }

    // =========================================================================
    // 0.5 AGNES AI (agnes-image-2.1-flash / agnes-image-2.5-flash) - 16:9 Panorámico
    // =========================================================================
    if (agnesKey) {
      try {
        console.log(`[Agnes AI] Generando imagen 16:9 con Agnes AI para escena ${sceneId}...`);
        const buf = await ImageService.generateWithAgnesAI(fullPrompt, {
          aspectRatio: '16:9',
        });
        if (buf && buf.length > 1000) {
          fs.writeFileSync(imagePath, buf);
          cleanupStaleSvg();
          console.log(`[Agnes AI] ✓ Imagen 16:9 guardada impecablemente en ${imagePath}`);
          return `/storage/${projectId}/images/${imageFilename}`;
        }
      } catch (err: any) {
        console.warn(`[Agnes AI] Error al generar escena ${sceneId}:`, err.message);
      }
    }

    // =========================================================================
    // 1. OPENROUTER MULTI-MODEL (Gemini 3.1 Flash Image)
    // Con reintentos automáticos ante Rate-Limit (429/5xx) y fallback sin ref base64
    // =========================================================================
    if (openrouterKey) {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Si en el último intento falló con imágenes adjuntas pesadas, probar solo con el prompt de texto enriquecido
          const attachRefsThisAttempt = useCharImageRef && charRefs.length > 0 && attempt < maxAttempts;
          console.log(
            `[OpenRouter] Generando imagen con Gemini 3.1 Flash Image para escena ${sceneId} (intento ${attempt}/${maxAttempts}${
              attachRefsThisAttempt ? `, ${charRefs.length} ref(s)` : ''
            })...`
          );

          const messageContent: any = attachRefsThisAttempt
            ? [
                ...charRefs.map((ref) => ({
                  type: 'image_url',
                  image_url: { url: `data:${ref.mimeType};base64,${ref.base64}` },
                })),
                {
                  type: 'text',
                  text: `Use the attached character reference portrait(s) to strictly preserve the exact facial features, hair, and design of ${charRefs
                    .map((r) => r.char.name)
                    .join(' and ')}. Generate a single widescreen 16:9 frame: ${fullPrompt}`,
                },
              ]
            : `Generate a single widescreen 16:9 cinematic frame: ${fullPrompt}`;

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'http://localhost:5173',
              'X-Title': 'Studio Multi-Canal',
            },
            body: JSON.stringify({
              model: 'google/gemini-3.1-flash-image',
              modalities: ['image', 'text'],
              messages: [{ role: 'user', content: messageContent }],
            }),
          });

          if (res.ok) {
            const data: any = await res.json();
            const msg = data.choices?.[0]?.message;
            let b64: string | null = null;

            if (msg?.images && msg.images.length > 0) {
              const imgUrl = msg.images[0].image_url?.url || '';
              if (imgUrl.startsWith('data:image/')) {
                b64 = imgUrl.split(',')[1];
              } else if (imgUrl.startsWith('http')) {
                const imgRes = await fetch(imgUrl);
                const buf = Buffer.from(await imgRes.arrayBuffer());
                if (buf.length > 1000) {
                  fs.writeFileSync(imagePath, buf);
                  cleanupStaleSvg();
                  console.log(`[OpenRouter] ✓ Imagen guardada desde URL en ${imagePath}`);
                  return `/storage/${projectId}/images/${imageFilename}`;
                }
              }
            } else if (msg?.parts) {
              const part = msg.parts.find((p: any) => p.inlineData);
              if (part?.inlineData?.data) {
                b64 = part.inlineData.data;
              }
            }

            if (b64) {
              const buf = Buffer.from(b64, 'base64');
              if (buf.length > 1000) {
                fs.writeFileSync(imagePath, buf);
                cleanupStaleSvg();
                console.log(`[OpenRouter] ✓ Imagen 16:9 guardada impecablemente en ${imagePath}`);
                return `/storage/${projectId}/images/${imageFilename}`;
              }
            }
            console.warn(
              `[OpenRouter] Intento ${attempt}/${maxAttempts}: respuesta OK pero sin imagen adjunta.`
            );
          } else {
            const errText = await res.text();
            console.warn(
              `[OpenRouter] Error HTTP ${res.status} (intento ${attempt}/${maxAttempts}): ${errText.slice(0, 160)}`
            );
            // Si es HTTP 402 (saldo < $1.00 requerido por OpenRouter para imágenes), no reintentar en vano
            if (res.status === 402 || res.status === 401) {
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[OpenRouter] Excepción (intento ${attempt}/${maxAttempts}): ${err.message}`);
        }

        if (attempt < maxAttempts) {
          const waitMs = attempt * 3000;
          console.log(`[OpenRouter] Esperando ${waitMs / 1000}s antes de reintentar escena ${sceneId}...`);
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
    }

    // =========================================================================
    // 2. OPENAI DALL-E 3 / GPT-IMAGE (16:9 Panorámico, Cero Marcas de Agua)
    // =========================================================================
    if (openaiKey && openaiKey.startsWith('sk-')) {
      try {
        console.log(`[OpenAI Image] Generando 16:9...`);
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1-mini',
            prompt: fullPrompt.slice(0, 950),
            n: 1,
            size: '1024x1024',
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const imgUrl = data.data?.[0]?.url;
          const b64 = data.data?.[0]?.b64_json;
          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            const buf = Buffer.from(await imgRes.arrayBuffer());
            if (buf.length > 1000) {
              fs.writeFileSync(imagePath, buf);
              cleanupStaleSvg();
              console.log(`[OpenAI Image] ✓ Imagen guardada en ${imagePath}`);
              return `/storage/${projectId}/images/${imageFilename}`;
            }
          } else if (b64) {
            const buf = Buffer.from(b64, 'base64');
            if (buf.length > 1000) {
              fs.writeFileSync(imagePath, buf);
              cleanupStaleSvg();
              console.log(`[OpenAI Image] ✓ Imagen base64 guardada en ${imagePath}`);
              return `/storage/${projectId}/images/${imageFilename}`;
            }
          }
        } else {
          const errText = await res.text();
          console.warn(`[OpenAI Image] Error HTTP ${res.status}: ${errText.slice(0, 160)}`);
        }
      } catch (err: any) {
        console.warn(`[OpenAI Image] Excepción: ${err.message}`);
      }
    }



    // =========================================================================
    // 4. MOTOR FLUX LIMPIO SIN MARCA DE AGUA (Con reintentos ante 503/429 retry-after)
    // =========================================================================
    const cleanPrompt = encodeURIComponent(
      fullPrompt.replace(/["\n\r]/g, ' ').slice(0, 460)
    );
    const baseSeed = Math.abs(
      (primaryChar?.character_id || 'hero').split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000) + sceneId
    );

    for (let fluxAttempt = 1; fluxAttempt <= 3; fluxAttempt++) {
      try {
        console.log(
          `[Flux Clean Engine] Generando imagen 16:9 sin marcas para escena ${sceneId} (intento ${fluxAttempt}/3)...`
        );
        const fluxUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&nologo=true&seed=${
          baseSeed + fluxAttempt
        }&model=flux`;

        const result = await new Promise<{ ok: boolean; retryAfterSec?: number }>((resolve) => {
          https
            .get(fluxUrl, { timeout: 40000 }, (res) => {
              if (res.statusCode === 200) {
                const fileStream = fs.createWriteStream(imagePath);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                  fileStream.close();
                  const size = fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0;
                  if (size > 1000) {
                    console.log(`[Flux Clean Engine] ✓ Imagen guardada (${size} bytes)`);
                    resolve({ ok: true });
                  } else {
                    try {
                      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                    } catch {
                      // ignore
                    }
                    resolve({ ok: false, retryAfterSec: 8 });
                  }
                });
              } else {
                const retryHeader = Number(res.headers['retry-after']) || 10;
                console.warn(`[Flux Clean Engine] HTTP ${res.statusCode} (retry-after: ${retryHeader}s)`);
                res.resume();
                resolve({ ok: false, retryAfterSec: retryHeader });
              }
            })
            .on('error', () => resolve({ ok: false, retryAfterSec: 8 }));
        });

        if (result.ok) {
          cleanupStaleSvg();
          return `/storage/${projectId}/images/${imageFilename}`;
        }

        if (fluxAttempt < 3) {
          const waitSec = Math.min(Math.max((result.retryAfterSec || 12) + 2, 10), 36);
          console.log(`[Flux Clean Engine] Esperando ${waitSec}s antes de reintentar escena ${sceneId}...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        }
      } catch (err: any) {
        console.warn('[Flux Clean Engine] Fallback:', err.message);
      }
    }

    // =========================================================================
    // 5. Placeholder SVG Cinematográfico Estilizado
    // =========================================================================
    const isTech = channelId.includes('tech');
    const grad1 = isTech ? '#0d1527' : '#2c1808';
    const grad2 = isTech ? '#1a233a' : '#573010';
    const accent = isTech ? '#38bdf8' : '#fbbf24';

    const svgContent = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${grad2}" />
      <stop offset="100%" stop-color="${grad1}" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <g transform="translate(120, 140)">
    <rect width="420" height="48" rx="8" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="1.5" />
    <text x="20" y="31" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="${accent}" letter-spacing="2">ACTO: ${actRule.act_name.toUpperCase()}</text>
    
    <text x="0" y="180" font-family="system-ui, sans-serif" font-size="70" font-weight="900" fill="#ffffff">ESCENA ${sceneId}: ${chapter}</text>
    <text x="0" y="240" font-family="system-ui, sans-serif" font-size="32" font-weight="600" fill="#cbd5e1">PERSONAJE ANCLA: ${sceneCharacters.map((c) => c.name).join(' + ') || primaryChar?.name || 'Protagonista'}</text>
    
    <rect y="290" width="1680" height="2" fill="rgba(255,255,255,0.15)" />
    
    <text x="0" y="350" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${accent}">DIRECCIÓN DE ILUMINACIÓN Y ARCO VISUAL:</text>
    <text x="0" y="390" font-family="system-ui, sans-serif" font-size="24" font-weight="400" fill="#94a3b8">${actRule.lighting_prompt}</text>

    <text x="0" y="470" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${accent}">FICHA VISUAL DEL PERSONAJE:</text>
    <foreignObject x="0" y="500" width="1600" height="200">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; font-size: 22px; line-height: 1.5; color: #cbd5e1; font-style: italic;">
        "${primaryChar?.anchor_prompt || 'Modelo estilizado 3D'}"
      </div>
    </foreignObject>
  </g>
</svg>
`;

    fs.writeFileSync(svgPath, svgContent, 'utf-8');
    return `/storage/${projectId}/images/${svgFilename}`;
  }
}
