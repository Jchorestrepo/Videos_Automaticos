import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { WordTiming } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export interface AudioGenerationResult {
  audioUrl: string;
  durationInSeconds: number;
  wordTimings: WordTiming[];
}

export class AudioService {
  /**
   * Obtiene la voz ideal según el canal y el arquetipo
   */
  static getVoiceForChannel(channelId: string): { voiceId: string; voiceName: string } {
    if (channelId.includes('ancient')) {
      // Antoni / Arnold - Voz profunda, pausada, solemne para historia antigua
      return { voiceId: 'ErXwobaYiN019PkySvjV', voiceName: 'Antoni (Arqueólogo Histórico)' };
    }
    // Adam - Voz profunda, carismática, con tensión y ritmo para thrillers corporativos de alto CPM
    return { voiceId: 'pNInz6obpgDQGcFmaJgB', voiceName: 'Adam (Narrador Thriller Tech)' };
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
      // Pausa extra para signos de puntuación
      const extraPause = /[,.;:?!]$/.test(word) ? 140 : 40;
      currentMs = endMs + extraPause;
    }

    const durationInSeconds = Math.max(4, Math.ceil(currentMs / 1000));
    return { durationInSeconds, wordTimings };
  }

  /**
   * Genera el archivo de audio MP3 y los timestamps exactos de una escena
   */
  static async generateSceneAudio(
    projectId: string,
    sceneId: number,
    voiceoverText: string,
    channelId: string
  ): Promise<AudioGenerationResult> {
    dotenv.config({ override: true });
    const elevenlabsKey = (process.env.ELEVENLABS_API_KEY || '').trim();

    const projectAudioDir = path.join(STORAGE_DIR, projectId, 'audio');
    if (!fs.existsSync(projectAudioDir)) {
      fs.mkdirSync(projectAudioDir, { recursive: true });
    }

    const audioFilename = `scene_${sceneId}.mp3`;
    const audioPath = path.join(projectAudioDir, audioFilename);
    const publicAudioUrl = `/storage/${projectId}/audio/${audioFilename}`;

    const { voiceId, voiceName } = this.getVoiceForChannel(channelId);

    if (elevenlabsKey) {
      try {
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
            };
          }
        } else {
          const errText = await res.text();
          console.warn(`[ElevenLabs TTS] Error HTTP ${res.status}: ${errText.slice(0, 160)}`);
        }
      } catch (err: any) {
        console.warn(`[ElevenLabs TTS] Excepción: ${err.message}`);
      }
    }

    // Fallback: calcular duración estimada y timings sincronizados
    console.log(`[Audio Fallback] Calculando timings rítmicos para escena ${sceneId}...`);
    const { durationInSeconds, wordTimings } = this.generateSimulatedWordTimings(voiceoverText);

    return {
      audioUrl: fs.existsSync(audioPath) ? publicAudioUrl : '',
      durationInSeconds,
      wordTimings,
    };
  }
}
