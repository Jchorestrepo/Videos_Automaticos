import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type {
  ChannelPersona,
  CharacterProfile,
  NarrativeBlockType,
  ProjectScript,
  ResearchDossier,
  SceneItem,
  ShotType,
  VisualMotionMode,
  EmotionalAnimationEffect,
  DurationRange,
} from '../../src/types/index.ts';
import { ResearchService } from './researchService.ts';
import { CharacterService } from './characterService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

interface BlockGenerationSpec {
  blockIndex: number;
  sceneStartId: number;
  sceneCount: number;
  actsDescription: string;
}

interface WordRange {
  min: number;
  max: number;
}

const DEFAULT_DURATION_RANGE: DurationRange = { min: 10, max: 14 };
const MIN_DURATION_MINUTES = 3;
const MAX_DURATION_MINUTES = 30;
const DEFAULT_SCENE_COUNT = 24;
const SPANISH_NARRATION_WPM = 135;
const ENGLISH_NARRATION_WPM = 155;

export class ScriptService {
  /**
   * Detecta automáticamente efectos expresivos procedurales acordes a la emoción relatada en la escena
   */
  static detectEmotionalEffect(voiceover: string, chapter: string, lang: 'es' | 'en' = 'es'): EmotionalAnimationEffect {
    const combined = `${voiceover} ${chapter}`.toLowerCase();
    if (
      /cólera|enojo|furia|estafa|traición|mentira|rabia|grito|ira|engañ|ardid|furios/i.test(combined) ||
      /anger|fury|rage|scam|fraud|betrayal|lies?|screaming|furious|deceit/i.test(combined)
    ) {
      return 'smoke_head';
    }
    if (
      /borrach|mareo|fiesta|descontrol|locura|droga|alcohol|bambol|ebrio|resaca|alucin/i.test(combined) ||
      /drunk|dizzy|wobble|hangover|party|insanity|drugs|alcohol|hallucinat/i.test(combined)
    ) {
      return 'dizzy_wobble';
    }
    if (
      /millon|riqueza|oro|fortuna|adquisici|éxito|glamour|dólares|imperio|dinero|acuerdo/i.test(combined) ||
      /million|billion|wealth|gold|fortune|acquisition|success|glamour|dollars|empire|money|profit/i.test(combined)
    ) {
      return 'golden_glint';
    }
    if (
      /pánico|colapso|alarma|emergencia|bancarrota|implosión|quiebra|miedo|desplome|pesadilla/i.test(combined) ||
      /panic|collapse|alarm|emergency|bankruptcy|implosion|crash|nightmare|terror/i.test(combined)
    ) {
      return 'panic_heartbeat';
    }
    return 'none';
  }

  /**
   * Limpia artefactos de texto que hacen que ElevenLabs lea barras, paréntesis o siglas rotas
   */
  static sanitizeVoiceover(text: string, lang: 'es' | 'en' = 'es'): string {
    const cleaned = text
      .replace(/\s*\/\s*/g, ', ')
      .replace(/\(([^)]+)\)/g, ', $1, ');

    if (lang === 'en') {
      return cleaned
        .replace(/\$(\d+(?:[.,]\d+)?)\s*M\b/gi, '$1 million dollars')
        .replace(/\$(\d+(?:[.,]\d+)?)\s*B\b/gi, '$1 billion dollars')
        .replace(/\s{2,}/g, ' ')
        .replace(/,\s*,/g, ',')
        .trim();
    }

    return cleaned
      .replace(/\$(\d+(?:[.,]\d+)?)\s*M\b/gi, '$1 millones de dólares')
      .replace(/\$(\d+(?:[.,]\d+)?)\s*B\b/gi, '$1 mil millones de dólares')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  static normalizeDurationRange(range?: Partial<DurationRange>): DurationRange {
    const rawMin = Number(range?.min);
    const rawMax = Number(range?.max);
    const min = Number.isFinite(rawMin) ? rawMin : DEFAULT_DURATION_RANGE.min;
    const max = Number.isFinite(rawMax) ? rawMax : DEFAULT_DURATION_RANGE.max;
    const clampedMin = Math.min(Math.max(min, MIN_DURATION_MINUTES), MAX_DURATION_MINUTES);
    const clampedMax = Math.min(Math.max(max, clampedMin), MAX_DURATION_MINUTES);
    return { min: clampedMin, max: clampedMax };
  }

  /** Words per scene needed so the narration lands inside the duration range. */
  static computeWordsPerScene(
    range: DurationRange,
    wordsPerMinute: number,
    sceneCount: number = DEFAULT_SCENE_COUNT
  ): WordRange {
    const scenes = Math.max(sceneCount, 1);
    return {
      min: Math.max(20, Math.round((range.min * wordsPerMinute) / scenes)),
      max: Math.max(30, Math.round((range.max * wordsPerMinute) / scenes)),
    };
  }

