import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { ProjectScript, SceneItem, ChannelPersona } from '../../src/types/index.ts';

export interface TranslatedSceneVoiceover {
  scene_id: number;
  chapter_es: string;
  voiceover_es: string;
}

export class TranslationService {
  /**
   * Traduce y adapta el guion de un documental entre inglés y español
   * preservando el tono cinematográfico, arcos de tensión, pausas y fidelidad fáctica.
   */
  static async translateScenes(
    scenes: SceneItem[],
    targetLang: 'es' | 'en' = 'es',
    channel?: ChannelPersona
  ): Promise<TranslatedSceneVoiceover[]> {
    dotenv.config({ override: true });

    const sourceLang = targetLang === 'es' ? 'inglés' : 'español';
    const destLang = targetLang === 'es' ? 'español neutro latinoamericano/internacional' : 'inglés contemporáneo estilo documental estadounidense/británico';

    const scenesPayload = scenes.map((s) => ({
      scene_id: s.scene_id,
      chapter: s.chapter,
      voiceover: s.voiceover,
      durationInSeconds: s.durationInSeconds,
      act_name: s.act_name,
    }));

    const systemPrompt = `Eres un Director de Doblaje y Guionista Senior especializado en documentales cinematográficos de alto impacto (estilo Netflix, HBO, Bloomberg Originals).
Tu misión es traducir y adaptar los diálogos/locuciones de voz de las siguientes escenas del ${sourceLang} al ${destLang}.

DIRECTRICES CLAVE:
1. CADENCIA Y TIEMPO: El texto adaptado debe tener una longitud y ritmo fonético similar al original para que encaje de manera natural en la duración de la escena (${scenes.map(s => `E${s.scene_id}:${s.durationInSeconds}s`).join(', ')}).
2. TONO DOCUMENTAL: Evita traducciones literales o robóticas. Emplea vocabulario cinematográfico, sobrio, contundente y con tensión dramática.
3. CIFRAS Y DATOS: Conserva con total precisión todas las fechas, nombres propios, porcentajes y cifras monetarias (ej: $100M -> 100 millones de dólares).
4. ESTRUCTURA: Mantén el mismo número de escenas y respeta los IDs.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "scenes": [
    {
      "scene_id": 1,
      "chapter_es": "Título del capítulo adaptado",
      "voiceover_es": "Locución traducida y adaptada para locutor profesional..."
    }
  ]
}

ESCENAS ORIGINALES A TRADUCIR:
${JSON.stringify(scenesPayload, null, 2)}
`;

    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

    let parsedResult: any = null;

    // 1. Google Gemini
    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        console.log(`[TranslationService] Traduciendo ${scenes.length} escenas con Gemini...`);
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const res = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        });
        if (res.text) {
          parsedResult = JSON.parse(res.text);
        }
      } catch (err: any) {
        console.warn('[TranslationService] Error con Gemini:', err.message);
      }
    }

    // 2. OpenRouter Fallback
    if (!parsedResult && openrouterKey) {
      try {
        console.log(`[TranslationService] Traduciendo ${scenes.length} escenas con OpenRouter...`);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openrouterKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.4,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) parsedResult = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('[TranslationService] Error con OpenRouter:', err.message);
      }
    }

    // 3. OpenAI Fallback
    if (!parsedResult && openaiKey && openaiKey.startsWith('sk-')) {
      try {
        console.log(`[TranslationService] Traduciendo ${scenes.length} escenas con OpenAI...`);
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.4,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) parsedResult = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('[TranslationService] Error con OpenAI:', err.message);
      }
    }

    if (parsedResult && Array.isArray(parsedResult.scenes)) {
      return parsedResult.scenes;
    }

    // Fallback básico si fallan las APIs de IA
    return scenes.map((s) => ({
      scene_id: s.scene_id,
      chapter_es: s.chapter,
      voiceover_es: s.voiceover,
    }));
  }
}
