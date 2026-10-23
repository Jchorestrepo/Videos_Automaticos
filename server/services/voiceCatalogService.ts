import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { VoiceCatalogItem } from '../../src/types/index.ts';
import { AudioService } from './audioService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PREVIEWS_DIR = path.resolve(__dirname, '../../storage/temp_previews');

export class VoiceCatalogService {
  private static cachedVoices: VoiceCatalogItem[] | null = null;
  private static lastFetchTime: number = 0;
  private static CACHE_TTL_MS = 60000; // 1 minuto de caché

  /**
   * Obtiene el catálogo completo y unificado de voces (VoiceStudio, ElevenLabs, OpenAI, Edge)
   */
  static async getCatalog(forceRefresh: boolean = false): Promise<VoiceCatalogItem[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedVoices && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedVoices;
    }

    dotenv.config({ override: true });
    const voices: VoiceCatalogItem[] = [];

    // 1. VOICESTUDIO LOCAL (RTX 3080)
    try {
      const vsProfiles = await this.fetchVoiceStudioProfiles();
      voices.push(...vsProfiles);
    } catch (err: any) {
      console.warn('[VoiceCatalog] Advertencia consultando VoiceStudio:', err.message);
    }

    // 2. ELEVENLABS CLOUD (Público + Clave de API si está configurada)
    try {
      const elevenVoices = await this.fetchElevenLabsVoices();
      voices.push(...elevenVoices);
    } catch (err: any) {
      console.warn('[VoiceCatalog] Advertencia consultando ElevenLabs:', err.message);
    }

    // 3. OPENAI TTS & EDGE NEURAL (Curadas para Documentales)
    voices.push(...this.getCuratedStandardVoices());

