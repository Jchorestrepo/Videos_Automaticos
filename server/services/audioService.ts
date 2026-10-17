import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { WordTiming } from '../../src/types/index.ts';
import { VoiceStudioService } from './voiceStudioService.ts';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export interface AudioGenerationResult {
  audioUrl: string;
  durationInSeconds: number;
  wordTimings: WordTiming[];
  providerUsed?: 'voicestudio' | 'openai' | 'edge_neural' | 'elevenlabs' | 'simulated';
}

export class AudioService {
  /**
   * Obtiene la voz ideal de ElevenLabs según el canal (para Producción Final en Inglés)
   */
  static getElevenLabsVoiceForChannel(channelId: string): { voiceId: string; voiceName: string } {
    if (channelId.includes('ancient')) {
      return { voiceId: 'ErXwobaYiN019PkySvjV', voiceName: 'Antoni (Historical Narrator)' };
    }
    return { voiceId: 'pNInz6obpgDQGcFmaJgB', voiceName: 'Adam (Tech Thriller Narrator)' };
  }

  /**
   * Obtiene la voz ideal de OpenAI TTS según el canal (para Pruebas en Español si hay saldo en OpenAI)
   */
  static getOpenAIVoiceForChannel(channelId: string): {
    voice: 'onyx' | 'echo' | 'ash' | 'fable';
    voiceName: string;
  } {
    if (channelId.includes('ancient')) {
      return { voice: 'echo', voiceName: 'OpenAI Echo (Solemne / Documental)' };
    }
    return { voice: 'onyx', voiceName: 'OpenAI Onyx (Profunda / Thriller Tech)' };
  }

  /**
   * Obtiene la voz neuronal gratuita de Microsoft Azure/Edge según el canal e idioma
   */
  static getEdgeNeuralVoiceForChannel(
    channelId: string,
    isEnglish: boolean = false
  ): { voice: string; voiceName: string } {
    if (isEnglish) {
      return channelId.includes('ancient')
        ? { voice: 'en-GB-RyanNeural', voiceName: 'Edge Ryan Neural (British Documentary)' }
        : { voice: 'en-US-ChristopherNeural', voiceName: 'Edge Christopher Neural (US Thriller)' };
    }
    if (channelId.includes('ancient')) {
      return { voice: 'es-ES-AlvaroNeural', voiceName: 'Edge Álvaro Neural (Documental Histórico ES)' };
    }
    return { voice: 'es-MX-JorgeNeural', voiceName: 'Edge Jorge Neural (Narrador Thriller ES)' };
  }