  static async generateScript(
    topic: string,
    persona: ChannelPersona,
    conflictDetails?: string,
    characterCompany?: string,
    sources?: string[],
    targetDurationRange: DurationRange = DEFAULT_DURATION_RANGE,
    onProgress?: (percent: number, phase: string, detail?: string) => void
  ): Promise<ProjectScript> {
    dotenv.config({ override: true });
    const durationRange = this.normalizeDurationRange(targetDurationRange);
    const targetDurationMinutes = (durationRange.min + durationRange.max) / 2;
    const wordRange = this.computeWordsPerScene(
      durationRange,
      persona.narrator.target_wpm || SPANISH_NARRATION_WPM
    );
    const projectId = `proj_${Date.now()}`;

    onProgress?.(
      12,
      'Fase 1/4: Investigando el caso y armando el Dossier Forense 360°...',
      `Analizando protagonista, antagonista, cifras clave y cronología de "${topic.slice(0, 45)}..."`
    );

    // 1. FASE 1: AGENTE DE INVESTIGACIÓN FORENSE 360°
    const dossier = await ResearchService.conductDeepResearch(
      topic,
      persona,
      conflictDetails,
      characterCompany,
      sources
    );

    // 1.1 DESAGREGAR Y VINCULAR ELENCO INDIVIDUAL + PERSONAJES DE LORE DEL CANAL
    const cast = CharacterService.resolveCastForStory(
      persona.channel_id,
      characterCompany || '',
      topic,
      conflictDetails,
      dossier,
      projectId
    );
    const loreCastMember = cast.find((c) => c.character_category === 'channel_lore_cast');
    const loreAnalogyDirective = loreCastMember
      ? `Si usas un personaje de ejemplo en la analogía o como usuario secundario sin rostro conocido, puedes nombrar a nuestro personaje recurrente del canal "${loreCastMember.name}" (${
          loreCastMember.channel_lore?.age || ''
        }, ${loreCastMember.channel_lore?.personality_traits?.join(', ') || ''}, peculiaridades: ${
          loreCastMember.channel_lore?.peculiarities?.slice(0, 2).join('; ') || ''
        }) para mantener el lore del canal.`
      : '';

    onProgress?.(
      35,
      'Fase 2/4: Dossier y Elenco listos. Estructurando los 6 Actos (24 escenas)...',
      `Elenco individual (${cast.length}): ${cast.map((c) => c.name).join(' • ')}`
    );

    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim() || (process.env.GOOGLE_API_KEY || '').trim();

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

    // 2. FASE 2: ARQUITECTURA MULTI-ACTO DE 24 ESCENAS (6 ACTOS DE ENTRETENIMIENTO PURO)
    const blockSpecs: BlockGenerationSpec[] = [
      {
        blockIndex: 1,
        sceneStartId: 1,
        sceneCount: 8,
        actsDescription: `
BLOQUE 1 DE 3 (ESCENAS 1 A 8 — ACTOS 1 Y 2):
- ESCENAS 1 A 4 (ACTO 1: "hook_climax" - El Gancho en la Cima):
  * Escena 1: Arranca en el punto más alto de gloria o tensión ("Esta es la historia de ${dossier.protagonist_profile.name}... quien no solo parecía el mayor ganador de su industria, sino un estratega invencible según sus resultados...").
  * Escenas 2 y 3: Muestra la magnitud del imperio, los millones en juego y la promesa que cautivó a todos.
  * Escena 4 (PUENTE OBLIGATORIO): Cierra el Acto 1 diciendo explícitamente una variación natural de: "Pero antes de entrar a contarte cómo se evaporó todo en cuestión de horas, tengo que contarte quién es realmente ${dossier.protagonist_profile.name} y qué escondía su pasado."

- ESCENAS 5 A 8 (ACTO 2: "protagonist_origin" - El Expediente del Protagonista):
  * Escenas 5 y 6: La historia de origen de ${dossier.protagonist_profile.name} (${dossier.protagonist_profile.backstory}). De dónde salió, cómo forjó su carácter y sus primeros golpes de audacia.
  * Escenas 7 y 8: Su mayor logro (${dossier.protagonist_profile.greatest_achievement}) y su punto ciego psicológico (${dossier.protagonist_profile.psychological_flaw}) que sembró la semilla de la tragedia.
`,
      },
      {
        blockIndex: 2,
        sceneStartId: 9,
        sceneCount: 8,
        actsDescription: `
BLOQUE 2 DE 3 (ESCENAS 9 A 16 — ACTOS 3 Y 4):
- ESCENAS 9 A 12 (ACTO 3: "antagonist_rival" - El Antagonista o Rival en la Sombra):
  * Introduce el contrapeso de la historia: ${dossier.antagonist_profile.name} (${dossier.antagonist_profile.role}).
  * Narra cómo mientras ${dossier.protagonist_profile.name} acaparaba los reflectores, del otro lado del tablero se gestaba una fuerza opuesta (${dossier.antagonist_profile.relationship_to_protagonist}) y el movimiento clave que preparaban (${dossier.antagonist_profile.key_move}).
  * Escena 12 (PUENTE AL CONCEPTO): Termina abriendo la pregunta: "¿Pero cómo es posible que una empresa en la cima caiga en semejante trampa sin darse cuenta? Para entenderlo, primero debemos pausar la historia y explicar una regla oculta."

- ESCENAS 13 A 16 (ACTO 4: "concept_explainer" - El Paréntesis Maestro / Explicación del Concepto Clave):
  * Explica de forma ultra entretenida el concepto central: "${dossier.core_concept_explainer.concept_name}".
  * Escena 13: Define el concepto sin tecnicismos aburridos (${dossier.core_concept_explainer.simple_definition}).
  * Escenas 14 y 15: Desarrolla la ANALOGÍA COTIDIANA (${dossier.core_concept_explainer.everyday_analogy}) para que el espectador sienta una revelación mental. ${loreAnalogyDirective}
  * Escena 16: Conecta el concepto directamente con la bomba de relojería dentro del caso (${dossier.core_concept_explainer.why_it_matters_here}).
`,
      },
      {
        blockIndex: 3,
        sceneStartId: 17,
        sceneCount: 8,
        actsDescription: `
BLOQUE 3 DE 3 (ESCENAS 17 A 24 — ACTOS 5 Y 6):
- ESCENAS 17 A 21 (ACTO 5: "collision_collapse" - El Choque de Trenes y las 72 Horas del Colapso):
  * Ahora que el espectador conoce a ${dossier.protagonist_profile.name}, a ${dossier.antagonist_profile.name} y entiende el concepto de "${dossier.core_concept_explainer.concept_name}", desata el clímax de la historia principal.
  * Reconstruye minuto a minuto el punto de quiebre usando la cronología y las cifras duras del dossier: las reuniones de emergencia, el pánico en los servidores o en la junta directiva, y el desplome financiero.

- ESCENAS 22 A 24 (ACTO 6: "aftermath_verdict" - Las Cenizas y el Veredicto Forense):
  * Escena 22: El silencio después del colapso, a cuánto se liquidó todo y quiénes pagaron los platos rotos.
  * Escena 23: Qué pasó después con ${dossier.protagonist_profile.name} y con ${dossier.antagonist_profile.name}.
  * Escena 24: Reflexión final magistral usando el tono de cierre del narrador (${persona.narrator.signature_cues.closings[0]}).
`,
      },
    ];

    try {
      console.log(
        `\n🎬 [Script Showrunner] Redactando documental largo (24 escenas / 6 Actos / ~10-13 min)...`
      );
      let completedBlocks = 0;
      const blockResults = await Promise.all(
        blockSpecs.map(async (spec) => {
          const res = await this.generateNarrativeBlock(
            spec,
            topic,
            persona,
            dossier,
            openAICompatibleConfig,
            geminiKey,
            wordRange,
            durationRange,
            cast
          );
          completedBlocks++;
          const pct = 35 + Math.round((completedBlocks / blockSpecs.length) * 52);
          onProgress?.(
            pct,
            `Fase 3/4: Redactando guion y dirección visual (${completedBlocks}/${blockSpecs.length} bloques listos)...`,
            `Escenas ${spec.sceneStartId} a ${spec.sceneStartId + spec.sceneCount - 1} completadas`
          );
          return res;
        })
      );

      const allScenes = blockResults.flat();
      if (allScenes.length >= 18) {
        onProgress?.(
          92,
          'Fase 4/4: Normalizando tiempos, elenco por escena y efectos de cámara...',
          `${allScenes.length} escenas generadas`
        );
        const normalizedScenes = this.normalizeAndEnrichScenes(
          allScenes,
          persona,
          dossier,
          topic,
          cast
        );
        const totalWords = normalizedScenes.reduce(
          (acc, s) => acc + s.voiceover.split(/\s+/).length,
          0
        );
        const totalDurationSec = normalizedScenes.reduce((acc, s) => acc + s.durationInSeconds, 0);
        console.log(
          `✓ [Script Showrunner] Guion completado: ${normalizedScenes.length} escenas | ${totalWords} palabras | ${(
            totalDurationSec / 60
          ).toFixed(1)} minutos estimados.`
        );

        return {
          project_id: projectId,
          channel_id: persona.channel_id,
          lastActiveStep: 2,
          language: 'es',
          voiceEngine: persona.default_voice_engine || 'openai',
          primaryVoice: persona.default_voice_id || undefined,
          title: topic,
          hook: normalizedScenes[0]?.voiceover.split('.')[0] || persona.narrator.signature_cues.openings[0],
          characterCompany: characterCompany || dossier.protagonist_profile.name,
          characters: CharacterService.pruneUnusedCharacters(normalizedScenes, cast || []),
          researchDossier: dossier,
          targetDurationMinutes,
          targetDurationRange: durationRange,
          scenes: normalizedScenes,
          status: 'characters_ready',
          createdAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      console.warn('[Script Showrunner] Fallback activado:', err.message);
    }

    onProgress?.(
      90,
      'Fase 4/4: Construyendo estructura completa de 24 escenas desde el Dossier Forense...',
      `Protagonista: ${dossier.protagonist_profile.name}`
    );

    // 3. FALLBACK DE 24 ESCENAS BASADO EN EL DOSSIER FORENSE
    const fallbackProj = this.generateFullDocumentaryFallback(
      projectId,
      topic,
      persona,
      dossier,
      targetDurationMinutes,
      cast
    );
    fallbackProj.lastActiveStep = 2;
    fallbackProj.targetDurationRange = durationRange;
    if (persona.default_voice_engine) fallbackProj.voiceEngine = persona.default_voice_engine;
    if (persona.default_voice_id) fallbackProj.primaryVoice = persona.default_voice_id;
    return fallbackProj;
  }

  private static async generateNarrativeBlock(
    spec: BlockGenerationSpec,
    topic: string,
    persona: ChannelPersona,
    dossier: ResearchDossier,
    openAIConfig: { name: string; url: string; key: string; model: string } | null,
    geminiKey: string,
    wordRange: WordRange,
    durationRange: DurationRange,
    cast?: CharacterProfile[]
  ): Promise<any[]> {
    const castDescription = cast && cast.length > 0
      ? `\nELENCO DISPONIBLE PARA ESTA HISTORIA (USA ESTOS IDs EXACTOS EN "character_ids"):\n` +
        cast.map((c) => `- ID "${c.character_id}": ${c.name} (${c.role || c.company_or_affiliation || 'Personaje'}) [${c.character_category === 'channel_lore_cast' ? 'Lore / Analogía Cotidiana' : 'Persona Real'}]`).join('\n')
      : '';

    const systemPrompt = `
Eres el Showrunner y Guionista Principal del canal documental "${persona.name}" (${persona.niche}).
Estás escribiendo el BLOQUE ${spec.blockIndex} de 3 de un documental de YouTube de ${durationRange.min} a ${durationRange.max} minutos en ESPAÑOL con estilo Thriller Documental Inmersivo (inspirado en MagnatesMedia, ColdFusion y Johnny Harris).

PERFIL DEL NARRADOR:
- Arquetipo: ${persona.narrator.archetype}
- Tono: ${persona.narrator.tone}
- Vocabulario preferido: ${persona.narrator.key_vocabulary.join(', ')}
- Frases prohibidas: ${persona.narrator.forbidden_phrases.join(', ')}

DOSSIER DE INVESTIGACIÓN VERIFICADA:
- Protagonista: ${JSON.stringify(dossier.protagonist_profile)}
- Antagonista / Contraparte: ${JSON.stringify(dossier.antagonist_profile)}
- Concepto Clave a Explicar: ${JSON.stringify(dossier.core_concept_explainer)}
- Cronología: ${JSON.stringify(dossier.chronology)}
- Cifras Duras: ${JSON.stringify(dossier.hard_numbers)}
- Detalles y Secretos ("Smoking Guns"): ${JSON.stringify(dossier.smoking_guns)}
${castDescription}

INSTRUCCIONES ESTRICTAS PARA ESTE BLOQUE (${spec.sceneCount} ESCENAS, de scene_id ${spec.sceneStartId} a ${
      spec.sceneStartId + spec.sceneCount - 1
    }):
${spec.actsDescription}

REGLAS DE REDACCIÓN PARA ALTA RETENCIÓN Y DURACIÓN (${durationRange.min}–${durationRange.max} MINUTOS):
1. Cada escena DEBE tener un "voiceover" rico, narrativo, cinematográfico y envolvente de entre **${wordRange.min} y ${wordRange.max} palabras** en español. ¡NO escribas resúmenes cortos de 25 palabras! Desarrolla la atmósfera, las emociones, las cifras y la tensión.
2. NUNCA uses barras "/" ni paréntesis "( )" dentro de "voiceover". Escribe las cifras de forma natural para un locutor humano.
3. Alterna el campo "shot_type" entre las escenas para que el video sea visualmente dinámico:
   - "character_closeup": Plano emocional del protagonista o personaje principal del momento.
   - "environment_wide": Plano abierto del lugar, oficinas, servidores, ciudad o entorno histórico.
   - "object_detail": Primer plano de un objeto clave, contrato, pantalla financiera, código o herramienta.
   - "antagonist_shot": Plano dramático del rival, competidor o fuerza opuesta.
   - "concept_diagram": Escena visual metafórica que ilustra el concepto explicado (si hay personaje de lore como Juanito, ponlo a protagonizar la metáfora).
   - "symbolic_silhouette": Silueta cinematográfica de alta tensión.
4. En "character_ids", incluye un arreglo con los IDs exactos de los personajes que aparecen en esta escena (ej: ["${cast?.[0]?.character_id || 'protagonist'}"]). Si es una escena de solo objetos o entorno sin personas, usa [].
5. En cada escena incluye "highlight_metric" (máx 18 caracteres, ej: "$124 MILLONES", "AÑO 2008", "BURN RATE", "-50% TRÁFICO") y "highlight_label" (máx 26 caracteres, ej: "CAPITAL QUEMADO", "EL ORIGEN", "CONCEPTO CLAVE", "ÉXODO EN 72 HORAS") para mostrar tarjetas forenses en pantalla.
6. En "visual_prompt", escribe en INGLÉS la descripción visual de la escena indicando un único encuadre cinematográfico ("Single unified 16:9 frame, no grid, no split screen").

DEVUELVE ÚNICAMENTE UN OBJETO JSON con la propiedad "scenes" conteniendo exactamente ${spec.sceneCount} escenas:
{
  "scenes": [
    {
      "scene_id": ${spec.sceneStartId},
      "chapter": "Título corto del capítulo",
      "act_number": 1,
      "narrative_block": "hook_climax" | "protagonist_origin" | "antagonist_rival" | "concept_explainer" | "collision_collapse" | "aftermath_verdict",
      "shot_type": "character_closeup" | "environment_wide" | "object_detail" | "antagonist_shot" | "concept_diagram" | "symbolic_silhouette",
      "character_ids": ["id_del_personaje"],
      "highlight_metric": "...",
      "highlight_label": "...",
      "voiceover": "Texto narrativo de ${wordRange.min} a ${wordRange.max} palabras en español...",
      "visual_prompt": "Detailed cinematic 16:9 scene description in English...",
      "camera_motion": "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
    }
  ]
}
`;

    if (openAIConfig) {
      try {
        const res = await fetch(openAIConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIConfig.key}`,
          },
          body: JSON.stringify({
            model: openAIConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Redacta las ${spec.sceneCount} escenas del Bloque ${spec.blockIndex} para el documental "${topic}". Asegúrate de que cada escena tenga entre ${wordRange.min} y ${wordRange.max} palabras de narración absorbente.`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.72,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
              console.log(
                `   ✓ [Bloque ${spec.blockIndex}/3] ${parsed.scenes.length} escenas redactadas con ${openAIConfig.name}`
              );
              return parsed.scenes;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Bloque ${spec.blockIndex}] Error con ${openAIConfig.name}:`, err.message);
      }
    }

    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    systemPrompt +
                    `\n\nRedacta las ${spec.sceneCount} escenas del Bloque ${spec.blockIndex} para "${topic}".`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.72,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
            return parsed.scenes;
          }
        }
      } catch (err: any) {
        console.warn(`[Bloque ${spec.blockIndex}] Error con Gemini:`, err.message);
      }
    }

    throw new Error(`No se pudo generar el bloque ${spec.blockIndex} con proveedores externos`);
  }

  private static normalizeAndEnrichScenes(
    rawScenes: any[],
    persona: ChannelPersona,
    dossier: ResearchDossier,
    topic: string,
    cast?: CharacterProfile[]
  ): SceneItem[] {
    const shotRotation: ShotType[] = [
      'character_closeup',
      'environment_wide',
      'object_detail',
      'character_closeup',
      'antagonist_shot',
      'concept_diagram',
      'environment_wide',
      'symbolic_silhouette',
    ];

    const motionRotation: Array<'zoom_in' | 'pan_left' | 'zoom_out' | 'pan_right'> = [
      'zoom_in',
      'pan_left',
      'zoom_out',
      'pan_right',
    ];

    const enriched: SceneItem[] = rawScenes.map((s, idx) => {
      const sceneId = idx + 1;
      const cleanVoiceover = this.sanitizeVoiceover(s.voiceover || '');
      const wordCount = cleanVoiceover.split(/\s+/).filter(Boolean).length;
      const wpm = persona.narrator.target_wpm || 135;
      const calculatedSeconds = Math.max(18, Math.round((wordCount / wpm) * 60));

      const actNum =
        s.act_number ||
        (sceneId <= 4
          ? 1
          : sceneId <= 8
          ? 2
          : sceneId <= 12
          ? 3
          : sceneId <= 16
          ? 4
          : sceneId <= 21
          ? 5
          : 6);

      const blockMap: Record<number, NarrativeBlockType> = {
        1: 'hook_climax',
        2: 'protagonist_origin',
        3: 'antagonist_rival',
        4: 'concept_explainer',
        5: 'collision_collapse',
        6: 'aftermath_verdict',
      };

      const defaultNumber =
        dossier.hard_numbers[idx % Math.max(1, dossier.hard_numbers.length)] || {
          metric: `ACTO ${actNum}`,
          label: s.chapter || 'EXPEDIENTE FORENSE',
        };

      const shot = (s.shot_type as ShotType) || shotRotation[idx % shotRotation.length];
      const isCharShot = shot === 'character_closeup' || shot === 'antagonist_shot';
      const motionMode: VisualMotionMode =
        (s.motion_mode as VisualMotionMode) ||
        (isCharShot ? 'character_alive' : 'cinematic_camera');
      const characterEffect: EmotionalAnimationEffect =
        (s.character_effect as EmotionalAnimationEffect) ||
        (isCharShot ? this.detectEmotionalEffect(cleanVoiceover, s.chapter || '') : 'none');

      return {
        scene_id: sceneId,
        chapter: s.chapter || `Capítulo ${actNum}: Escena ${sceneId}`,
        act_number: actNum,
        narrative_block: (s.narrative_block as NarrativeBlockType) || blockMap[actNum],
        shot_type: shot,
        character_ids: Array.isArray(s.character_ids) ? s.character_ids : undefined,
        highlight_metric: s.highlight_metric || defaultNumber.metric,
        highlight_label: s.highlight_label || defaultNumber.label,
        voiceover: cleanVoiceover,
        visual_prompt:
          s.visual_prompt ||
          `${persona.visual_style.prompt_prefix} Single unified cinematic 16:9 frame representing ${topic}, ${persona.visual_style.prompt_suffix}`,
        camera_motion: s.camera_motion || motionRotation[idx % motionRotation.length],
        durationInSeconds: calculatedSeconds,
        motion_mode: motionMode,
        character_effect: characterEffect,
        videoUrl: s.videoUrl,
      };
    });

    return cast && cast.length > 0
      ? CharacterService.assignCharactersToScenes(enriched, cast)
      : enriched;
  }

  /**
   * Genera un documental completo de 24 escenas (6 Actos) usando el Dossier Forense si las APIs de texto no responden
   */
  private static generateFullDocumentaryFallback(
    projectId: string,
    topic: string,
    persona: ChannelPersona,
    dossier: ResearchDossier,
    targetDurationMinutes: number,
    cast?: CharacterProfile[]
  ): ProjectScript {
    const pName = dossier.protagonist_profile.name;
    const aName = dossier.antagonist_profile.name;
    const cName = dossier.core_concept_explainer.concept_name;
    const opening = persona.narrator.signature_cues.openings[0];
    const transition = persona.narrator.signature_cues.transitions[0];
    const closing = persona.narrator.signature_cues.closings[0];

    const rawTemplates: Array<{
      chapter: string;
      act_number: number;
      narrative_block: NarrativeBlockType;
      shot_type: ShotType;
      highlight_metric: string;
      highlight_label: string;
      voiceover: string;
      visual_prompt: string;
    }> = [
      // ACTO 1: EL GANCHO EN LA CIMA (Escenas 1-4)
      {
        chapter: 'El Imperio Intocable',
        act_number: 1,
        narrative_block: 'hook_climax',
        shot_type: 'character_closeup',
        highlight_metric: dossier.hard_numbers[0]?.metric || 'CIMA ABSOLUTA',
        highlight_label: dossier.hard_numbers[0]?.label || 'EL GRAN ESPEJISMO',
        voiceover: `${opening} Esta es la historia de ${pName}. En su momento de mayor gloria, no solo era considerado el ganador indiscutible de su industria, sino el estratega más brillante según todos los indicadores visibles. Los titulares lo llamaban el futuro inevitable, y los cheques de millones de dólares aterrizaban sobre su escritorio sin que nadie hiciera una sola pregunta incómoda.`,
        visual_prompt: `Heroic low-angle cinematic medium shot of ${pName} standing in a luxury high-rise overlooking the city at golden hour, confident expression, single unified 16:9 frame`,
      },
      {
        chapter: 'La Promesa del Futuro',
        act_number: 1,
        narrative_block: 'hook_climax',
        shot_type: 'environment_wide',
        highlight_metric: dossier.hard_numbers[1]?.metric || 'CRECIMIENTO RÉCORD',
        highlight_label: dossier.hard_numbers[1]?.label || 'EUFORIA DEL MERCADO',
        voiceover: `Desde afuera, la maquinaria parecía perfecta. Cada conferencia era un espectáculo de luces y cada comunicado de prensa prometía reescribir las reglas del mercado para siempre. Miles de usuarios e inversores hacían fila para formar parte de una revolución que, sobre el papel, no tenía fisuras ni techo financiero visible.`,
        visual_prompt: `Wide cinematic shot of a packed modern auditorium with glowing giant presentation screens and dramatic stage lighting, single unified 16:9 frame`,
      },
      {
        chapter: 'El Espejismo de los Números',
        act_number: 1,
        narrative_block: 'hook_climax',
        shot_type: 'object_detail',
        highlight_metric: dossier.hard_numbers[2]?.metric || 'ALERTA OCULTA',
        highlight_label: dossier.hard_numbers[2]?.label || 'TRAS BAMBALINAS',
        voiceover: `Sin embargo, detrás de las puertas blindadas de la junta directiva, se gestaba una tormenta silenciosa. Mientras el mundo aplaudía el crecimiento meteórico, una serie de decisiones tomadas en privado estaban convirtiendo ese coloso en una bomba de tiempo lista para detonar en cualquier segundo.`,
        visual_prompt: `Macro close-up shot of confidential financial folders and a glowing tablet showing volatile metrics on a dark mahogany table, moody lighting`,
      },
      {
        chapter: 'Antes de la Tormenta',
        act_number: 1,
        narrative_block: 'hook_climax',
        shot_type: 'character_closeup',
        highlight_metric: 'EXPEDIENTE #01',
        highlight_label: pName.toUpperCase().slice(0, 24),
        voiceover: `Pero antes de entrar a contarte cómo se derrumbó este imperio en cuestión de horas y cómo se evaporaron millones de dólares frente a los ojos de todos, tenemos que retroceder en el tiempo. Porque para entender el colapso, primero tengo que contarte quién es realmente ${pName}.`,
        visual_prompt: `Dramatic split-lighting portrait of ${pName} looking over their shoulder in a dark hallway, mystery and tension, cinematic 35mm`,
      },
      // ACTO 2: EXPEDIENTE DEL PROTAGONISTA (Escenas 5-8)
      {
        chapter: `El Origen de ${pName}`,
        act_number: 2,
        narrative_block: 'protagonist_origin',
        shot_type: 'environment_wide',
        highlight_metric: 'LOS INICIOS',
        highlight_label: 'ORIGEN DEL FUNDADOR',
        voiceover: `${dossier.protagonist_profile.backstory} Mucho antes de los reflectores y las portadas en las revistas financieras, su historia comenzó lejos del glamour corporativo. Desde sus primeros pasos, demostró una habilidad magnética poco común: la capacidad de convencer a cualquiera de que su visión ya era una realidad consumada.`,
        visual_prompt: `Humble early work environment, small cluttered room with late-night desk lamp, notebooks and early prototypes, nostalgic cinematic atmosphere`,
      },
      {
        chapter: 'El Ascenso del Estratega',
        act_number: 2,
        narrative_block: 'protagonist_origin',
        shot_type: 'character_closeup',
        highlight_metric: 'EL ASCENSO',
        highlight_label: 'CARISMA Y AMBICIÓN',
        voiceover: `${dossier.protagonist_profile.greatest_achievement} Esa victoria temprana transformó por completo su reputación. Quienes trabajaron a su lado durante aquellos años recuerdan a un líder obsesivo, capaz de doblar la voluntad de inversores veteranos con una sola presentación y una confianza que rozaba la temeridad.`,
        visual_prompt: `Medium shot of ${pName} pitching passionately to amazed executives around a glass table, warm golden sunlight, dynamic composition`,
      },
      {
        chapter: 'La Psicología del Poder',
        act_number: 2,
        narrative_block: 'protagonist_origin',
        shot_type: 'object_detail',
        highlight_metric: 'PUNTO CIEGO',
        highlight_label: 'PSICOLOGÍA DEL LÍDER',
        voiceover: `Pero el éxito acelerado suele cobrar un peaje invisible en la mente de quien lo experimenta. ${dossier.protagonist_profile.psychological_flaw} Cuando estás acostumbrado a que cada apuesta arriesgada salga bien, empiezas a creer que las leyes de la gravedad financiera simplemente no se aplican a ti.`,
        visual_prompt: `Close-up of a luxury wristwatch and a fountain pen signing a multimillion contract, sharp reflections, high contrast lighting`,
      },
      {
        chapter: 'La Semilla de la Soberbia',
        act_number: 2,
        narrative_block: 'protagonist_origin',
        shot_type: 'character_closeup',
        highlight_metric: 'LA GRIETA',
        highlight_label: 'CULTURA DE EXCESOS',
        voiceover: `${dossier.smoking_guns[0] || 'Las señales de alerta internas fueron silenciadas una tras otra.'} Cualquiera que cuestionara la velocidad del gasto era visto como un obstáculo para la visión. Y mientras ${pName} miraba únicamente hacia arriba, dejó de mirar hacia los costados.`,
        visual_prompt: `${pName} walking past worried engineers in a sleek modern office, motion blur in background, cold blue corporate tones`,
      },
      // ACTO 3: EL ANTAGONISTA O RIVAL (Escenas 9-12)
      {
        chapter: `La Sombra de ${aName}`,
        act_number: 3,
        narrative_block: 'antagonist_rival',
        shot_type: 'antagonist_shot',
        highlight_metric: 'EL CONTRAPESO',
        highlight_label: aName.toUpperCase().slice(0, 24),
        voiceover: `Porque en toda gran historia de poder existe una fuerza opuesta. Mientras el protagonista celebraba cada titular como una victoria definitiva, en el otro extremo del tablero entraba en escena un actor determinante: ${aName}, actuando como ${dossier.antagonist_profile.role}.`,
        visual_prompt: `Shadowy cinematic boardroom where rival strategists and analysts examine financial charts on a large dark monitor, thriller aesthetic`,
      },
      {
        chapter: 'La Partida Silenciosa',
        act_number: 3,
        narrative_block: 'antagonist_rival',
        shot_type: 'environment_wide',
        highlight_metric: 'GUERRA FRÍA',
        highlight_label: 'TABLERO ESTRATÉGICO',
        voiceover: `${dossier.antagonist_profile.relationship_to_protagonist} A diferencia del ruido mediático que rodeaba a ${pName}, del otro lado operaban con frialdad quirúrgica. No necesitaban grandes discursos; les bastaba con observar los datos reales que el mercado estaba empezando a revelar.`,
        visual_prompt: `High-angle cinematic shot of a massive data center and financial trading floor at night, cold neon cyan and dark slate tones`,
      },
      {
        chapter: 'El Movimiento Maestro',
        act_number: 3,
        narrative_block: 'antagonist_rival',
        shot_type: 'object_detail',
        highlight_metric: 'JAQUE MATE',
        highlight_label: 'LA JUGADA CLAVE',
        voiceover: `Fue entonces cuando se ejecutó la jugada que cambiaría el destino de toda la historia: ${dossier.antagonist_profile.key_move} Aquel movimiento dejó al descubierto lo que durante meses se había ocultado bajo una alfombra de marketing millonario.`,
        visual_prompt: `Close-up of a chess king piece tipping over on a glass table with financial audit documents in the background, dramatic chiaroscuro`,
      },
      {
        chapter: 'La Pregunta Inevitable',
        act_number: 3,
        narrative_block: 'antagonist_rival',
        shot_type: 'symbolic_silhouette',
        highlight_metric: 'EL MECANISMO',
        highlight_label: 'LA TRAMPA OCULTA',
        voiceover: `Pero detengámonos un segundo en este punto exacto. ¿Cómo es posible que una organización respaldada por cientos de millones de dólares quede acorralada tan rápido? Para entender por qué el desastre era matemáticamente inevitable, primero tenemos que entender un concepto fundamental.`,
        visual_prompt: `Silhouette of a lone executive standing before a giant glowing screen showing a complex financial web, moody atmospheric fog`,
      },
      // ACTO 4: EL PARÉNTESIS MAESTRO / CONCEPT EXPLAINER (Escenas 13-16)
      {
        chapter: `¿Qué es ${cName}?`,
        act_number: 4,
        narrative_block: 'concept_explainer',
        shot_type: 'concept_diagram',
        highlight_metric: 'CONCEPTO CLAVE',
        highlight_label: cName.toUpperCase().slice(0, 24),
        voiceover: `Hablemos de lo que los analistas forenses llaman ${cName}. En términos sencillos, ${dossier.core_concept_explainer.simple_definition} Es una de esas reglas silenciosas de la economía que parece inofensiva durante los tiempos de bonanza, pero que resulta letal cuando cambia el viento.`,
        visual_prompt: `Cinematic 3D conceptual visualization of financial scales tipping over with glowing gold coins turning into smoke against a dark slate background`,
      },
      {
        chapter: 'La Analogía Perfecta',
        act_number: 4,
        narrative_block: 'concept_explainer',
        shot_type: 'concept_diagram',
        highlight_metric: 'LA ANALOGÍA',
        highlight_label: 'ECONOMÍA REAL',
        voiceover: `Para visualizarlo sin tecnicismos contables, imagínalo de esta manera: ${dossier.core_concept_explainer.everyday_analogy} Desde la calle, cualquiera que vea el local lleno pensaría que el dueño se está haciendo multimillonario cada minuto.`,
        visual_prompt: `Stylized cinematic illustration of a bustling storefront with a long crowd outside while inside a vault rapidly empties out, dramatic contrast`,
      },
      {
        chapter: 'La Ilusión Óptica',
        act_number: 4,
        narrative_block: 'concept_explainer',
        shot_type: 'object_detail',
        highlight_metric: 'SALDO CERO',
        highlight_label: 'EL LÍMITE MATEMÁTICO',
        voiceover: `El problema de ese modelo es que cuanto más rápido creces, más rápido te acercas al precipicio. La popularidad te da titulares, premios y aplausos, pero cada nuevo usuario o cada nueva venta sin rentabilidad real es en realidad un clavo más en el ataúd financiero.`,
        visual_prompt: `Extreme close-up of a digital countdown timer and a burning fuse next to a stack of corporate bonds, intense red and amber lighting`,
      },
      {
        chapter: 'La Bomba Activada',
        act_number: 4,
        narrative_block: 'concept_explainer',
        shot_type: 'character_closeup',
        highlight_metric: 'PUNTO CRÍTICO',
        highlight_label: 'REGRESO A LA HISTORIA',
        voiceover: `Y eso nos lleva de vuelta a nuestra historia principal. Porque ${dossier.core_concept_explainer.why_it_matters_here} Cuando las reservas llegaron al límite, la física financiera reclamó su deuda de golpe.`,
        visual_prompt: `${pName} staring at a red financial warning screen in a dark office late at night, beads of sweat, intense close-up`,
      },
      // ACTO 5: EL CHOQUE DE TRENES Y EL COLAPSO (Escenas 17-21)
      {
        chapter: 'El Inicio del Pánico',
        act_number: 5,
        narrative_block: 'collision_collapse',
        shot_type: 'environment_wide',
        highlight_metric: dossier.chronology[2]?.date_or_period || 'FASE CRÍTICA',
        highlight_label: 'SEÑAL DE ALARMA',
        voiceover: `${transition} ${dossier.smoking_guns[1] || 'Las reuniones de emergencia comenzaron a sucederse a puerta cerrada.'} Los teléfonos de los directivos no dejaban de sonar a las tres de la madrugada, mientras los informes internos confirmaban que el margen de maniobra había desaparecido por completo.`,
        visual_prompt: `Chaotic late-night corporate war room, scattered papers, glowing laptops with plunging red charts, harsh overhead fluorescent light`,
      },
      {
        chapter: 'La Verdad al Descubierto',
        act_number: 5,
        narrative_block: 'collision_collapse',
        shot_type: 'object_detail',
        highlight_metric: dossier.hard_numbers[0]?.metric || 'AUDITORÍA',
        highlight_label: 'LOS NÚMEROS REALES',
        voiceover: `Cuando finalmente se abrieron los libros contables de par en par, el contraste dejó helados incluso a los veteranos más cínicos. ${dossier.smoking_guns[2] || 'La brecha entre lo prometido y la caja real era sencillamente insalvable.'} Ya no había discurso carismático capaz de tapar el agujero.`,
        visual_prompt: `Close-up of audit spreadsheets stamped with red warnings and a shattered glass of water on a conference table, high tension`,
      },
      {
        chapter: 'Las 72 Horas Finales',
        act_number: 5,
        narrative_block: 'collision_collapse',
        shot_type: 'character_closeup',
        highlight_metric: '72 HORAS',
        highlight_label: 'CUENTA REGRESIVA',
        voiceover: `En menos de setenta y dos horas, la confianza se evaporó. Los aliados que semanas atrás se disputaban una foto con ${pName} dejaron de responder las llamadas. Las líneas de crédito se congelaron y el éxodo se volvió imparable.`,
        visual_prompt: `Dutch-angle close-up of ${pName} holding a phone in a darkened hallway as staff pack boxes in the blurred background`,
      },
      {
        chapter: 'El Éxodo Masivo',
        act_number: 5,
        narrative_block: 'collision_collapse',
        shot_type: 'environment_wide',
        highlight_metric: 'COLAPSO TOTAL',
        highlight_label: 'CIERRE DE OPERACIONES',
        voiceover: `Los pasillos que antes vibraban con promesas de cambiar el mundo quedaron sumidos en un silencio sepulcral. De un día para otro, cientos de empleados recibieron la noticia de que el sueño había terminado y que las puertas se cerraban de forma definitiva.`,
        visual_prompt: `Wide shot of an abandoned modern tech headquarters with empty desks, unplugged monitors, and cardboard boxes in dim blue light`,
      },
      {
        chapter: 'La Caída del Telón',
        act_number: 5,
        narrative_block: 'collision_collapse',
        shot_type: 'symbolic_silhouette',
        highlight_metric: 'LIQUIDACIÓN',
        highlight_label: 'FIN DEL IMPERIO',
        voiceover: `Lo que alguna vez fue valorado en cifras astronómicas terminó desmantelado por una fracción minúscula de su precio. El castillo de naipes no cayó por un ataque externo impredecible, sino por el peso insostenible de sus propias contradicciones internas.`,
        visual_prompt: `Solitary figure of ${pName} looking out a rain-streaked floor-to-ceiling window at a stormy night skyline, cold desaturated tones`,
      },
      // ACTO 6: LAS CENIZAS Y EL VEREDICTO FINAL (Escenas 22-24)
      {
        chapter: 'El Rastro de las Cenizas',
        act_number: 6,
        narrative_block: 'aftermath_verdict',
        shot_type: 'environment_wide',
        highlight_metric: 'EL DÍA DESPUÉS',
        highlight_label: 'IMPACTO EN LA INDUSTRIA',
        voiceover: `Cuando el polvo finalmente se asentó, el caso se convirtió en material de estudio obligatorio. Los inversores aprendieron por las malas que el carisma de un fundador jamás puede reemplazar a la disciplina de los fundamentos reales.`,
        visual_prompt: `Quiet morning mist over the financial district, empty conference room with sunlight cutting through dust motes, sober documentary style`,
      },
      {
        chapter: 'El Destino de los Protagonistas',
        act_number: 6,
        narrative_block: 'aftermath_verdict',
        shot_type: 'character_closeup',
        highlight_metric: 'EL LEGADO',
        highlight_label: 'DOS CAMINOS OPUESTOS',
        voiceover: `Con el paso del tiempo, mientras ${aName} consolidó su posición aprendiendo de los errores ajenos, el nombre de ${pName} quedó grabado como una advertencia permanente sobre el peligro de creer en tu propio espejismo.`,
        visual_prompt: `Contemplative profile portrait of ${pName} in twilight lighting, stoic expression, warm amber rim light against deep shadows`,
      },
      {
        chapter: 'El Veredicto Forense',
        act_number: 6,
        narrative_block: 'aftermath_verdict',
        shot_type: 'symbolic_silhouette',
        highlight_metric: 'VEREDICTO FINAL',
        highlight_label: persona.name.toUpperCase().slice(0, 24),
        voiceover: `${closing} Porque al final del día, la historia demuestra una y otra vez que puedes engañar a los titulares durante meses, pero jamás podrás engañar a la realidad para siempre.`,
        visual_prompt: `Powerful closing wide shot of a setting sun over a vast horizon with a lone silhouette, timeless documentary finale, 8k cinematic`,
      },
    ];

    const scenes = this.normalizeAndEnrichScenes(rawTemplates, persona, dossier, topic, cast);

    return {
      project_id: projectId,
      channel_id: persona.channel_id,
      language: 'es',
      voiceEngine: 'openai',
      title: topic,
      hook: opening,
      characterCompany: pName,
      characters: CharacterService.pruneUnusedCharacters(scenes, cast || []),
      researchDossier: dossier,
      targetDurationMinutes,
      scenes,
      status: 'characters_ready',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Traduce y adapta un guion aprobado en Español al Inglés Nativo de Documental (estilo MagnatesMedia / ColdFusion)
   * y prepara el proyecto para renderizado final con ElevenLabs.
   */
  static async translateProjectToEnglish(project: ProjectScript): Promise<ProjectScript> {
    dotenv.config({ override: true });
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

    const openAIConfig = openrouterKey
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

    if (!openAIConfig) {
      throw new Error('Se requiere una API Key activa (OpenRouter, DeepSeek o OpenAI) para traducir a inglés.');
    }

    console.log(`\n🇺🇸 [English Adaptation Engine] Adaptando proyecto "${project.title}" a Inglés Documental...`);

    const englishDurationRange = this.normalizeDurationRange(
      project.targetDurationRange ?? DEFAULT_DURATION_RANGE
    );
    const englishWordRange = this.computeWordsPerScene(
      englishDurationRange,
      ENGLISH_NARRATION_WPM,
      project.scenes.length
    );

    // Dividir las escenas en lotes de 8 para mantener la longitud exacta sin recortes
    const chunkSize = 8;
    const sceneChunks: SceneItem[][] = [];
    for (let i = 0; i < project.scenes.length; i += chunkSize) {
      sceneChunks.push(project.scenes.slice(i, i + chunkSize));
    }

    const translatedChunks = await Promise.all(
      sceneChunks.map(async (chunk, chunkIdx) => {
        const payload = chunk.map((s) => ({
          scene_id: s.scene_id,
          chapter: s.chapter,
          highlight_metric: s.highlight_metric,
          highlight_label: s.highlight_label,
          voiceover: s.voiceover,
        }));

        const res = await fetch(openAIConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIConfig.key}`,
          },
          body: JSON.stringify({
            model: openAIConfig.model,
            messages: [
              {
                role: 'system',
                content: `You are a master American documentary scriptwriter (style: MagnatesMedia, ColdFusion, Johnny Harris).
Translate and adapt the following Spanish documentary scenes into gripping, natural, high-retention English for YouTube.
Rules:
1. The final English video must last between ${englishDurationRange.min} and ${englishDurationRange.max} minutes. English narration is faster than Spanish, so each scene's "voiceover" MUST contain between ${englishWordRange.min} and ${englishWordRange.max} English words. If a literal translation is shorter, EXPAND it with vivid details, tension and context from the same scene. Do NOT summarize or shorten!
2. Do NOT use slashes "/" or parentheses "( )" inside "voiceover" so ElevenLabs reads it seamlessly.
3. Translate "chapter", "highlight_metric" (max 18 chars, e.g. "$124 MILLION", "72 HOURS"), and "highlight_label" (max 26 chars, e.g. "CAPITAL BURNED", "THE FATAL FLAW") into punchy English.
Return ONLY a valid JSON object: { "scenes": [ { "scene_id": number, "chapter": "...", "highlight_metric": "...", "highlight_label": "...", "voiceover": "..." } ] }`,
              },
              {
                role: 'user',
                content: JSON.stringify({ scenes: payload }),
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
          }),
        });

        if (!res.ok) {
          throw new Error(`Error traduciendo lote ${chunkIdx + 1}: HTTP ${res.status}`);
        }
        const data: any = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        return Array.isArray(parsed.scenes) ? parsed.scenes : [];
      })
    );

