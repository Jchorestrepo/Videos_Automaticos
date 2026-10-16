import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { ChannelPersona, ProjectScript, SceneItem } from '../../src/types/index.ts';

export class ScriptService {
  static async generateScript(
    topic: string,
    persona: ChannelPersona,
    conflictDetails?: string,
    characterCompany?: string,
    sources?: string[]
  ): Promise<ProjectScript> {
    dotenv.config({ override: true });
    const projectId = `proj_${Date.now()}`;

    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    const systemPrompt = `
Eres el guionista principal del canal "${persona.name}" (${persona.niche}).
Tu objetivo es redactar un guion documental para YouTube en ESPAÑOL con una tasa de retención extrema, siguiendo rigurosamente este perfil de personalidad:

ARQUETIPO DEL NARRADOR: ${persona.narrator.archetype}
TONO Y ESTILO: ${persona.narrator.tone}
PERSPECTIVA: ${persona.narrator.perspective}
MULETILLAS Y FRASES DE APERTURA: ${persona.narrator.signature_cues.openings.join(' | ')}
TRANSICIONES DE TENSIÓN: ${persona.narrator.signature_cues.transitions.join(' | ')}
CIERRES: ${persona.narrator.signature_cues.closings.join(' | ')}
VOCABULARIO CLAVE PREFERIDO: ${persona.narrator.key_vocabulary.join(', ')}
FRASES TOTALMENTE PROHIBIDAS (NUNCA USAR): ${persona.narrator.forbidden_phrases.join(', ')}

INSTRUCCIONES DE ESTRUCTURA:
1. Divide la historia en entre 5 y 7 escenas dinámicas de 15 a 25 segundos cada una.
2. Cada escena debe tener:
   - "scene_id": número entero secuencial
   - "chapter": título corto del capítulo
   - "voiceover": texto exacto que leerá el narrador en ESPAÑOL, aplicando su arquetipo y tono.
   - "visual_prompt": prompt detallado en inglés para generador de imágenes 16:9 (${persona.visual_style.prompt_prefix} ... ${persona.visual_style.prompt_suffix})
   - "camera_motion": "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
   - "durationInSeconds": duración estimada calculada según ${persona.narrator.target_wpm} palabras por minuto.

DEVUELVE ÚNICAMENTE UN OBJETO JSON con esta estructura exacta:
{
  "title": "${topic}",
  "hook": "frase de apertura hipnótica",
  "scenes": [ ... ]
}
`;

    const userMessage = `
TEMA DEL VIDEO: ${topic}
PROTAGONISTAS: ${characterCompany || 'N/A'}
CONFLICTO HISTÓRICO/EMPRESARIAL: ${conflictDetails || topic}
FUENTES DE REFERENCIA: ${sources ? sources.join(', ') : 'Archivos históricos'}
`;

    // 1. INTENTO CON DEEPSEEK O OPENROUTER O OPENAI
    const openAICompatibleConfig = openrouterKey
      ? {
          name: 'OpenRouter (DeepSeek)',
          url: 'https://openrouter.ai/api/v1/chat/completions',
          key: openrouterKey,
          model: 'deepseek/deepseek-chat',
        }
      : deepseekKey
      ? {
          name: 'DeepSeek Direct',
          url: 'https://api.deepseek.com/chat/completions',
          key: deepseekKey,
          model: 'deepseek-chat',
        }
      : openaiKey
      ? {
          name: 'OpenAI GPT-4o-mini',
          url: 'https://api.openai.com/v1/chat/completions',
          key: openaiKey,
          model: 'gpt-4o-mini',
        }
      : null;

    if (openAICompatibleConfig) {
      try {
        console.log(`[Script Engine] Generando con ${openAICompatibleConfig.name}...`);
        const res = await fetch(openAICompatibleConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAICompatibleConfig.key}`,
          },
          body: JSON.stringify({
            model: openAICompatibleConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            console.log(`[Script Engine] ✓ Guion generado exitosamente con ${openAICompatibleConfig.name}`);
            return {
              project_id: projectId,
              channel_id: persona.channel_id,
              title: parsed.title || topic,
              hook: parsed.hook || persona.narrator.signature_cues.openings[0],
              characterCompany,
              scenes: parsed.scenes.map((s: any, idx: number) => ({
                scene_id: idx + 1,
                chapter: s.chapter || `Capítulo ${idx + 1}`,
                voiceover: s.voiceover,
                visual_prompt:
                  s.visual_prompt ||
                  `${persona.visual_style.prompt_prefix} scene representing ${topic} ${persona.visual_style.prompt_suffix}`,
                camera_motion: s.camera_motion || 'zoom_in',
                durationInSeconds:
                  s.durationInSeconds ||
                  Math.max(
                    12,
                    Math.round(s.voiceover.split(' ').length / (persona.narrator.target_wpm / 60))
                  ),
              })),
              status: 'draft',
              createdAt: new Date().toISOString(),
            };
          }
        } else {
          console.warn(`[Script Engine] ${openAICompatibleConfig.name} error: ${res.status}`);
        }
      } catch (err: any) {
        console.warn(`[Script Engine] Error con ${openAICompatibleConfig.name}:`, err.message);
      }
    }

    // 2. INTENTO CON GOOGLE GEMINI FLASH
    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        console.log('[Script Engine] Generando con Google Gemini 3.5 Flash...');
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const response = await client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMessage }] },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          console.log('[Script Engine] ✓ Guion generado exitosamente con Gemini 3.5 Flash');
          return {
            project_id: projectId,
            channel_id: persona.channel_id,
            title: parsed.title || topic,
            hook: parsed.hook || persona.narrator.signature_cues.openings[0],
            characterCompany,
            scenes: parsed.scenes.map((s: any, idx: number) => ({
              scene_id: idx + 1,
              chapter: s.chapter || `Capítulo ${idx + 1}`,
              voiceover: s.voiceover,
              visual_prompt:
                s.visual_prompt ||
                `${persona.visual_style.prompt_prefix} scene representing ${topic} ${persona.visual_style.prompt_suffix}`,
              camera_motion: s.camera_motion || 'zoom_in',
              durationInSeconds:
                s.durationInSeconds ||
                Math.max(
                  12,
                  Math.round(s.voiceover.split(' ').length / (persona.narrator.target_wpm / 60))
                ),
            })),
            status: 'draft',
            createdAt: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.warn('[Script Engine] Error con Gemini Flash:', err.message);
      }
    }

    // 3. FALLBACK INTELIGENTE CON ADN DE PERSONALIDAD
    return this.generateTemplateScript(projectId, topic, persona, conflictDetails, characterCompany);
  }

  private static generateTemplateScript(
    projectId: string,
    topic: string,
    persona: ChannelPersona,
    conflict?: string,
    characters?: string
  ): ProjectScript {
    const opening = persona.narrator.signature_cues.openings[0];
    const transition = persona.narrator.signature_cues.transitions[0];
    const closing = persona.narrator.signature_cues.closings[0];

    const scenes: SceneItem[] = [
      {
        scene_id: 1,
        chapter: 'El Espejismo Inicial',
        voiceover: `${opening} En el epicentro de ${characters || topic}, todo parecía una victoria asegurada. Las cifras se inflaban a un ritmo insostenible mientras nadie en la mesa se atrevía a cuestionar la verdad.`,
        visual_prompt: `${persona.visual_style.prompt_prefix} Cinematic extreme wide shot of ${characters || topic}, dramatic lighting, 35mm film grain, ${persona.visual_style.prompt_suffix}`,
        camera_motion: 'zoom_in',
        durationInSeconds: 15,
      },
      {
        scene_id: 2,
        chapter: 'La Máquina de Fricción',
        voiceover: `${conflict || 'La promesa era revolucionaria, pero las grietas en el modelo operativo comenzaron a multiplicarse silenciosamente.'} Cada decisión impulsiva aceleraba la quema de recursos sin generar valor real.`,
        visual_prompt: `${persona.visual_style.prompt_prefix} Tense atmosphere, key figures gathered around glowing monitors and documents in shadows, ${persona.visual_style.prompt_suffix}`,
        camera_motion: 'pan_left',
        durationInSeconds: 18,
      },
      {
        scene_id: 3,
        chapter: 'El Punto de Fractura',
        voiceover: `${transition} Cuando el escrutinio público y las auditorías tocaron a la puerta, el castillo de naipes demostró tener bases de barro. La arrogancia chocó de frente con los números reales.`,
        visual_prompt: `${persona.visual_style.prompt_prefix} Empty boardroom after catastrophic meeting, documents left behind, dramatic shadows, ${persona.visual_style.prompt_suffix}`,
        camera_motion: 'zoom_out',
        durationInSeconds: 16,
      },
      {
        scene_id: 4,
        chapter: 'La Implosión Inevitable',
        voiceover: `En cuestión de semanas, lo que valía millones colapsó estrepitosamente. Los mismos que aplaudían en las conferencias huyeron en silencio cuando la liquidación fue inminente.`,
        visual_prompt: `${persona.visual_style.prompt_prefix} Solitary figure looking out a high-rise window into the moody city, stark contrast, ${persona.visual_style.prompt_suffix}`,
        camera_motion: 'pan_right',
        durationInSeconds: 17,
      },
      {
        scene_id: 5,
        chapter: 'La Lección Final',
        voiceover: `${closing} Un recordatorio implacable de que cuando la ambición desmedida ignora los fundamentos más básicos, el mercado siempre cobra la factura completa.`,
        visual_prompt: `${persona.visual_style.prompt_prefix} Powerful closing shot, cinematic silhouette against a setting sun, symbolic ending, ${persona.visual_style.prompt_suffix}`,
        camera_motion: 'zoom_in',
        durationInSeconds: 15,
      },
    ];

    return {
      project_id: projectId,
      channel_id: persona.channel_id,
      title: topic,
      hook: opening,
      characterCompany: characters,
      scenes,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
  }
}
