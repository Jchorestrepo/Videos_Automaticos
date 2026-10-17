import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { ChannelPersona, ResearchDossier } from '../../src/types/index.ts';

export class ResearchService {
  /**
   * Extrae texto limpio de una URL de referencia (artículo, noticia, post-mortem)
   */
  private static async scrapeUrlText(url: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return '';
      const html = await res.text();
      const cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return cleaned.slice(0, 3500);
    } catch {
      return '';
    }
  }

  /**
   * Consulta Wikipedia (ES y EN) para obtener biografía y contexto histórico real
   */
  private static async fetchWikipediaExtracts(queries: string[]): Promise<string> {
    const snippets: string[] = [];

    for (const rawQuery of queries) {
      const q = rawQuery.trim();
      if (!q || q.length < 3) continue;

      for (const lang of ['es', 'en']) {
        try {
          const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            q
          )}&utf8=&format=json&srlimit=2`;
          const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'DocumentaryStudioBot/2.0' },
          });
          if (!searchRes.ok) continue;
          const searchData: any = await searchRes.json();
          const hits = searchData?.query?.search || [];

          for (const hit of hits.slice(0, 1)) {
            const pageTitle = hit.title;
            const extractUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&exchars=2200&titles=${encodeURIComponent(
              pageTitle
            )}&format=json`;
            const extRes = await fetch(extractUrl, {
              headers: { 'User-Agent': 'DocumentaryStudioBot/2.0' },
            });
            if (!extRes.ok) continue;
            const extData: any = await extRes.json();
            const pages = extData?.query?.pages || {};
            const firstPage: any = Object.values(pages)[0];
            if (firstPage?.extract) {
              snippets.push(`[Wikipedia ${lang.toUpperCase()} - ${pageTitle}]: ${firstPage.extract}`);
            }
          }
        } catch {
          // Ignore network error on individual query
        }
      }
    }

    return snippets.join('\n\n').slice(0, 7000);
  }

  /**
   * Ejecuta la investigación 360° (Protagonista, Antagonista, Concepto Clave, Cronología y Cifras)
   */
  static async conductDeepResearch(
    topic: string,
    persona: ChannelPersona,
    conflictDetails?: string,
    characterCompany?: string,
    sources?: string[]
  ): Promise<ResearchDossier> {
    dotenv.config({ override: true });
    console.log(`\n🔍 [Research Engine] Iniciando investigación forense 360° para: "${topic}"...`);

    // 1. Extraer entidades clave para buscar biografía y contexto
    const rawEntities = (characterCompany || topic)
      .split(/[\/,()-]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    const searchQueries = Array.from(new Set([...rawEntities, topic.slice(0, 60)])).slice(0, 4);

    // 2. Recolectar fuentes web en paralelo (URLs del Sheet + Wikipedia ES/EN)
    const [scrapedSources, wikiContext] = await Promise.all([
      Promise.all((sources || []).slice(0, 3).map((u) => this.scrapeUrlText(u))),
      this.fetchWikipediaExtracts(searchQueries),
    ]);

    const validScraped = scrapedSources.filter(Boolean);
    console.log(
      `   📚 Fuentes recolectadas: ${validScraped.length} artículos web + ${
        wikiContext ? `${wikiContext.length} chars de enciclopedia` : 'conocimiento base'
      }`
    );

    const rawEvidence = [
      conflictDetails ? `RESUMEN DEL CONFLICTO: ${conflictDetails}` : '',
      validScraped.length > 0 ? `ARTÍCULOS DE FUENTES:\n${validScraped.join('\n---\n')}` : '',
      wikiContext ? `CONTEXTO BIOGRÁFICO E HISTÓRICO:\n${wikiContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 10000);

    // 3. Sintetizar Dossier Forense con LLM
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    const cleanProtagonistName = (characterCompany || topic)
      .replace(/\s*\/.*$/, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    const researchSystemPrompt = `
Eres el Investigador Forense Jefe del canal documental "${persona.name}" (${persona.niche}).
Tu misión es construir un DOSSIER DE INVESTIGACIÓN PROFUNDA en ESPAÑOL para un documental de 10 a 15 minutos sobre: "${topic}".

Para que el documental sea extremadamente entretenido y NO tenga relleno, necesitamos investigar 4 pilares obligatorios:
1. PERFIL DEL PROTAGONISTA ("protagonist_profile"):
   - Quién es el personaje principal o fundador (${cleanProtagonistName}) y la empresa involucrada.
   - Su historia previa ("backstory"): de dónde salió, sus primeros negocios, fracasos o victorias antes del evento principal.
   - Su mayor logro ("greatest_achievement"): qué lo hizo parecer el mayor ganador o un genio invencible en su mejor momento.
   - Su falla psicológica ("psychological_flaw"): qué rasgo de soberbia, ceguera o ambición sembró su caída.

2. PERFIL DEL ANTAGONISTA O RIVAL ("antagonist_profile"):
   - Quién estaba del otro lado del tablero (un competidor directo como Reddit frente a Digg, un inversor institucional como Stripe, un auditor/periodista, o una fuerza implacable).
   - Qué movimiento clave ejecutó que dejó sin salida al protagonista.

3. EL CONCEPTO CLAVE EXPLICADO ("core_concept_explainer"):
   - Identifica el concepto financiero, económico, tecnológico o histórico que explica la tragedia (ej: "Quiebra por Burn Rate y Unit Economics Negativos", "Efecto de Red Inverso", "Valoración Ficticia de Unicornio", "Liquidación Forzosa", etc.).
   - "simple_definition": Explicación clara y fascinante de qué es ese concepto.
   - "everyday_analogy": Una analogía cotidiana brillante para que cualquier espectador lo entienda en 30 segundos y sienta que aprendió algo valioso.
   - "why_it_matters_here": Por qué este concepto destruyó o definió el caso.

4. CRONOLOGÍA, CIFRAS DURAS Y MUNICIÓN NARRATIVA ("chronology", "hard_numbers", "smoking_guns"):
   - 6 a 8 hitos cronológicos con fechas/años reales.
   - 6 a 8 cifras contundentes ("metric" corto de máx 18 caracteres como "$124 MILLONES" o "-50% EN 72H", "label" corto como "CAPITAL QUEMADO", y "context").
   - 5 detalles jugosos, ironías, excesos o secretos ocultos ("smoking_guns").

DEVUELVE ÚNICAMENTE UN OBJETO JSON VÁLIDO con esta estructura exacta:
{
  "protagonist_profile": {
    "name": "...",
    "role": "...",
    "backstory": "...",
    "greatest_achievement": "...",
    "psychological_flaw": "..."
  },
  "antagonist_profile": {
    "name": "...",
    "role": "...",
    "relationship_to_protagonist": "...",
    "key_move": "..."
  },
  "core_concept_explainer": {
    "concept_name": "...",
    "simple_definition": "...",
    "everyday_analogy": "...",
    "why_it_matters_here": "..."
  },
  "chronology": [
    { "date_or_period": "...", "event": "..." }
  ],
  "hard_numbers": [
    { "metric": "...", "label": "...", "context": "..." }
  ],
  "smoking_guns": ["...", "..."]
}
`;

    const userPrompt = `
CASO A INVESTIGAR: ${topic}
PROTAGONISTA / EMPRESA: ${characterCompany || topic}
DATOS INICIALES DEL CASO: ${conflictDetails || topic}
EVIDENCIA RECOLECTADA EN LA WEB:
${rawEvidence || 'Utiliza tu base de conocimientos históricos y financieros verificados sobre este caso.'}
`;

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
        const res = await fetch(openAICompatibleConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAICompatibleConfig.key}`,
          },
          body: JSON.stringify({
            model: openAICompatibleConfig.model,
            messages: [
              { role: 'system', content: researchSystemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content) as ResearchDossier;
            parsed.raw_sources_summary = `Investigado vía ${openAICompatibleConfig.name} (${validScraped.length} fuentes web + Wikipedia)`;
            console.log(
              `   ✓ [Research Engine] Dossier completado: Protagonista="${parsed.protagonist_profile?.name}", Antagonista="${parsed.antagonist_profile?.name}", Concepto="${parsed.core_concept_explainer?.concept_name}"`
            );
            return parsed;
          }
        }
      } catch (err: any) {
        console.warn(`[Research Engine] Aviso con ${openAICompatibleConfig.name}:`, err.message);
      }
    }

    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: researchSystemPrompt + '\n\n' + userPrompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.5,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text) as ResearchDossier;
          parsed.raw_sources_summary = 'Investigado vía Google Gemini + Web';
          return parsed;
        }
      } catch (err: any) {
        console.warn('[Research Engine] Aviso con Gemini:', err.message);
      }
    }

    // Fallback determinista enriquecido si no hay conexión a APIs
    return this.buildFallbackDossier(topic, characterCompany, conflictDetails);
  }

  private static buildFallbackDossier(
    topic: string,
    characterCompany?: string,
    conflictDetails?: string
  ): ResearchDossier {
    const cleanName = (characterCompany || topic).split('/')[0].trim();
    const companyName =
      characterCompany && characterCompany.includes('/')
        ? characterCompany.split('/')[1].replace(/\(.*?\)/g, '').trim()
        : cleanName;

    return {
      protagonist_profile: {
        name: cleanName,
        role: `Fundador y estratega principal detrás de ${companyName}`,
        backstory: `Antes de convertirse en el rostro visible de ${companyName}, ${cleanName} forjó una reputación de ejecutor audaz capaz de vender visiones imposibles a los inversores más exigentes del mercado.`,
        greatest_achievement: `Logró posicionar a ${companyName} como el futuro indiscutible de su sector, levantando rondas multimillonarias en tiempo récord y acaparando titulares globales.`,
        psychological_flaw: `La convicción ciega de que el crecimiento superficial y el carisma mediático podían sustituir indefinidamente a un modelo financiero sostenible.`,
      },
      antagonist_profile: {
        name: 'La Realidad Contable y los Rivales Silenciosos',
        role: 'Competidores directos e inversores institucionales',
        relationship_to_protagonist:
          'Mientras el protagonista celebraba rondas de inversión, sus competidores optimizaban el producto real y los auditores comenzaban a revisar los libros.',
        key_move:
          'Cortar el flujo de capital de emergencia al descubrir la brecha insalvable entre el gasto mensual y la facturación real.',
      },
      core_concept_explainer: {
        concept_name: 'Burn Rate y la Trampa de los Unit Economics Negativos',
        simple_definition:
          'Es la velocidad a la que una empresa quema su efectivo disponible cuando cuesta diez veces más adquirir un cliente de lo que ese cliente genera en ingresos.',
        everyday_analogy:
          'Es como abrir una pizzería donde vendes cada pizza a 5 dólares, pero dentro de cada caja metes un billete de 20 dólares de regalo para atraer clientes. Tendrás una fila de diez cuadras y parecerás el restaurante más exitoso de la ciudad... hasta el minuto exacto en que se te acaben los billetes.',
        why_it_matters_here: `En ${companyName}, el crecimiento explosivo era en realidad un subsidio masivo que acercaba la bancarrota con cada nuevo usuario.`,
      },
      chronology: [
        { date_or_period: 'Fase 1: El Origen', event: `Nacimiento de la ambición de ${cleanName} y fundación de ${companyName}.` },
        { date_or_period: 'Fase 2: La Euforia', event: 'Inyección masiva de capital y expansión agresiva.' },
        { date_or_period: 'Fase 3: La Grieta', event: conflictDetails || 'Desconexión crítica entre gastos operativos e ingresos reales.' },
        { date_or_period: 'Fase 4: El Colapso', event: 'Cierre abrupto de operaciones y liquidación del imperio.' },
      ],
      hard_numbers: [
        { metric: '$100M+ USD', label: 'CAPITAL EN JUEGO', context: 'Valoración e inversión en el pico de euforia' },
        { metric: '10 A 1', label: 'DESBALANCE OPERATIVO', context: 'Proporción entre gasto mensual e ingresos reales' },
        { metric: '72 HORAS', label: 'VELOCIDAD DE CAÍDA', context: 'Tiempo desde el bloqueo de liquidez hasta el colapso' },
      ],
      smoking_guns: [
        conflictDetails || 'Cifras de crecimiento que ocultaban una pérdida neta por cada transacción.',
        'Gastos desmesurados en marketing de vanidad mientras el producto central presentaba fugas críticas.',
        'Rechazo a ofertas de rescate o advertencias internas antes del punto de no retorno.',
      ],
      raw_sources_summary: 'Dossier estructurado localmente',
    };
  }
}