    const translatedMap = new Map<number, any>();
    for (const item of translatedChunks.flat()) {
      translatedMap.set(Number(item.scene_id), item);
    }

    // Traducir título y hook
    let englishTitle = project.title;
    let englishHook = project.hook;
    try {
      const metaRes = await fetch(openAIConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIConfig.key}`,
        },
        body: JSON.stringify({
          model: openAIConfig.model,
          messages: [
            {
              role: 'system',
              content:
                'Translate this documentary title and opening hook into high-CTR American English. Return JSON: { "title": "...", "hook": "..." }',
            },
            {
              role: 'user',
              content: JSON.stringify({ title: project.title, hook: project.hook }),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
        }),
      });
      if (metaRes.ok) {
        const metaData: any = await metaRes.json();
        const metaParsed = JSON.parse(metaData.choices?.[0]?.message?.content || '{}');
        if (metaParsed.title) englishTitle = metaParsed.title;
        if (metaParsed.hook) englishHook = metaParsed.hook;
      }
    } catch {
      // Keep existing if meta translation fails
    }

    // 1. Respaldar intactas las escenas en español y asegurar audio_es/ antes de adaptar a inglés
    let preservedScenesEs = project.scenes_es;
    if (!preservedScenesEs || preservedScenesEs.length === 0 || project.language === 'es') {
      const audioEsDir = path.join(STORAGE_DIR, project.project_id, 'audio_es');
      if (!fs.existsSync(audioEsDir)) {
        try {
          fs.mkdirSync(audioEsDir, { recursive: true });
        } catch {}
      }

      preservedScenesEs = project.scenes.map((s) => {
        const srcAudio = path.join(STORAGE_DIR, project.project_id, 'audio', `scene_${s.scene_id}.mp3`);
        const destAudio = path.join(audioEsDir, `scene_${s.scene_id}.mp3`);
        let esAudioUrl = s.audioUrl;

        if (fs.existsSync(srcAudio)) {
          try {
            if (!fs.existsSync(destAudio)) {
              fs.copyFileSync(srcAudio, destAudio);
            }
            esAudioUrl = `/storage/${project.project_id}/audio_es/scene_${s.scene_id}.mp3`;
          } catch (copyErr) {
            console.warn(`[Preserve ES Audio] No se pudo copiar audio escena ${s.scene_id}:`, copyErr);
          }
        }

        return {
          scene_id: s.scene_id,
          chapter_es: s.chapter,
          voiceover_es: s.voiceover,
          audioUrl: esAudioUrl,
          wordTimings: s.wordTimings,
          audioDurationSeconds: s.audioDurationSeconds || s.durationInSeconds,
          highlight_metric: s.highlight_metric,
          highlight_label: s.highlight_label,
        };
      });
    }

    const existingEnMap = new Map<number, any>();
    if (project.scenes_en && Array.isArray(project.scenes_en)) {
      for (const sen of project.scenes_en) {
        existingEnMap.set(sen.scene_id, sen);
      }
    }

    const updatedScenes: SceneItem[] = project.scenes.map((scene) => {
      const t = translatedMap.get(scene.scene_id);
      const enVoiceoverRaw = t?.voiceover || scene.voiceover;
      const cleanEnVoiceover = ScriptService.sanitizeVoiceover(enVoiceoverRaw, 'en');

      const existingEn = existingEnMap.get(scene.scene_id);
      const isVoiceoverSame = existingEn && existingEn.voiceover_en === cleanEnVoiceover;

      return {
        ...scene,
        chapter: t?.chapter || existingEn?.chapter_en || scene.chapter,
        highlight_metric: t?.highlight_metric || existingEn?.highlight_metric || scene.highlight_metric,
        highlight_label: t?.highlight_label || existingEn?.highlight_label || scene.highlight_label,
        voiceover: cleanEnVoiceover,
        // Limpiar audioUrl/wordTimings salvo que ya tuviéramos audio en inglés para este texto idéntico
        audioUrl: isVoiceoverSame ? existingEn?.audioUrl : undefined,
        wordTimings: isVoiceoverSame ? existingEn?.wordTimings : undefined,
        audioDurationSeconds: isVoiceoverSame ? existingEn?.audioDurationSeconds : undefined,
      };
    });

    const scenesEn = updatedScenes.map((s) => ({
      scene_id: s.scene_id,
      chapter_en: s.chapter,
      voiceover_en: s.voiceover,
      audioUrl: s.audioUrl,
      wordTimings: s.wordTimings,
      audioDurationSeconds: s.audioDurationSeconds,
      highlight_metric: s.highlight_metric,
      highlight_label: s.highlight_label,
    }));

    console.log(`✓ [English Adaptation Engine] ${updatedScenes.length} escenas adaptadas a Inglés (Track ES respaldado con ${preservedScenesEs.length} escenas).`);

    return {
      ...project,
      language: 'en',
      voiceEngine: project.voiceEngine || 'elevenlabs',
      title: englishTitle,
      hook: englishHook,
      scenes: updatedScenes,
      scenes_es: preservedScenesEs,
      scenes_en: scenesEn,
    };
  }

  /**
   * Ajusta quirúrgicamente una o más escenas de un guion usando IA (Director Asistente)
   * Permite afinar el tono, cambiar datos, enriquecer el prompt visual o modificar la narración.
   */
  static async adjustWithAI(
    project: ProjectScript,
    instruction: string,
    targetSceneId?: number | 'all'
  ): Promise<{ project: ProjectScript; summary: string; changedSceneIds: number[] }> {
    dotenv.config({ override: true });

    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim() || (process.env.GOOGLE_API_KEY || '').trim();

    const openAIConfig = openrouterKey
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

    const isSingleScene = typeof targetSceneId === 'number';
    let scenesForContext: any[] = [];

    if (isSingleScene) {
      const target = project.scenes.find((s) => s.scene_id === targetSceneId);
      if (!target) throw new Error(`Escena ${targetSceneId} no encontrada`);
      const targetIdx = project.scenes.findIndex((s) => s.scene_id === targetSceneId);
      const prev = targetIdx > 0 ? project.scenes[targetIdx - 1] : null;
      const next = targetIdx < project.scenes.length - 1 ? project.scenes[targetIdx + 1] : null;
      scenesForContext = [
        ...(prev ? [{ ...prev, isContext: true }] : []),
        { ...target, isTarget: true },
        ...(next ? [{ ...next, isContext: true }] : []),
      ];
    } else {
      scenesForContext = project.scenes;
    }

    const systemPrompt = `
Eres un Director de Cine y Showrunner de documentales de élite (estilo MagnatesMedia, ColdFusion, Johnny Harris).
Tu trabajo es revisar y afinar quirúrgicamente las escenas del documental según la instrucción del usuario.

REGLAS ESTRICTAS:
1. Retorna ÚNICAMENTE un JSON válido con la siguiente estructura:
{
  "summary": "Resumen claro y profesional de los cambios aplicados (en español, 1 o 2 oraciones)",
  "updatedScenes": [
    {
      "scene_id": 1,
      "chapter": "Título de capítulo",
      "highlight_metric": "Dato o cifra breve (máx 18 caracteres, ej: $120M, AÑO 2012)",
      "highlight_label": "Etiqueta forense (máx 26 caracteres, ej: PÉRDIDA NETA)",
      "voiceover": "Texto de locución ajustado (sin barras / ni paréntesis, fluido y cinematográfico)",
      "visual_prompt": "Descripción visual cinematográfica detallada en INGLÉS (Single unified 16:9 frame, 8k, photorealistic/style)",
      "camera_motion": "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
    }
  ]
}
2. Si el usuario pide cambios solo en una escena específica, modifica solo esa escena.
3. Si el usuario pide un cambio global o de tono, modifica las escenas pertinentes.
4. El "voiceover" debe preservar el idioma del proyecto (actual: ${project.language || 'es'}) y sonar completamente natural para locución.
5. El "visual_prompt" SIEMPRE debe ser en INGLÉS cinematográfico.
`;

    const userPrompt = `
PROYECTO: "${project.title}"
HOOK: "${project.hook}"
INSTRUCCIÓN DEL USUARIO / DIRECTOR:
"${instruction}"

${isSingleScene ? `OBJETIVO PRINCIPAL: Escena ${targetSceneId}` : 'OBJETIVO: Todo el documental o escenas mencionadas'}

ESCENAS DISPONIBLES:
${JSON.stringify(
  scenesForContext.map((s) => ({
    scene_id: s.scene_id,
    chapter: s.chapter,
    highlight_metric: s.highlight_metric,
    highlight_label: s.highlight_label,
    voiceover: s.voiceover,
    visual_prompt: s.visual_prompt,
    camera_motion: s.camera_motion,
    isTarget: s.isTarget,
  })),
  null,
  2
)}
`;

    let parsedResult: { summary: string; updatedScenes: any[] } | null = null;

    if (openAIConfig) {
      try {
        const res = await fetch(openAIConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIConfig.key}`,
          },
          body: JSON.stringify({
            model: openAIConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            parsedResult = JSON.parse(content);
          }
        }
      } catch (err: any) {
        console.warn(`[Director AI] Error con ${openAIConfig.name}:`, err.message);
      }
    }

    if (!parsedResult && geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + userPrompt }],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        });

        if (response.text) {
          parsedResult = JSON.parse(response.text);
        }
      } catch (err: any) {
        console.warn('[Director AI] Error con Gemini:', err.message);
      }
    }

    if (!parsedResult || !Array.isArray(parsedResult.updatedScenes)) {
      throw new Error('El modelo de IA no pudo generar las correcciones solicitadas.');
    }

    const changedSceneIds: number[] = [];
    const updatedScenes = project.scenes.map((existingScene) => {
      const match = parsedResult!.updatedScenes.find((u) => Number(u.scene_id) === existingScene.scene_id);
      if (!match) return existingScene;

      changedSceneIds.push(existingScene.scene_id);
      const cleanVoiceover = match.voiceover
        ? ScriptService.sanitizeVoiceover(match.voiceover, project.language || 'es')
        : existingScene.voiceover;

      return {
        ...existingScene,
        chapter: match.chapter || existingScene.chapter,
        highlight_metric: match.highlight_metric || existingScene.highlight_metric,
        highlight_label: match.highlight_label || existingScene.highlight_label,
        voiceover: cleanVoiceover,
        visual_prompt: match.visual_prompt || existingScene.visual_prompt,
        camera_motion: match.camera_motion || existingScene.camera_motion,
      };
    });

    console.log(
      `✓ [Director AI] Se ajustaron quirúrgicamente ${changedSceneIds.length} escenas: [${changedSceneIds.join(', ')}]`
    );

    return {
      project: {
        ...project,
        scenes: updatedScenes,
      },
      summary: parsedResult.summary || `Ajustes aplicados en ${changedSceneIds.length} escenas.`,
      changedSceneIds,
    };
  }
}

