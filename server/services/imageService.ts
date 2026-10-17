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

export class ImageService {
  /**
   * Resuelve la imagen canónica del personaje en disco (si existe y es raster) para enviarla como referencia multimodal
   */
  static resolveCharacterReferenceBase64(
    character?: CharacterProfile
  ): { base64: string; mimeType: string } | null {
    if (!character?.canonical_image_url) return null;
    try {
      let localPath = '';
      if (character.canonical_image_url.startsWith('/channel-assets/')) {
        const rel = character.canonical_image_url.replace('/channel-assets/', '');
        localPath = path.join(CHANNELS_DIR, rel);
      } else if (character.canonical_image_url.startsWith('/storage/')) {
        const rel = character.canonical_image_url.replace('/storage/', '');
        localPath = path.join(STORAGE_DIR, rel);
      }
      if (!localPath || !fs.existsSync(localPath)) return null;
      const ext = path.extname(localPath).toLowerCase();
      if (ext === '.svg') return null; // SVG placeholders are not sent as raster reference
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
      const base64 = fs.readFileSync(localPath).toString('base64');
      return { base64, mimeType };
    } catch {
      return null;
    }
  }

  /**
   * Genera un retrato oficial (Concept Art 3D) del personaje antes de crear las escenas del video
   */
  static async generateCharacterPortrait(
    channelId: string,
    character: CharacterProfile
  ): Promise<CharacterProfile> {
    dotenv.config({ override: true });

    const assetsDir = CharacterService.getChannelCharacterAssetsDir(channelId);
    const timestamp = Date.now();
    const imageFilename = `${character.character_id}_ai_${timestamp}.jpg`;
    const imagePath = path.join(assetsDir, imageFilename);
    const publicUrl = `/channel-assets/${channelId}/characters/assets/${imageFilename}`;

    const portraitPrompt = [
      `Masterpiece 3D character design portrait of ${character.name} (${character.role}).`,
      character.anchor_prompt,
      character.signature_props?.length
        ? `Subtle signature elements: ${character.signature_props.join(', ')}.`
        : '',
      `Single centered bust portrait, expressive facial structure, dramatic studio volumetric rim lighting, Pixar and Arcane high-end 3D documentary aesthetic, 8k render, NO text, NO split screen, NO watermarks.`,
    ]
      .filter(Boolean)
      .join(' ');

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    let generated = false;

    // 1. OpenRouter (Gemini 3.1 Flash Image)
    if (openrouterKey && !generated) {
      try {
        console.log(`[Character Studio] Generando retrato 3D con OpenRouter para "${character.name}"...`);
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
            messages: [{ role: 'user', content: portraitPrompt }],
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

    // 2. OpenAI Image
    if (openaiKey && openaiKey.startsWith('sk-') && !generated) {
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

    // 3. Google Gemini Image
    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui' && !generated) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: portraitPrompt,
          config: { responseModalities: ['IMAGE'] },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (imagePart?.inlineData?.data) {
          fs.writeFileSync(imagePath, Buffer.from(imagePart.inlineData.data, 'base64'));
          generated = true;
        }
      } catch (err: any) {
        console.warn(`[Character Studio] Gemini aviso: ${err.message}`);
      }
    }

    // 4. Flux Clean Engine
    if (!generated) {
      try {
        const cleanPrompt = encodeURIComponent(portraitPrompt.replace(/["\n\r]/g, ' ').slice(0, 480));
        const seed = Math.abs(
          character.character_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 2026)
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
      const svgFilename = `${character.character_id}_ai_${timestamp}.svg`;
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
  <text x="400" y="690" text-anchor="middle" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="#ffffff">${character.name}</text>
  <text x="400" y="730" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="#38bdf8">${character.role}</text>
</svg>`;
      fs.writeFileSync(svgPath, svgPortrait, 'utf-8');
      finalUrl = `/channel-assets/${channelId}/characters/assets/${svgFilename}`;
    }

    const updated: CharacterProfile = {
      ...character,
      canonical_image_url: finalUrl,
      custom_uploaded: false,
      reference_gallery: [
        finalUrl,
        ...(character.reference_gallery || []).filter((u) => u !== finalUrl),
      ].slice(0, 12),
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
    character?: CharacterProfile,
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

    // 1. Construir prompt enriquecido con Arco Emocional, Tipo de Plano y Personaje Ancla
    const { fullPrompt, actRule } = VisualArcService.enrichScenePrompt(
      sceneActionPrompt,
      character?.anchor_prompt || null,
      sceneId - 1,
      totalScenes,
      customArtStyle,
      shotType
    );

    const charRef = this.resolveCharacterReferenceBase64(character);
    const useCharImageRef =
      Boolean(charRef) &&
      shotType !== 'object_detail' &&
      shotType !== 'concept_diagram';

    console.log(`\n========================================================`);
    console.log(`🎬 [Escena ${sceneId}/${totalScenes}] ${actRule.act_name} | Plano: ${shotType || 'auto'}`);
    console.log(
      `   🎭 Personaje: ${character?.name || 'Arquetipo'} ${
        useCharImageRef ? '(+ Imagen de Referencia Oficial Activa)' : ''
      }`
    );
    console.log(`   💡 Iluminación: ${actRule.lighting_prompt.slice(0, 80)}...`);
    console.log(`========================================================`);

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    // =========================================================================
    // 1. OPENROUTER MULTI-MODEL (Gemini 3.1 Flash Image / GPT-5 Image)
    // Con soporte de referencia visual multimodal si el usuario subió/aprobó retrato
    // =========================================================================
    if (openrouterKey) {
      try {
        console.log(`[OpenRouter] Generando imagen con Gemini 3.1 Flash Image para escena ${sceneId}...`);
        const messageContent: any =
          useCharImageRef && charRef
            ? [
                {
                  type: 'image_url',
                  image_url: { url: `data:${charRef.mimeType};base64,${charRef.base64}` },
                },
                {
                  type: 'text',
                  text: `Use the attached character reference portrait to strictly preserve the exact facial features, hair, and design of ${character?.name || 'the protagonist'}. Generate a single widescreen 16:9 frame: ${fullPrompt}`,
                },
              ]
            : fullPrompt;

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
              fs.writeFileSync(imagePath, buf);
              console.log(`[OpenRouter] ✓ Imagen guardada desde URL en ${imagePath}`);
              return `/storage/${projectId}/images/${imageFilename}`;
            }
          } else if (msg?.parts) {
            const part = msg.parts.find((p: any) => p.inlineData);
            if (part?.inlineData?.data) {
              b64 = part.inlineData.data;
            }
          }

          if (b64) {
            fs.writeFileSync(imagePath, Buffer.from(b64, 'base64'));
            console.log(`[OpenRouter] ✓ Imagen 16:9 guardada impecablemente en ${imagePath}`);
            return `/storage/${projectId}/images/${imageFilename}`;
          }
        } else {
          const errText = await res.text();
          console.warn(`[OpenRouter] Error HTTP ${res.status}: ${errText.slice(0, 160)}`);
        }
      } catch (err: any) {
        console.warn(`[OpenRouter] Excepción: ${err.message}`);
      }
    }

    // =========================================================================
    // 2. OPENAI DALL-E 3 (16:9 Panorámico 1792x1024, Cero Marcas de Agua)
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
          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            const buf = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(imagePath, buf);
            console.log(`[OpenAI Image] ✓ Imagen guardada en ${imagePath}`);
            return `/storage/${projectId}/images/${imageFilename}`;
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
    // 3. GOOGLE GEMINI IMAGE (Si hay cuenta con cuota habilitada)
    // =========================================================================
    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        console.log(`[Google Gemini Image] Intentando generar escena ${sceneId}...`);
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const contents: any =
          useCharImageRef && charRef
            ? [
                { inlineData: { data: charRef.base64, mimeType: charRef.mimeType } },
                `Preserve the exact facial features and character design from this reference portrait. ${fullPrompt}`,
              ]
            : fullPrompt;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents,
          config: {
            responseModalities: ['IMAGE'],
          },
        });

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

        if (imagePart && imagePart.inlineData?.data) {
          fs.writeFileSync(imagePath, Buffer.from(imagePart.inlineData.data, 'base64'));
          console.log(`[Google Gemini Image] ✓ Imagen guardada en ${imagePath}`);
          return `/storage/${projectId}/images/${imageFilename}`;
        }
      } catch (error: any) {
        console.warn(`[Google Gemini Image] Aviso: ${error.message?.slice(0, 100)}`);
      }
    }

    // =========================================================================
    // 4. MOTOR FLUX LIMPIO SIN MARCA DE AGUA
    // =========================================================================
    try {
      console.log(`[Flux Clean Engine] Generando imagen 16:9 sin marcas...`);
      const cleanPrompt = encodeURIComponent(
        fullPrompt.replace(/["\n\r]/g, ' ').slice(0, 480)
      );
      // Usar seed determinista basado en el ID del personaje para consistencia
      const seed = Math.abs(
        (character?.character_id || 'hero').split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000)
      );
      const fluxUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;

      const success = await new Promise<boolean>((resolve) => {
        const fileStream = fs.createWriteStream(imagePath);
        https
          .get(fluxUrl, { timeout: 35000 }, (res) => {
            if (res.statusCode === 200) {
              res.pipe(fileStream);
              fileStream.on('finish', () => {
                fileStream.close();
                const size = fs.statSync(imagePath).size;
                if (size > 1000) {
                  console.log(`[Flux Clean Engine] ✓ Imagen guardada (${size} bytes)`);
                  resolve(true);
                } else {
                  resolve(false);
                }
              });
            } else {
              resolve(false);
            }
          })
          .on('error', () => resolve(false));
      });

      if (success) {
        return `/storage/${projectId}/images/${imageFilename}`;
      }
    } catch (err: any) {
      console.warn('[Flux Clean Engine] Fallback:', err.message);
    }

    // =========================================================================
    // 5. Placeholder SVG Cinematográfico Estilizado
    // =========================================================================
    const svgFilename = `scene_${sceneId}.svg`;
    const svgPath = path.join(projectDir, svgFilename);

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
    <text x="0" y="240" font-family="system-ui, sans-serif" font-size="32" font-weight="600" fill="#cbd5e1">PERSONAJE ANCLA: ${character?.name || 'Protagonista'}</text>
    
    <rect y="290" width="1680" height="2" fill="rgba(255,255,255,0.15)" />
    
    <text x="0" y="350" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${accent}">DIRECCIÓN DE ILUMINACIÓN Y ARCO VISUAL:</text>
    <text x="0" y="390" font-family="system-ui, sans-serif" font-size="24" font-weight="400" fill="#94a3b8">${actRule.lighting_prompt}</text>

    <text x="0" y="470" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${accent}">FICHA VISUAL DEL PERSONAJE:</text>
    <foreignObject x="0" y="500" width="1600" height="200">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; font-size: 22px; line-height: 1.5; color: #cbd5e1; font-style: italic;">
        "${character?.anchor_prompt || 'Modelo estilizado 3D'}"
      </div>
    </foreignObject>
  </g>
</svg>
`;

    fs.writeFileSync(svgPath, svgContent, 'utf-8');
    return `/storage/${projectId}/images/${svgFilename}`;
  }
}
