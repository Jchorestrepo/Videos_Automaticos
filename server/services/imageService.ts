import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { VisualArcService } from './visualArcService.ts';
import type { CharacterProfile } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export class ImageService {
  static async generateSceneImage(
    projectId: string,
    sceneId: number,
    sceneActionPrompt: string,
    chapter: string,
    channelId: string,
    character?: CharacterProfile,
    totalScenes: number = 5,
    customArtStyle?: string
  ): Promise<string> {
    dotenv.config({ override: true });

    const projectDir = path.join(STORAGE_DIR, projectId, 'images');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const imageFilename = `scene_${sceneId}.jpg`;
    const imagePath = path.join(projectDir, imageFilename);

    // 1. Construir prompt enriquecido con Arco Emocional y Personaje Ancla
    const { fullPrompt, actRule } = VisualArcService.enrichScenePrompt(
      sceneActionPrompt,
      character?.anchor_prompt || null,
      sceneId - 1,
      totalScenes,
      customArtStyle
    );

    console.log(`\n========================================================`);
    console.log(`🎬 [Escena ${sceneId}/${totalScenes}] Acto: "${actRule.act_name}"`);
    console.log(`   🎭 Personaje: ${character?.name || 'Arquetipo'}`);
    console.log(`   💡 Iluminación: ${actRule.lighting_prompt.slice(0, 80)}...`);
    console.log(`========================================================`);

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    // =========================================================================
    // 1. OPENROUTER MULTI-MODEL (Gemini 3.1 Flash Image / GPT-5 Image)
    // Con saldo activo en OpenRouter y cero marcas de agua
    // =========================================================================
    if (openrouterKey) {
      try {
        console.log(`[OpenRouter] Generando imagen con Gemini 3.1 Flash Image para escena ${sceneId}...`);
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
            messages: [{ role: 'user', content: fullPrompt }],
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
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: fullPrompt,
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
