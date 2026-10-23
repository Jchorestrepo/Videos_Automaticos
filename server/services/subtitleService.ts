import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectScript, SceneItem, WordTiming } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export interface SubtitleCue {
  index: number;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export class SubtitleService {
  /**
   * Convierte milisegundos a formato de tiempo SRT: HH:MM:SS,mmm
   */
  static formatSrtTimestamp(ms: number): string {
    const totalSeconds = Math.max(0, ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millis = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const mmm = String(millis).padStart(3, '0');

    return `${hh}:${mm}:${ss},${mmm}`;
  }

  /**
   * Convierte milisegundos a formato de tiempo WebVTT: HH:MM:SS.mmm
   */
  static formatVttTimestamp(ms: number): string {
    return this.formatSrtTimestamp(ms).replace(',', '.');
  }

  /**
   * Divide una lista de palabras con timings en bloques legibles para subtítulos
   * (idealmente entre 3 y 7 palabras, máximo ~42 caracteres por línea).
   */
  static groupWordsIntoCues(
    words: WordTiming[],
    sceneOffsetMs: number,
    startingCueIndex: number
  ): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    if (!words || words.length === 0) return cues;

    let currentWords: string[] = [];
    let cueStartMs = words[0].startMs;
    let cueEndMs = words[0].endMs;
    let currentCueIndex = startingCueIndex;

    const flushCue = () => {
      if (currentWords.length === 0) return;
      cues.push({
        index: currentCueIndex++,
        startTimeMs: sceneOffsetMs + cueStartMs,
        endTimeMs: sceneOffsetMs + Math.max(cueEndMs, cueStartMs + 500),
        text: currentWords.join(' ').trim(),
      });
      currentWords = [];
    };

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (currentWords.length === 0) {
        cueStartMs = w.startMs;
      }
      currentWords.push(w.word);
      cueEndMs = w.endMs;

      const currentLen = currentWords.join(' ').length;
      const isPunctuationBreak = /[.,!?;:]$/.test(w.word);
      const isLongEnough = currentWords.length >= 6 || currentLen >= 36;

      // Cortar bloque si hay signo de puntuación, si ya es suficientemente largo o es la última palabra
      if ((isPunctuationBreak && currentWords.length >= 3) || isLongEnough || i === words.length - 1) {
        flushCue();
      }
    }

    return cues;
  }

  /**
   * Genera subtítulos a nivel de escena si no hay wordTimings (fallback inteligente basado en duración)
   */
  static fallbackSceneCues(
    scene: SceneItem,
    sceneOffsetMs: number,
    startingCueIndex: number
  ): SubtitleCue[] {
    const text = (scene.voiceover || '').trim();
    if (!text) return [];

    const totalDurationMs = Math.round((scene.durationInSeconds || 5) * 1000);
    // Dividir oraciones o frases por puntos y comas
    const parts = text.split(/(?<=[.,!?;])\s+/).filter(Boolean);
    if (parts.length === 0) {
      return [
        {
          index: startingCueIndex,
          startTimeMs: sceneOffsetMs,
          endTimeMs: sceneOffsetMs + totalDurationMs,
          text,
        },
      ];
    }

    const durationPerPart = totalDurationMs / parts.length;
    return parts.map((part, idx) => ({
      index: startingCueIndex + idx,
      startTimeMs: Math.round(sceneOffsetMs + idx * durationPerPart),
      endTimeMs: Math.round(sceneOffsetMs + (idx + 1) * durationPerPart),
      text: part.trim(),
    }));
  }

  /**
   * Genera la lista completa de cues de subtítulos para un proyecto
   */
  static generateProjectCues(
    project: ProjectScript,
    scenesOverride?: SceneItem[]
  ): SubtitleCue[] {
    const scenes = scenesOverride || project.scenes || [];
    const allCues: SubtitleCue[] = [];
    let currentCueIndex = 1;
    let accumulatedMs = 0;

    for (const scene of scenes) {
      const sceneDurationMs = Math.round((scene.durationInSeconds || 5) * 1000);

      if (scene.wordTimings && scene.wordTimings.length > 0) {
        const sceneCues = this.groupWordsIntoCues(
          scene.wordTimings,
          accumulatedMs,
          currentCueIndex
        );
        allCues.push(...sceneCues);
        currentCueIndex += sceneCues.length;
      } else {
        const fallback = this.fallbackSceneCues(
          scene,
          accumulatedMs,
          currentCueIndex
        );
        allCues.push(...fallback);
        currentCueIndex += fallback.length;
      }

      accumulatedMs += sceneDurationMs;
    }

    return allCues;
  }

  /**
   * Convierte los cues a formato string SRT estándar
   */
  static cuesToSrt(cues: SubtitleCue[]): string {
    return cues
      .map((c) => {
        const start = this.formatSrtTimestamp(c.startTimeMs);
        const end = this.formatSrtTimestamp(c.endTimeMs);
        return `${c.index}\n${start} --> ${end}\n${c.text}\n`;
      })
      .join('\n');
  }

  /**
   * Convierte los cues a formato string WebVTT estándar
   */
  static cuesToVtt(cues: SubtitleCue[]): string {
    const header = 'WEBVTT\n\n';
    const body = cues
      .map((c) => {
        const start = this.formatVttTimestamp(c.startTimeMs);
        const end = this.formatVttTimestamp(c.endTimeMs);
        return `${c.index}\n${start} --> ${end}\n${c.text}\n`;
      })
      .join('\n');
    return header + body;
  }

  /**
   * Guarda los archivos SRT y VTT en la carpeta del proyecto
   */
  static saveProjectSubtitles(
    projectId: string,
    language: 'en' | 'es',
    cues: SubtitleCue[]
  ): { srtPath: string; vttPath: string; srtUrl: string; vttUrl: string } {
    const projectDir = path.join(STORAGE_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const srtContent = this.cuesToSrt(cues);
    const vttContent = this.cuesToVtt(cues);

    const srtFilename = `subtitles_${language}.srt`;
    const vttFilename = `subtitles_${language}.vtt`;

    const srtPath = path.join(projectDir, srtFilename);
    const vttPath = path.join(projectDir, vttFilename);

    fs.writeFileSync(srtPath, srtContent, 'utf-8');
    fs.writeFileSync(vttPath, vttContent, 'utf-8');

    return {
      srtPath,
      vttPath,
      srtUrl: `/storage/${projectId}/${srtFilename}`,
      vttUrl: `/storage/${projectId}/${vttFilename}`,
    };
  }
}