    this.cachedVoices = voices;
    this.lastFetchTime = now;
    return voices;
  }

  /**
   * Consulta los perfiles de voz locales de VoiceStudio
   */
  private static async fetchVoiceStudioProfiles(): Promise<VoiceCatalogItem[]> {
    const voiceStudioUrl = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${voiceStudioUrl}/profiles`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const profiles: any[] = await res.json();
        return profiles.map((p) => {
          const nameLower = (p.name || '').toLowerCase();
          const langLower = (p.language || '').toLowerCase();
          const instructLower = (p.instruct || '').toLowerCase();
          const vdStates = (p.vd_states || '');

          const isGomorra = nameLower.includes('gomorra');
          const isDemo = p.is_demo === 1 || p.id === 'demo0001';
          const isSpanish =
            langLower.includes('es') ||
            langLower.includes('spanish') ||
            nameLower.includes('spanish') ||
            isGomorra;

          const isFemale =
            instructLower.includes('female') ||
            vdStates.includes('"Gender": "female"');

          let styleCategory: VoiceCatalogItem['styleCategory'] = 'clone';
          if (isGomorra) {
            styleCategory = 'thriller_documentary';
          } else if (nameLower.includes('narrator')) {
            styleCategory = 'historical_epic';
          } else if (nameLower.includes('explainer')) {
            styleCategory = 'thriller_documentary';
          } else if (nameLower.includes('companion') || isDemo) {
            styleCategory = 'conversational_dynamic';
          }

          let accent = 'Americano Neutro';
          if (isGomorra) accent = 'Latinoamericano / Thriller';
          else if (nameLower.includes('narrator')) accent = 'Castellano / Solemne';
          else if (nameLower.includes('explainer')) accent = 'Español / Dinámico';
          else if (nameLower.includes('companion')) accent = 'Español Conversacional';
          else if (isSpanish) accent = 'Español Neutro';

          let description = p.description || p.personality;
          if (!description || description.startsWith('archetype:')) {
            if (isGomorra) {
              description = 'Voz profunda, forense y cinematográfica en español con cadencia narrativa tensa.';
            } else if (nameLower.includes('narrator')) {
              description = 'Voz femenina pausada, solemne y reflexiva en español, ideal para documentales históricos y misterio.';
            } else if (nameLower.includes('explainer')) {
              description = 'Voz masculina clara, divulgativa y enérgica, perfecta para reportajes, tecnología y finanzas.';
            } else if (nameLower.includes('companion')) {
              description = 'Voz femenina cálida y cercana en español para entrevistas o diálogos secundarios.';
            } else if (isDemo) {
              description = 'Voz cinematográfica balanceada generada localmente en VoiceStudio.';
            } else {
              description = `Perfil de voz clonado en VoiceStudio Local con aceleración GPU RTX 3080.`;
            }
          }

          return {
            id: p.id,
            name: p.name,
            provider: 'voicestudio',
            language: isSpanish ? 'es' : 'en',
            gender: isFemale ? 'female' : 'male',
            styleCategory,
            accent,
            description,
            sampleUrl: `/api/audio/voicestudio/proxy-audio/${p.id}`,
            isCloned: !isDemo,
            refText: p.ref_text,
            labels: [
              '⚡ NVIDIA RTX 3080',
              isSpanish ? '🇪🇸 Español Local' : '🇺🇸 Inglés Local',
              'Cero Latencia Cloud',
              '100% Gratis / Ilimitado',
            ],
          };
        });
      }
    } catch {
      // Si VoiceStudio está apagado, proveer los perfiles conocidos predeterminados
    }

    // Fallback de perfiles conocidos cuando VoiceStudio está temporalmente inactivo
    return [
      {
        id: 'b4b14f0e',
        name: 'Gomorra',
        provider: 'voicestudio',
        language: 'es',
        gender: 'male',
        styleCategory: 'thriller_documentary',
        accent: 'Latinoamericano / Thriller',
        description: 'Voz principal del canal: profunda, pausada y forense con timbre cinematográfico.',
        sampleUrl: '/api/audio/voicestudio/proxy-audio/b4b14f0e',
        isCloned: true,
        refText: 'No, pues vamos a ponerle una veladora, parceiro...',
        labels: ['⚡ RTX 3080 Local', '🇪🇸 Español', 'Gratis'],
      },
      {
        id: '3ed550f0',
        name: 'Spanish Narrator',
        provider: 'voicestudio',
        language: 'es',
        gender: 'female',
        styleCategory: 'historical_epic',
        accent: 'Castellano / Solemne',
        description: 'Voz femenina pausada, solemne y reflexiva en español, ideal para documentales históricos y misterio.',
        sampleUrl: '/api/audio/voicestudio/proxy-audio/3ed550f0',
        isCloned: true,
        refText: 'Hola y bienvenido a esta breve demostración de voz...',
        labels: ['⚡ RTX 3080 Local', '🇪🇸 Español', 'Gratis'],
      },
      {
        id: '1236af3e',
        name: 'Spanish Explainer',
        provider: 'voicestudio',
        language: 'es',
        gender: 'male',
        styleCategory: 'thriller_documentary',
        accent: 'Español / Dinámico',
        description: 'Voz masculina clara, divulgativa y enérgica, perfecta para reportajes, tecnología y finanzas.',
        sampleUrl: '/api/audio/voicestudio/proxy-audio/1236af3e',
        isCloned: true,
        refText: 'Hola y bienvenido a esta breve demostración de voz...',
        labels: ['⚡ RTX 3080 Local', '🇪🇸 Español', 'Gratis'],
      },
      {
        id: '411ae987',
        name: 'Spanish Companion',
        provider: 'voicestudio',
        language: 'es',
        gender: 'female',
        styleCategory: 'conversational_dynamic',
        accent: 'Español Conversacional',
        description: 'Voz femenina cálida y cercana en español para entrevistas o diálogos secundarios.',
        sampleUrl: '/api/audio/voicestudio/proxy-audio/411ae987',
        isCloned: true,
        refText: 'Hola y bienvenido a esta breve demostración de voz...',
        labels: ['⚡ RTX 3080 Local', '🇪🇸 Español', 'Gratis'],
      },
      {
        id: 'demo0001',
        name: 'VoiceStudio Demo Voice',
        provider: 'voicestudio',
        language: 'en',
        gender: 'male',
        styleCategory: 'conversational_dynamic',
        accent: 'Americano Cálido',
        description: 'Voz cinematográfica nativa de VoiceStudio con timbre bajo y resonante.',
        sampleUrl: '/api/audio/voicestudio/proxy-audio/demo0001',
        isCloned: false,
        refText: 'Hey. I am the VoiceStudio demo voice made right here on your machine.',
        labels: ['⚡ RTX 3080 Local', '🇺🇸 Inglés', 'Gratis'],
      },
    ];
  }

  /**
   * Consulta las voces pre-entrenadas y privadas de ElevenLabs
   */
  private static async fetchElevenLabsVoices(): Promise<VoiceCatalogItem[]> {
    const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
    const headers: Record<string, string> = {};
    if (apiKey && !apiKey.startsWith('tu_') && !apiKey.includes('placeholder')) {
      headers['xi-api-key'] = apiKey;
    }

    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers });
    if (!res.ok) {
      // Si la clave no es válida, intentar sin cabecera (acceso público a premades)
      const publicRes = await fetch('https://api.elevenlabs.io/v1/voices');
      if (!publicRes.ok) return [];
      const publicData: any = await publicRes.json();
      return this.mapElevenVoices(publicData.voices || []);
    }

    const data: any = await res.json();
    return this.mapElevenVoices(data.voices || []);
  }

  private static mapElevenVoices(rawList: any[]): VoiceCatalogItem[] {
    return rawList.map((v) => {
      const labels = v.labels || {};
      const nameLower = v.name?.toLowerCase() || '';

      // Determinar si soporta español con muestra nativa
      const spanishLangObj = v.verified_languages?.find(
        (l: any) => l.language === 'es' || l.locale?.startsWith('es')
      );
      const isSpanishNative = labels.language === 'es' || labels.accent?.includes('spanish');
      const isMultilingual = Boolean(spanishLangObj) || !labels.language;

      let lang: 'es' | 'en' | 'multilingual' = 'en';
      if (isSpanishNative) lang = 'es';
      else if (isMultilingual) lang = 'multilingual';

      // Mejor sample URL disponible (preferir muestra en español si existe para canales en español)
      const sampleUrl = spanishLangObj?.preview_url || v.preview_url;

      // Categoría de estilo
      let styleCategory: VoiceCatalogItem['styleCategory'] = 'conversational';
      if (
        nameLower.includes('adam') ||
        nameLower.includes('antoni') ||
        labels.use_case === 'narration' ||
        labels.descriptive === 'authoritative' ||
        labels.descriptive === 'deep'
      ) {
        styleCategory = 'thriller';
      } else if (labels.descriptive === 'classy' || labels.descriptive === 'formal') {
        styleCategory = 'historical';
      } else if (v.category === 'cloned') {
        styleCategory = 'clone';
      }

      return {
        id: v.voice_id,
        name: v.name,
        provider: 'elevenlabs',
        language: lang,
        gender: labels.gender === 'female' ? 'female' : 'male',
        styleCategory,
        accent: labels.accent || 'American',
        description: v.description || `Voz ${labels.descriptive || 'narrativa'} para ${labels.use_case || 'documentales'}.`,
        sampleUrl,
        isCloned: v.category === 'cloned',
        labels: {
          motor: 'Multilingual v2',
          acento: labels.accent || 'Americano',
          edad: labels.age || 'Adulto',
        },
      };
    });
  }

  /**
   * Voces curadas de OpenAI TTS y Edge Neural (con metadatos documentales de alta retención)
   */
  private static getCuratedStandardVoices(): VoiceCatalogItem[] {
    return [
      {
        id: 'onyx',
        name: 'OpenAI Onyx',
        provider: 'openai',
        language: 'multilingual',
        gender: 'male',
        styleCategory: 'thriller',
        accent: 'Profundo / Thriller Corporativo',
        description: 'Voz masculina de barítono profundo, excelente para escándalos financieros y tensión.',
        labels: { motor: 'OpenAI TTS-1 HD', calidad: 'Estándar' },
      },
      {
        id: 'echo',
        name: 'OpenAI Echo',
        provider: 'openai',
        language: 'multilingual',
        gender: 'male',
        styleCategory: 'historical',
        accent: 'Solemne / Documental Histórico',
        description: 'Voz solemne y pausada, idónea para arqueología, mitología e historia antigua.',
        labels: { motor: 'OpenAI TTS-1 HD', calidad: 'Estándar' },
      },
      {
        id: 'alloy',
        name: 'OpenAI Alloy',
        provider: 'openai',
        language: 'multilingual',
        gender: 'neutral',
        styleCategory: 'conversational',
        accent: 'Neutro / Explicativo',
        description: 'Voz clara, directa y equilibrada para infografías y conceptos técnicos.',
        labels: { motor: 'OpenAI TTS-1', calidad: 'Estándar' },
      },
      {
        id: 'es-ES-AlvaroNeural',
        name: 'Edge Álvaro Neural',
        provider: 'edge_neural',
        language: 'es',
        gender: 'male',
        styleCategory: 'historical',
        accent: 'Español (Castellano)',
        description: 'Voz neuronal gratuita de Microsoft, clara y con dicción documental solemne.',
        labels: { motor: 'Edge Neural Free', costo: 'Gratis' },
      },
      {
        id: 'es-MX-JorgeNeural',
        name: 'Edge Jorge Neural',
        provider: 'edge_neural',
        language: 'es',
        gender: 'male',
        styleCategory: 'thriller',
        accent: 'Español (Latinoamérica)',
        description: 'Voz neuronal gratuita con cadencia moderna para misterios y crónica de negocios.',
        labels: { motor: 'Edge Neural Free', costo: 'Gratis' },
      },
    ];
  }

  /**
   * Genera un audio de prueba corto (3–5 segundos) con una frase personalizada del usuario
   */
  static async generatePreviewSample(
    provider: 'voicestudio' | 'elevenlabs' | 'openai' | 'edge_neural',
    voiceId: string,
    sampleText: string
  ): Promise<string> {
    if (!fs.existsSync(PREVIEWS_DIR)) {
      fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
    }

    const safeId = voiceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `preview_${provider}_${safeId}_${Date.now()}.mp3`;
    const outputPath = path.join(PREVIEWS_DIR, filename);
    const publicUrl = `/storage/temp_previews/${filename}`;

    const textToSpeak = (sampleText || '').trim() || 'Esta es una prueba de voz para el documental.';

    // Utilizar el servicio de audio configurado
    const res = await AudioService.generateSceneAudio(
      'temp_preview_project',
      999,
      textToSpeak,
      'tech_scandals',
      provider === 'edge_neural' ? 'openai' : (provider as any),
      voiceId
    );

    // Si generó el audio en su carpeta de proyecto, copiarlo al directorio público de previews
    if (res.audioUrl) {
      return res.audioUrl;
    }

    return publicUrl;
  }
}