  /**
   * Obtiene la duración real en segundos de un archivo MP3 usando ffprobe
   */
  static async probeAudioDuration(filePath: string): Promise<number | null> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ]);
      const parsed = parseFloat(stdout.trim());
      if (!Number.isNaN(parsed) && parsed > 0) {
        return Number(parsed.toFixed(2));
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Convierte la alineación de caracteres de ElevenLabs a marcas de tiempo por palabra
   */
  static parseAlignmentToWords(alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }): WordTiming[] {
    const words: WordTiming[] = [];
    let currentWord = '';
    let wordStartMs = 0;
    let wordEndMs = 0;
    let inWord = false;

    const chars = alignment.characters;
    const starts = alignment.character_start_times_seconds;
    const ends = alignment.character_end_times_seconds;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const isWhitespace = /^\s+$/.test(char);

      if (!isWhitespace) {
        if (!inWord) {
          inWord = true;
          wordStartMs = Math.round(starts[i] * 1000);
        }
        currentWord += char;
        wordEndMs = Math.round(ends[i] * 1000);
      } else {
        if (inWord) {
          words.push({
            word: currentWord,
            startMs: wordStartMs,
            endMs: wordEndMs,
          });
          currentWord = '';
          inWord = false;
        }
      }
    }

    if (inWord && currentWord.length > 0) {
      words.push({
        word: currentWord,
        startMs: wordStartMs,
        endMs: wordEndMs,
      });
    }

    return words;
  }

  /**
   * Distribuye los timestamps de las palabras ajustándose exactamente a la duración real de un MP3
   */
  static alignWordsToExactDuration(text: string, exactDurationSeconds: number): WordTiming[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const weights = words.map((w) => {
      const charWeight = Math.max(2, w.length);
      const punctPause = /[.?!;:]$/.test(w) ? 4.5 : /[,]$/.test(w) ? 2.2 : 0.6;
      return charWeight + punctPause;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const usableMs = Math.max(500, exactDurationSeconds * 1000 - 200);

    const timings: WordTiming[] = [];
    let cursorMs = 80;

    for (let i = 0; i < words.length; i++) {
      const wordSliceMs = (weights[i] / totalWeight) * usableMs;
      const hasPunct = /[,.;:?!]$/.test(words[i]);
      const pauseRatio = hasPunct ? 0.25 : 0.08;
      const speakMs = Math.max(80, Math.round(wordSliceMs * (1 - pauseRatio)));

      const startMs = Math.round(cursorMs);
      const endMs = Math.round(startMs + speakMs);

      timings.push({
        word: words[i],
        startMs,
        endMs,
      });

      cursorMs += wordSliceMs;
    }

    return timings;
  }

  /**
   * Genera marcas de tiempo simuladas como fallback en caso de contingencia
   */
  static generateSimulatedWordTimings(
    text: string,
    targetWpm: number = 145
  ): { durationInSeconds: number; wordTimings: WordTiming[] } {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const msPerWord = Math.round((60 / targetWpm) * 1000);
    const wordTimings: WordTiming[] = [];

    let currentMs = 150;
    for (const word of words) {
      const startMs = currentMs;
      const endMs = startMs + msPerWord;
      wordTimings.push({ word, startMs, endMs });
      const extraPause = /[,.;:?!]$/.test(word) ? 140 : 40;
      currentMs = endMs + extraPause;
    }

    const durationInSeconds = Math.max(4, Math.ceil(currentMs / 1000));
    return { durationInSeconds, wordTimings };
  }

  /**
   * Verifica si el backend local de VoiceStudio está activo en http://127.0.0.1:3900
   */
  static async isVoiceStudioAvailable(): Promise<boolean> {
    try {
      const voiceStudioUrl = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${voiceStudioUrl}/v1/audio/voices`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene la lista de perfiles o voces disponibles en VoiceStudio (ordenando perfiles clonados primero)
   */
  static async getVoiceStudioVoices(): Promise<Array<{ id: string; name: string; type?: string; language?: string }>> {
    try {
      const voiceStudioUrl = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${voiceStudioUrl}/v1/audio/voices`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return [];
      const data: any = await res.json();
      const list = (data.voices || []).map((v: any) => ({
        id: v.voice_id || v.name?.toLowerCase(),
        name: v.name,
        type: v.type || 'profile',
        language: v.language || 'Auto',
      }));

      // Ordenar: primero los perfiles personalizados/clonados (ej. Gomorra), luego alias genéricos
      return list.sort((a: any, b: any) => {
        if (a.type === 'profile' && b.type !== 'profile') return -1;
        if (a.type !== 'profile' && b.type === 'profile') return 1;
        return a.name.localeCompare(b.name);
      });
    } catch {
      return [];
    }
  }

  /**
   * Resuelve el ID interno exacto de un perfil de VoiceStudio dado su nombre o ID parcial.
   * VoiceStudio requiere el profile_id exacto (ej. 'b4b14f0e') en /v1/audio/speech
   * para cargar la muestra de referencia del clon ('b4b14f0e.ogg').
   */
  static async resolveVoiceStudioVoiceId(voiceIdentifier: string = 'gomorra'): Promise<string> {
    const raw = (voiceIdentifier || '').trim();
    if (!raw) return 'b4b14f0e';

    try {
      const voices = await this.getVoiceStudioVoices();

      // 1. Coincidencia exacta por ID (ej. 'b4b14f0e')
      const byId = voices.find((v) => v.id.toLowerCase() === raw.toLowerCase());
      if (byId) return byId.id;

      // 2. Coincidencia exacta por nombre (ej. 'Gomorra')
      const byName = voices.find((v) => v.name.toLowerCase() === raw.toLowerCase());
      if (byName) return byName.id;

      // 3. Coincidencia parcial por nombre
      const partial = voices.find(
        (v) =>
          v.name.toLowerCase().includes(raw.toLowerCase()) ||
          raw.toLowerCase().includes(v.name.toLowerCase())
      );
      if (partial) return partial.id;

      // Fallback seguro conocido para Gomorra si el servidor local no devolvió la lista
      if (raw.toLowerCase().includes('gomorra')) {
        return 'b4b14f0e';
      }
    } catch {
      if (raw.toLowerCase().includes('gomorra')) {
        return 'b4b14f0e';
      }
    }

    return raw;
  }

  /**
   * Genera locución con el backend local VoiceStudio (RTX 3080) usando la voz clonada seleccionada
   * y extrae marcas de tiempo palabra por palabra con Whisper ASR.
   */
  private static async tryVoiceStudioTTS(
    voiceoverText: string,
    channelId: string,
    sceneId: number,
    audioPath: string,
    publicAudioUrl: string,
    voiceProfile: string = 'gomorra'
  ): Promise<AudioGenerationResult | null> {
    try {
      const voiceStudioUrl = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
      const resolvedVoiceId = await this.resolveVoiceStudioVoiceId(voiceProfile);
      console.log(
        `[VoiceStudio TTS] Generando escena ${sceneId} con voz "${voiceProfile}" (ID resuelto: "${resolvedVoiceId}") en ${voiceStudioUrl}...`
      );

      const ttsRes = await fetch(`${voiceStudioUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'tts-1',
          voice: resolvedVoiceId,
          input: voiceoverText,
          response_format: 'mp3',
          speed: 1.0,
        }),
      });

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        console.warn(`[VoiceStudio TTS] HTTP ${ttsRes.status}: ${errText.slice(0, 160)}`);
        return null;
      }

      const arrayBuffer = await ttsRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(audioPath, buffer);

      const probedDuration = await this.probeAudioDuration(audioPath);
      let durationInSeconds = probedDuration || Math.max(
        4,
        Number(((voiceoverText.split(/\s+/).length / 145) * 60).toFixed(2))
      );
      let wordTimings: WordTiming[] = [];

      // Extraer marcas de tiempo exactas por palabra con Whisper ASR en VoiceStudio
      try {
        console.log(`[VoiceStudio Whisper] Alineando palabras de escena ${sceneId}...`);
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const form = new FormData();
        form.append('file', blob, `scene_${sceneId}.mp3`);
        form.append('model', 'whisper-1');
        form.append('response_format', 'verbose_json');
        form.append('timestamp_granularities[]', 'word');

        const sttRes = await fetch(`${voiceStudioUrl}/v1/audio/transcriptions`, {
          method: 'POST',
          body: form,
        });

        if (sttRes.ok) {
          const sttData: any = await sttRes.json();
          if (sttData.words && Array.isArray(sttData.words) && sttData.words.length > 0) {
            wordTimings = sttData.words.map((w: any) => ({
              word: String(w.word || '').trim(),
              startMs: Math.round(Number(w.start || 0) * 1000),
              endMs: Math.round(Number(w.end || 0) * 1000),
            })).filter((wt: WordTiming) => wt.word.length > 0);

            if (sttData.duration && Number(sttData.duration) > 0) {
              durationInSeconds = Number(Number(sttData.duration).toFixed(2));
            }
          }
        }
      } catch (sttErr: any) {
        console.warn(`[VoiceStudio Whisper] Advertencia al obtener timestamps: ${sttErr.message}. Usando alineación por duración.`);
      }

      // Si Whisper no devolvió palabras, usar alineador por duración exacta
      if (wordTimings.length === 0) {
        wordTimings = this.alignWordsToExactDuration(voiceoverText, durationInSeconds);
      }

      console.log(
        `[VoiceStudio TTS] ✓ Escena ${sceneId} sintetizada con "${voiceProfile}": ${durationInSeconds}s (${wordTimings.length} palabras sincronizadas)`
      );

      return {
        audioUrl: publicAudioUrl,
        durationInSeconds,
        wordTimings,
        providerUsed: 'voicestudio',
      };
    } catch (err: any) {
      console.warn(`[VoiceStudio TTS] Error conectando con VoiceStudio: ${err.message}`);
      return null;
    }
  }

  /**
   * Genera el archivo de audio MP3 y los timestamps exactos de una escena.
   * - Si preferredProvider === 'voicestudio': usa VoiceStudio en local (RTX 3080) con el perfil Gomorra y Whisper.
   * - Si preferredProvider === 'elevenlabs': usa ElevenLabs con timestamps nativos.
   * - Si preferredProvider === 'openai': intenta OpenAI TTS y luego Edge Neural TTS Gratis.
   */
  static async generateSceneAudio(
    projectId: string,
    sceneId: number,
    voiceoverText: string,
    channelId: string,
    preferredProvider: 'voicestudio' | 'elevenlabs' | 'openai' = 'voicestudio',
    customVoiceName?: string
  ): Promise<AudioGenerationResult> {
    dotenv.config({ override: true });
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const elevenlabsKey = (process.env.ELEVENLABS_API_KEY || '').trim();

    const projectAudioDir = path.join(STORAGE_DIR, projectId, 'audio');
    if (!fs.existsSync(projectAudioDir)) {
      fs.mkdirSync(projectAudioDir, { recursive: true });
    }

    const audioFilename = `scene_${sceneId}.mp3`;
    const audioPath = path.join(projectAudioDir, audioFilename);
    const publicAudioUrl = `/storage/${projectId}/audio/${audioFilename}`;

    // =========================================================================
    // MODO 1: VOICESTUDIO LOCAL (RTX 3080 - Perfil Gomorra + Whisper Timestamps)
    // =========================================================================
    if (preferredProvider === 'voicestudio') {
      try {
        await VoiceStudioService.ensureReady();
      } catch (vsErr: any) {
        console.warn(`[Audio Pipeline] VoiceStudio no pudo iniciar automáticamente: ${vsErr.message}`);
      }

      const voiceProfile = customVoiceName || 'gomorra';
      const vsRes = await this.tryVoiceStudioTTS(
        voiceoverText,
        channelId,
        sceneId,
        audioPath,
        publicAudioUrl,
        voiceProfile
      );
      if (vsRes) return vsRes;
      console.warn('[Audio Pipeline] VoiceStudio no respondió, probando proveedores alternativos...');
    }

    // =========================================================================
    // MODO 2: ELEVENLABS TTS (Producción Cloud en Inglés / Alternativa)
    // =========================================================================
    if (preferredProvider === 'elevenlabs' && elevenlabsKey) {
      const elevenRes = await this.tryElevenLabsTTS(
        voiceoverText,
        channelId,
        elevenlabsKey,
        sceneId,
        audioPath,
        publicAudioUrl
      );
      if (elevenRes) return elevenRes;
    }

    // =========================================================================
    // MODO 3: OPENAI TTS / EDGE NEURAL TTS GRATIS
    // =========================================================================
    if (openaiKey && openaiKey.startsWith('sk-')) {
      const openAiRes = await this.tryOpenAITTS(
        voiceoverText,
        channelId,
        openaiKey,
        sceneId,
        audioPath,
        publicAudioUrl
      );
      if (openAiRes) return openAiRes;
    }

    // Respaldo automático con Microsoft Edge Neural TTS (100% Gratis)
    const edgeRes = await this.tryEdgeNeuralTTS(
      voiceoverText,
      channelId,
      sceneId,
      projectAudioDir,
      audioPath,
      publicAudioUrl,
      preferredProvider === 'elevenlabs'
    );
    if (edgeRes) return edgeRes;

    // Fallback final: calcular duración estimada y timings rítmicos
    console.log(`[Audio Fallback] Calculando timings rítmicos para escena ${sceneId}...`);
    const { durationInSeconds, wordTimings } = this.generateSimulatedWordTimings(voiceoverText);

    return {
      audioUrl: fs.existsSync(audioPath) ? publicAudioUrl : '',
      durationInSeconds,
      wordTimings,
      providerUsed: 'simulated',
    };
  }

  private static async tryOpenAITTS(
    voiceoverText: string,
    channelId: string,
    openaiKey: string,
    sceneId: number,
    audioPath: string,
    publicAudioUrl: string
  ): Promise<AudioGenerationResult | null> {
    try {
      const { voice, voiceName } = this.getOpenAIVoiceForChannel(channelId);
      console.log(`[OpenAI TTS] Generando escena ${sceneId} con "${voiceName}"...`);

      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice,
          input: voiceoverText,
          response_format: 'mp3',
          speed: 1.0,
        }),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(audioPath, buffer);

        const probedDuration = await this.probeAudioDuration(audioPath);
        const estimatedFallback = Math.max(
          4,
          Number(((voiceoverText.split(/\s+/).length / 145) * 60).toFixed(2))
        );
        const durationInSeconds = probedDuration || estimatedFallback;
        const wordTimings = this.alignWordsToExactDuration(voiceoverText, durationInSeconds);

        console.log(
          `[OpenAI TTS] ✓ Escena ${sceneId} sintetizada (${durationInSeconds}s | ${wordTimings.length} palabras sincronizadas)`
        );

        return {
          audioUrl: publicAudioUrl,
          durationInSeconds,
          wordTimings,
          providerUsed: 'openai',
        };
      } else {
        console.warn(`[OpenAI TTS] HTTP ${res.status} (sin saldo en OpenAI directo), cambiando a Voz Neuronal Gratuita...`);
      }
    } catch (err: any) {
      console.warn(`[OpenAI TTS] Aviso: ${err.message}`);
    }
    return null;
  }

  private static async tryEdgeNeuralTTS(
    voiceoverText: string,
    channelId: string,
    sceneId: number,
    projectAudioDir: string,
    audioPath: string,
    publicAudioUrl: string,
    isEnglish: boolean
  ): Promise<AudioGenerationResult | null> {
    try {
      const { voice, voiceName } = this.getEdgeNeuralVoiceForChannel(channelId, isEnglish);
      console.log(`[Edge Neural TTS] Generando escena ${sceneId} con "${voiceName}" (Gratis)...`);

      const tmpDir = path.join(projectAudioDir, `_tmp_${sceneId}_${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioFilePath } = await tts.toFile(tmpDir, voiceoverText);

      if (fs.existsSync(audioFilePath)) {
        fs.copyFileSync(audioFilePath, audioPath);
        fs.rmSync(tmpDir, { recursive: true, force: true });

        const probedDuration = await this.probeAudioDuration(audioPath);
        const estimatedFallback = Math.max(
          4,
          Number(((voiceoverText.split(/\s+/).length / 145) * 60).toFixed(2))
        );
        const durationInSeconds = probedDuration || estimatedFallback;
        const wordTimings = this.alignWordsToExactDuration(voiceoverText, durationInSeconds);

        console.log(
          `[Edge Neural TTS] ✓ Escena ${sceneId} sintetizada en MP3 (${durationInSeconds}s | ${wordTimings.length} palabras sincronizadas)`
        );

        return {
          audioUrl: publicAudioUrl,
          durationInSeconds,
          wordTimings,
          providerUsed: 'edge_neural',
        };
      }
    } catch (err: any) {
      console.warn(`[Edge Neural TTS] Aviso: ${err.message}`);
    }
    return null;
  }

  private static async tryElevenLabsTTS(
    voiceoverText: string,
    channelId: string,
    elevenlabsKey: string,
    sceneId: number,
    audioPath: string,
    publicAudioUrl: string
  ): Promise<AudioGenerationResult | null> {
    try {
      const { voiceId, voiceName } = this.getElevenLabsVoiceForChannel(channelId);
      console.log(`[ElevenLabs TTS] Generando escena ${sceneId} con voz "${voiceName}"...`);
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenlabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: voiceoverText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.85,
              style: 0.15,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (res.ok) {
        const data: any = await res.json();
        if (data.audio_base64 && data.alignment) {
          fs.writeFileSync(audioPath, Buffer.from(data.audio_base64, 'base64'));

          const wordTimings = this.parseAlignmentToWords(data.alignment);
          const ends = data.alignment.character_end_times_seconds || [];
          const durationInSeconds = Math.max(
            3,
            Number((ends[ends.length - 1] || 5).toFixed(2))
          );

          console.log(
            `[ElevenLabs TTS] ✓ Escena ${sceneId} sintetizada: ${durationInSeconds}s (${wordTimings.length} palabras sincronizadas)`
          );

          return {
            audioUrl: publicAudioUrl,
            durationInSeconds,
            wordTimings,
            providerUsed: 'elevenlabs',
          };
        }
      } else {
        const errText = await res.text();
        console.warn(`[ElevenLabs TTS] Error HTTP ${res.status}: ${errText.slice(0, 160)}`);
      }
    } catch (err: any) {
      console.warn(`[ElevenLabs TTS] Excepción: ${err.message}`);
    }
    return null;
  }
}
