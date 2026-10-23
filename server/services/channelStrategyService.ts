import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { PersonaService } from './personaService.ts';
import { ProjectService } from './projectService.ts';
import { StoryBacklogService } from './storyBacklogService.ts';
import { CharacterService } from './characterService.ts';
import type {
  ChannelPersona,
  ChannelIncubatorConcept,
  ChannelAuditReport,
  LaunchBatchItem,
  SheetVideoItem,
} from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHANNELS_DIR = path.resolve(__dirname, '../../channels');

export class ChannelStrategyService {
  /**
   * Incuba un canal nuevo desde cero: Nombres, @handles, eslogan, arquetipo, estilo visual y 10 videos de lanzamiento
   */
  static async incubateChannelStrategy(
    topic: string,
    preferredTone?: string,
    language: string = 'es'
  ): Promise<ChannelIncubatorConcept> {
    dotenv.config({ override: true });

    const systemPrompt = `Eres el Director de Estrategia y Lanzamiento de Canales de YouTube de Mayor Crecimiento en habla hispana (especialista en canales documentales de alta retención como Magnates de los Negocios, Veritasium, Fern, Lemmino).
Tu tarea es incubar una propuesta de canal COMPLETA Y LISTA PARA TRIUNFAR a partir del siguiente concepto o nicho solicitado:
"${topic}"

Tono preferido del creador: ${preferredTone || 'Cinematográfico, analítico, riguroso y con ritmo de thriller'}
Idioma principal: ${language === 'en' ? 'Inglés' : 'Español'}

Debes diseñar un plan de posicionamiento competitivo que maximice el CTR, la autoridad temática y la retención de la audiencia.

Responde ÚNICAMENTE en formato JSON válido con la siguiente estructura exacta:
{
  "suggestedNames": [
    {
      "name": "Nombre de Canal 1",
      "handle": "@handle1",
      "tagline": "Eslogan memorable de 1 frase",
      "rationale": "Por qué este nombre resuena con el algoritmo y la psicología del espectador."
    },
    {
      "name": "Nombre de Canal 2",
      "handle": "@handle2",
      "tagline": "Eslogan memorable",
      "rationale": "Explicación de marketing."
    },
    {
      "name": "Nombre de Canal 3",
      "handle": "@handle3",
      "tagline": "Eslogan memorable",
      "rationale": "Explicación de marketing."
    },
    {
      "name": "Nombre de Canal 4",
      "handle": "@handle4",
      "tagline": "Eslogan memorable",
      "rationale": "Explicación de marketing."
    }
  ],
  "nicheAnalysis": {
    "targetAudience": "Descripción demográfica y psicológica del espectador ideal (edades, intereses, motivación).",
    "cpmTier": "Estimación del CPM (ej: Alto: $16 - $28 USD) y por qué atrae anunciantes de valor.",
    "competitiveMoat": "La ventaja injusta o ángulo diferenciador que hará que el canal destaque sobre la competencia existente."
  },
  "recommendedNarrator": {
    "archetype": "Arquetipo (ej: El Cronista Forense / El Testigo Ocular / El Analista Implacable)",
    "tone": "Tono de locución detallado para guiar la síntesis de voz.",
    "targetWpm": 145,
    "signatureOpenings": [
      "Frase de apertura característica 1",
      "Frase de apertura característica 2"
    ]
  },
  "recommendedVisualStyle": {
    "artStyleName": "3D Stylized Clay-Digital Diorama / Cinematic Noir / etc.",
    "promptPrefix": "Prompt base optimizado para Midjourney / Imagen 3 / DALL-E para generar fotogramas consistentes.",
    "lighting": "Esquema de iluminación (ej: Volumetric rim lighting, deep chiaroscuro shadows, amber accents).",
    "colorPalette": ["#111827", "#F59E0B", "#EF4444", "#3B82F6"]
  },
  "launchBatch": [
    {
      "title": "Título de Alto CTR Video 1",
      "hook": "Gancho de los primeros 15 segundos que atrapa al espectador.",
      "characterCompany": "Protagonista / Empresa / Sujeto central",
      "conflict": "El núcleo del conflicto dramático o misterio a desentrañar.",
      "whyItWorks": "Por qué este video funcionará con el algoritmo de YouTube.",
      "suggestedDurationMinutes": 12
    },
    { "title": "Título Video 2", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 14 },
    { "title": "Título Video 3", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 10 },
    { "title": "Título Video 4", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 15 },
    { "title": "Título Video 5", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 11 },
    { "title": "Título Video 6", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 13 },
    { "title": "Título Video 7", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 12 },
    { "title": "Título Video 8", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 16 },
    { "title": "Título Video 9", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 14 },
    { "title": "Título Video 10", "hook": "...", "characterCompany": "...", "conflict": "...", "whyItWorks": "...", "suggestedDurationMinutes": 15 }
  ]
}
`;

    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

    let parsedResult: ChannelIncubatorConcept | null = null;

    // 1. Gemini 3.8 Flash
    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        console.log('[Channel Incubator] Generando estrategia con Gemini...');
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const res = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.75,
          },
        });
        if (res.text) {
          parsedResult = JSON.parse(res.text);
        }
      } catch (err: any) {
        console.warn('[Channel Incubator] Error con Gemini:', err.message);
      }
    }

    // 2. OpenRouter Fallback
    if (!parsedResult && openrouterKey) {
      try {
        console.log('[Channel Incubator] Generando estrategia con OpenRouter...');
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
            temperature: 0.75,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) parsedResult = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('[Channel Incubator] Error con OpenRouter:', err.message);
      }
    }

    // 3. Fallback inteligente si no hay conexión
    if (!parsedResult) {
      console.log('[Channel Incubator] Generando estrategia de respaldo por plantilla...');
      parsedResult = this.createFallbackIncubatorConcept(topic);
    }

    return parsedResult;
  }

  /**
   * Genera el Logo 1:1 o Banner de YouTube con IA para el canal
   */
  static async generateBrandAsset(
    channelId: string,
    type: 'logo' | 'banner',
    prompt: string,
    aesthetic?: string
  ): Promise<{ publicUrl: string; filename: string }> {
    dotenv.config({ override: true });

    const assetsDir = path.join(CHANNELS_DIR, channelId, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.png`;
    const filePath = path.join(assetsDir, filename);
    const publicUrl = `/channel-assets/${channelId}/assets/${filename}`;

    const isLogo = type === 'logo';
    const enrichedPrompt = isLogo
      ? `Masterpiece circular YouTube channel avatar profile logo for "${prompt}". ${
          aesthetic || '3D stylized clay diorama iconic emblem'
        }. Single centered iconic focal symbol, bold clean silhouette, rich studio lighting, vibrant contrast, dark background, 8k render, NO text, NO tiny unreadable details, professional digital branding.`
      : `Masterpiece panoramic YouTube channel header banner artwork (16:9 widescreen) for "${prompt}". ${
          aesthetic || 'Epic 3D cinematic diorama narrative'
        }. Dramatic horizontal landscape, rich volumetric atmosphere, wide storytelling scene with ample negative space in the center for branding, 8k render, NO text, NO watermarks.`;

    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

    let generated = false;

    // 1. OpenRouter (Gemini 3.1 Flash Image)
    if (openrouterKey && !generated) {
      try {
        console.log(`[Brand Asset] Generando ${type} con OpenRouter...`);
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
            messages: [{ role: 'user', content: enrichedPrompt }],
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
              fs.writeFileSync(filePath, Buffer.from(await imgRes.arrayBuffer()));
              generated = true;
            }
          } else if (msg?.parts) {
            const part = msg.parts.find((p: any) => p.inlineData);
            if (part?.inlineData?.data) b64 = part.inlineData.data;
          }
          if (b64) {
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            generated = true;
          }
        }
      } catch (err: any) {
        console.warn(`[Brand Asset] Error OpenRouter:`, err.message);
      }
    }

    // 2. OpenAI Fallback
    if (openaiKey && openaiKey.startsWith('sk-') && !generated) {
      try {
        console.log(`[Brand Asset] Generando ${type} con OpenAI...`);
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1-mini',
            prompt: enrichedPrompt.slice(0, 950),
            n: 1,
            size: isLogo ? '1024x1024' : '1024x1024',
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const imgUrl = data.data?.[0]?.url;
          const b64 = data.data?.[0]?.b64_json;
          if (b64) {
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            generated = true;
          } else if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            fs.writeFileSync(filePath, Buffer.from(await imgRes.arrayBuffer()));
            generated = true;
          }
        }
      } catch (err: any) {
        console.warn(`[Brand Asset] Error OpenAI:`, err.message);
      }
    }

    // Fallback: Generar SVG con estilo moderno
    if (!generated) {
      const svg = isLogo
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <defs>
              <radialGradient id="g" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#090d16" />
              </radialGradient>
            </defs>
            <rect width="512" height="512" rx="256" fill="url(#g)" />
            <text x="256" y="275" font-family="sans-serif" font-weight="900" font-size="160" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
              ${channelId.slice(0, 2).toUpperCase()}
            </text>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
            <defs>
              <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1e1b4b" />
                <stop offset="50%" stop-color="#0f172a" />
                <stop offset="100%" stop-color="#020617" />
              </linearGradient>
            </defs>
            <rect width="1280" height="720" fill="url(#bg)" />
            <text x="640" y="360" font-family="sans-serif" font-weight="900" font-size="48" fill="#94a3b8" text-anchor="middle" letter-spacing="4">
              ${channelId.toUpperCase()} • DOCUMENTAL
            </text>
          </svg>`;
      const svgFile = `${type}_${timestamp}.svg`;
      fs.writeFileSync(path.join(assetsDir, svgFile), svg);
      return {
        publicUrl: `/channel-assets/${channelId}/assets/${svgFile}`,
        filename: svgFile,
      };
    }

    return {
      publicUrl,
      filename,
    };
  }

  /**
   * Crea oficialmente el canal y puebla automáticamente su Tablero de Tareas con el Lote de Lanzamiento
   */
  static async createChannelWithLaunchBatch(
    personaInput: Partial<ChannelPersona> & { name: string; channel_id?: string },
    launchBatch?: LaunchBatchItem[]
  ): Promise<{ channel: ChannelPersona; storyCount: number }> {
    const savedChannel = PersonaService.savePersona(personaInput);
    const channelId = savedChannel.channel_id;

    let storyCount = 0;
    if (launchBatch && launchBatch.length > 0) {
      const stories: SheetVideoItem[] = launchBatch.map((item, idx) => ({
        id: `story_${Date.now()}_${idx + 1}`,
        channel_id: channelId,
        rowIndex: idx + 1,
        title: item.title,
        characterCompany: item.characterCompany,
        conflict: item.conflict,
        sources: ['Investigación forense', 'Registros públicos', item.whyItWorks],
        status: 'approved',
        approved: true,
        finished: false,
        published: false,
        notes: `🎯 Gancho inicial: ${item.hook}\n💡 Por qué funciona: ${item.whyItWorks}\n⏱️ Duración sugerida: ${item.suggestedDurationMinutes} min`,
        createdAt: new Date().toISOString(),
      }));

      await StoryBacklogService.saveStories(channelId, stories);
      storyCount = stories.length;
    }

    return { channel: savedChannel, storyCount };
  }

  /**
   * Realiza una Auditoría Estratégica Completa con IA de un Canal Existente
   */
  static async auditChannel(channelId: string): Promise<ChannelAuditReport> {
    dotenv.config({ override: true });

    const persona = PersonaService.getPersona(channelId);
    if (!persona) {
      throw new Error(`Canal ${channelId} no encontrado`);
    }

    const projects = ProjectService.listProjects(channelId);
    const stories = await StoryBacklogService.getStories(channelId, false);
    const characters = CharacterService.getCharacters(channelId);

    // Métricas calculadas
    const totalProjects = projects.length;
    const renderedProjects = projects.filter((p) => p.status === 'rendered' || p.outputVideoUrl);
    const totalScenes = projects.reduce((acc, p) => acc + (p.scenes?.length || 0), 0);
    const totalDurationSeconds = projects.reduce(
      (acc, p) =>
        acc + (p.scenes || []).reduce((scAcc, sc) => scAcc + (sc.durationInSeconds || 5), 0),
      0
    );
    const totalMinutes = Math.round(totalDurationSeconds / 60);

    const projectTitles = projects.map((p) => p.title).slice(0, 15);
    const backlogTitles = stories.map((s) => s.title).slice(0, 15);
    const characterNames = characters.map((c) => `${c.name} (${c.role})`).slice(0, 10);

    const systemPrompt = `Eres el Auditor Senior de Canales de YouTube y Consultor de Crecimiento para canales de video-ensayos y documentales de alto impacto.
Analiza quirúrgicamente el estado actual de este canal de YouTube para diagnosticar su salud de retención, detectar fugas de audiencia y recomendar los próximos 5 videos que garanticen el éxito del canal.

DATOS REALES DEL CANAL:
- Canal: "${persona.name}" (${persona.display_title})
- Nicho: "${persona.niche}"
- Idioma: "${persona.language}"
- Tono del narrador: "${persona.narrator?.tone || 'Informativo'}"
- Arquetipo: "${persona.narrator?.archetype || 'El Investigador'}"
- Proyectos creados: ${totalProjects} (Renderizados listos: ${renderedProjects.length})
- Minutos de video totales producidos: ${totalMinutes} minutos
- Total de escenas producidas: ${totalScenes}
- Personajes en biblioteca: ${characters.length} (${characterNames.join(', ') || 'Ninguno'})
- Títulos de videos producidos:
${projectTitles.map((t) => `  • ${t}`).join('\n') || '  (Aún no hay videos producidos)'}
- Temas en backlog de producción:
${backlogTitles.map((t) => `  • ${t}`).join('\n') || '  (Backlog vacío)'}

Genera un reporte de auditoría exhaustivo, crítico y constructivo en formato JSON válido con la siguiente estructura exacta:
{
  "channelId": "${channelId}",
  "channelName": "${persona.display_title || persona.name}",
  "analyzedAt": "${new Date().toISOString()}",
  "healthScore": 88,
  "summaryDiagnosis": "Diagnóstico ejecutivo de 2-3 párrafos explicando cómo percibe el algoritmo de YouTube este canal según sus temas y ritmo.",
  "contentStrengths": [
    "Fortaleza 1 del contenido",
    "Fortaleza 2",
    "Fortaleza 3"
  ],
  "retentionRisks": [
    "Punto débil o riesgo de abandono de audiencia 1",
    "Riesgo 2",
    "Riesgo 3"
  ],
  "optimalDurationMinutes": "12 a 15 minutos (con explicación de por qué este rango maximiza retención y pausas publicitarias mid-roll)",
  "packagingAdvice": "Consejos específicos para las miniaturas y títulos de este canal para destacar en la página de inicio (browse features).",
  "franchiseIdeas": [
    {
      "title": "Nombre de la Franquicia o Serie",
      "concept": "Concepto de lista de reproducción serializada",
      "targetAudience": "Público al que engancha"
    },
    {
      "title": "Nombre Serie 2",
      "concept": "Concepto",
      "targetAudience": "Público"
    }
  ],
  "nextHitRecommendations": [
    {
      "title": "Título sugerido para Próximo Video Exitoso 1",
      "hook": "Gancho inicial de apertura de alto impacto.",
      "characterCompany": "Protagonista / Sujeto central",
      "conflict": "Conflicto o misterio central.",
      "strategicReason": "Por qué este video capitaliza la audiencia de los videos anteriores."
    },
    {
      "title": "Título Próximo Video 2",
      "hook": "...",
      "characterCompany": "...",
      "conflict": "...",
      "strategicReason": "..."
    },
    {
      "title": "Título Próximo Video 3",
      "hook": "...",
      "characterCompany": "...",
      "conflict": "...",
      "strategicReason": "..."
    },
    {
      "title": "Título Próximo Video 4",
      "hook": "...",
      "characterCompany": "...",
      "conflict": "...",
      "strategicReason": "..."
    },
    {
      "title": "Título Próximo Video 5",
      "hook": "...",
      "characterCompany": "...",
      "conflict": "...",
      "strategicReason": "..."
    }
  ]
}
`;

    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();

    let report: ChannelAuditReport | null = null;

    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        console.log(`[Channel Audit] Auditando ${channelId} con Gemini...`);
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const res = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });
        if (res.text) {
          report = JSON.parse(res.text);
        }
      } catch (err: any) {
        console.warn('[Channel Audit] Error Gemini:', err.message);
      }
    }

    if (!report && openrouterKey) {
      try {
        console.log(`[Channel Audit] Auditando ${channelId} con OpenRouter...`);
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
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) report = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('[Channel Audit] Error OpenRouter:', err.message);
      }
    }

    if (!report) {
      report = this.createFallbackAuditReport(persona, totalProjects, totalMinutes);
    }

    // Guardar reporte en channels/{channelId}/audit_report.json
    try {
      const channelDir = path.join(CHANNELS_DIR, channelId);
      if (fs.existsSync(channelDir)) {
        fs.writeFileSync(
          path.join(channelDir, 'audit_report.json'),
          JSON.stringify(report, null, 2),
          'utf-8'
        );
      }
    } catch (saveErr) {
      console.warn('No se pudo guardar audit_report.json:', saveErr);
    }

    return report;
  }

  /**
   * Obtiene el último reporte de auditoría guardado en disco si existe
   */
  static getSavedAuditReport(channelId: string): ChannelAuditReport | null {
    const reportPath = path.join(CHANNELS_DIR, channelId, 'audit_report.json');
    if (!fs.existsSync(reportPath)) return null;
    try {
      const content = fs.readFileSync(reportPath, 'utf-8');
      return JSON.parse(content) as ChannelAuditReport;
    } catch {
      return null;
    }
  }

  /**
   * Inyecta una recomendación de próximo video exitoso al backlog del canal (Paso 1)
   */
  static async injectHitStory(
    channelId: string,
    rec: { title: string; hook: string; characterCompany: string; conflict: string }
  ): Promise<SheetVideoItem> {
    const existingStories = await StoryBacklogService.getStories(channelId, false);
    const newStory: SheetVideoItem = {
      id: `story_audit_${Date.now()}`,
      channel_id: channelId,
      rowIndex: existingStories.length + 1,
      title: rec.title,
      characterCompany: rec.characterCompany,
      conflict: rec.conflict,
      sources: ['Recomendación del Asesor Estratégico IA', rec.hook],
      status: 'approved',
      approved: true,
      finished: false,
      published: false,
      notes: `💡 Recomendado por el Asesor IA:\n${rec.hook}`,
      createdAt: new Date().toISOString(),
    };

    const updated = [...existingStories, newStory];
    await StoryBacklogService.saveStories(channelId, updated);
    return newStory;
  }

  // --- MÉTODOS PRIVADOS DE RESPALDO (OFFLINE / FALLBACK) ---

  private static createFallbackIncubatorConcept(topic: string): ChannelIncubatorConcept {
    const cleanTopic = topic.slice(0, 30);
    return {
      suggestedNames: [
        {
          name: `${cleanTopic} Forense`,
          handle: `@${cleanTopic.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}forense`,
          tagline: 'Desarmando los misterios que cambiaron el mundo.',
          rationale: 'Transmite autoridad periodística y rigor de investigación.',
        },
        {
          name: `La Verdad Oculta`,
          handle: `@laverdadocultatv`,
          tagline: 'Lo que los registros oficiales nunca se atrevieron a contar.',
          rationale: 'Genera curiosidad inmediata y apela al instinto de descubrimiento.',
        },
        {
          name: `Crónicas del Poder`,
          handle: `@cronicasdelpoder`,
          tagline: 'Ambición, ascenso y caída de los imperios humanos.',
          rationale: 'Enfoque épico centrado en personajes y consecuencias globales.',
        },
        {
          name: `Archivo Confidencial`,
          handle: `@archivoconfidencial`,
          tagline: 'Documentales de alto impacto para mentes despiertas.',
          rationale: 'Ideal para algoritmos de recomendación en la página de inicio.',
        },
      ],
      nicheAnalysis: {
        targetAudience: 'Adultos de 22 a 45 años interesados en historias reales, negocios y psicología.',
        cpmTier: 'Alto ($16 - $26 USD) por su alto tiempo de reproducción y retención de adultos.',
        competitiveMoat: 'Narrativa visual inmersiva en dioramas 3D con ritmo de thriller periodístico.',
      },
      recommendedNarrator: {
        archetype: 'El Cronista Forense',
        tone: 'Cinematográfico, reflexivo, con pausas dramáticas y dicción precisa.',
        targetWpm: 145,
        signatureOpenings: [
          'Hay historias que el tiempo intenta enterrar...',
          'Lo que estás a punto de ver no fue un accidente...',
        ],
      },
      recommendedVisualStyle: {
        artStyleName: '3D Stylized Clay-Digital Diorama',
        promptPrefix: '3D miniature isometric diorama, highly detailed textures, dramatic volumetric rim lighting, 8k render',
        lighting: 'Volumetric studio rim lighting with warm key and cool dark fill.',
        colorPalette: ['#0f172a', '#f59e0b', '#ef4444', '#38bdf8'],
      },
      launchBatch: [
        {
          title: `El Ascenso y la Implosión de ${cleanTopic}`,
          hook: 'Cómo un imperio que parecía indestructible colapsó en solo semanas.',
          characterCompany: 'El Protagonista Principal',
          conflict: 'Ambición desmedida y desobediencia a las leyes del mercado.',
          whyItWorks: 'Arco trágico clásico que garantiza más del 65% de retención en YouTube.',
          suggestedDurationMinutes: 14,
        },
        {
          title: 'El Error Silencioso que Nadie Notó',
          hook: 'Una sola firma en un documento secreto selló el destino de millones.',
          characterCompany: 'El Escriba / Auditor',
          conflict: 'Negligencia deliberada y encubrimiento.',
          whyItWorks: 'Gatillo de curiosidad irresistible.',
          suggestedDurationMinutes: 12,
        },
        {
          title: 'La Traición que Creó un Monopolio',
          hook: 'Eran socios inseparables hasta que la codicia apareció.',
          characterCompany: 'Rival y Fundador',
          conflict: 'Traición empresarial y choque legal.',
          whyItWorks: 'El drama interpersonal supera a las cifras técnicas.',
          suggestedDurationMinutes: 15,
        },
        {
          title: 'El Juicio del Siglo: La Caída Final',
          hook: 'Frente al jurado, los secretos finalmente salieron a la luz.',
          characterCompany: 'El Tribunal',
          conflict: 'Rendición de cuentas y veredicto demoledor.',
          whyItWorks: 'Clímax con alta satisfacción para el espectador.',
          suggestedDurationMinutes: 16,
        },
        {
          title: 'Lo que Quedó: Las Ruinas del Imperio',
          hook: 'Años después del colapso, esta es la verdad que perdura.',
          characterCompany: 'Los Sobrevivientes',
          conflict: 'Consecuencias históricas y lecciones imborrables.',
          whyItWorks: 'Cierre de la primera temporada del canal.',
          suggestedDurationMinutes: 11,
        },
      ],
    };
  }

  private static createFallbackAuditReport(
    persona: ChannelPersona,
    totalProjects: number,
    totalMinutes: number
  ): ChannelAuditReport {
    return {
      channelId: persona.channel_id,
      channelName: persona.display_title || persona.name,
      analyzedAt: new Date().toISOString(),
      healthScore: 86,
      summaryDiagnosis: `El canal "${persona.name}" cuenta con una base sólida en el nicho de ${persona.niche}. Con ${totalProjects} proyectos producidos y ${totalMinutes} minutos de metraje generado, la identidad visual y el tono del narrador comienzan a ser reconocibles. Para maximizar el CTR, recomendamos elevar la tensión en las miniaturas usando rostros más expresivos y títulos de menos de 65 caracteres.`,
      contentStrengths: [
        'Excelente cohesión estética en los fondos diorámicos 3D.',
        'Locución con ritmo sostenido y adecuada sincronización de subtítulos.',
        'Estructura de guiones dividida claramente en actos dramáticos.',
      ],
      retentionRisks: [
        'Introducciones que tardan más de 25 segundos en plantear el conflicto central.',
        'Falta de elementos recurrentes (easter eggs o personajes insignia) entre episodios consecutivos.',
      ],
      optimalDurationMinutes: '12 a 16 minutos para optimizar retención de adultos y monetización CPM.',
      packagingAdvice: 'Utiliza colores de alto contraste en las miniaturas (amarillo puro sobre negro) y ubica el rostro del protagonista a la derecha.',
      franchiseIdeas: [
        {
          title: 'Los 5 Minutos Fatales',
          concept: 'Serie que analiza el instante exacto en que una decisión errónea provocó la ruina.',
          targetAudience: 'Espectadores ávidos de suspenso y consecuencias extremas.',
        },
        {
          title: 'Gigantes Caídos',
          concept: 'Arco cronológico de empresas y figuras que dominaron el mundo y desaparecieron.',
          targetAudience: 'Emprendedores, historiadores y curiosos del poder.',
        },
      ],
      nextHitRecommendations: [
        {
          title: 'La Decisión de $10.000 Millones que Arruinó su Vida',
          hook: 'Rechazó la mayor oferta de su época creyendo que valía el triple.',
          characterCompany: 'Fundador Histórico',
          conflict: 'Orgullo desmedido frente a la realidad del mercado.',
          strategicReason: 'Capitaliza el interés en grandes sumas de dinero y arrepentimiento.',
        },
        {
          title: 'El Secreto que Ocultaron Durante 40 Años',
          hook: 'Todos los empleados firmaron un pacto de silencio... hasta hoy.',
          characterCompany: 'El Testigo Clave',
          conflict: 'Encubrimiento institucional y revelación tardía.',
          strategicReason: 'Atrae visitas orgánicas masivas por brecha de curiosidad.',
        },
      ],
    };
  }
}
