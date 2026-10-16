import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { WordTiming } from '../types/index.ts';

export interface KineticCaptionsProps {
  voiceover: string;
  wordTimings?: WordTiming[];
  accentColor?: string;
  durationInFrames: number;
}

interface WordChunk {
  words: WordTiming[];
  startMs: number;
  endMs: number;
}

export const KineticCaptions: React.FC<KineticCaptionsProps> = ({
  voiceover,
  wordTimings,
  accentColor = '#38bdf8',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tiempo actual en milisegundos relativo al inicio de la escena
  const currentMs = (frame / fps) * 1000;

  // 1. Si no hay wordTimings provistos por TTS, calcularlos de forma rítmica
  const effectiveWordTimings: WordTiming[] = React.useMemo(() => {
    if (wordTimings && wordTimings.length > 0) {
      return wordTimings;
    }
    // Fallback: dividir el texto en palabras y distribuir proporcionalmente
    const words = voiceover.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const totalDurationMs = (durationInFrames / fps) * 1000;
    const msPerWord = totalDurationMs / words.length;

    return words.map((w, idx) => ({
      word: w,
      startMs: idx * msPerWord,
      endMs: (idx + 1) * msPerWord,
    }));
  }, [wordTimings, voiceover, durationInFrames, fps]);

  // 2. Agrupar palabras en frases cortas de 3 a 4 palabras (alto impacto y retención)
  const chunks: WordChunk[] = React.useMemo(() => {
    const CHUNK_SIZE = 4;
    const result: WordChunk[] = [];

    for (let i = 0; i < effectiveWordTimings.length; i += CHUNK_SIZE) {
      const group = effectiveWordTimings.slice(i, i + CHUNK_SIZE);
      const startMs = group[0].startMs;
      const endMs = group[group.length - 1].endMs;
      result.push({
        words: group,
        startMs,
        endMs,
      });
    }

    return result;
  }, [effectiveWordTimings]);

  // 3. Encontrar el chunk activo en el frame actual
  const activeChunk = React.useMemo(() => {
    if (chunks.length === 0) return null;

    // Buscar el chunk cuyo intervalo cubra currentMs
    const found = chunks.find((c) => currentMs >= c.startMs && currentMs <= c.endMs);
    if (found) return found;

    // Si estamos entre chunks (micro-pausas), mostrar el más cercano
    for (let i = 0; i < chunks.length - 1; i++) {
      if (currentMs > chunks[i].endMs && currentMs < chunks[i + 1].startMs) {
        return chunks[i];
      }
    }

    if (currentMs < chunks[0].startMs) return chunks[0];
    return chunks[chunks.length - 1];
  }, [chunks, currentMs]);

  if (!activeChunk) return null;

  // Animación de entrada suave del contenedor del subtítulo
  const chunkStartFrame = Math.round((activeChunk.startMs / 1000) * fps);
  const frameSinceChunkStart = Math.max(0, frame - chunkStartFrame);

  const containerSpring = spring({
    frame: frameSinceChunkStart,
    fps,
    config: {
      damping: 15,
      stiffness: 180,
      mass: 0.5,
    },
  });

  const containerOpacity = interpolate(containerSpring, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const containerTranslateY = interpolate(containerSpring, [0, 1], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          maxWidth: 1300,
          padding: '16px 36px',
          borderRadius: 20,
          backgroundColor: 'rgba(6, 11, 22, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(0, 0, 0, 0.4)',
          transform: `translateY(${containerTranslateY}px)`,
          opacity: containerOpacity,
        }}
      >
        {activeChunk.words.map((w, wIdx) => {
          const isSpoken = currentMs >= w.startMs;
          const isCurrent = currentMs >= w.startMs && currentMs <= w.endMs;

          // Animación de escala (pop) en la palabra activa
          const wordStartFrame = Math.round((w.startMs / 1000) * fps);
          const frameSinceWordStart = Math.max(0, frame - wordStartFrame);

          const wordSpring = spring({
            frame: frameSinceWordStart,
            fps,
            config: {
              damping: 12,
              stiffness: 220,
              mass: 0.4,
            },
          });

          const scale = isCurrent
            ? interpolate(wordSpring, [0, 1], [1.25, 1.1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : 1.0;

          // Color y brillo según estado
          let color = 'rgba(255, 255, 255, 0.65)';
          let textShadow = '0 2px 4px rgba(0,0,0,0.8)';

          if (isCurrent) {
            color = accentColor;
            textShadow = `0 0 25px ${accentColor}, 0 2px 6px rgba(0,0,0,0.9)`;
          } else if (isSpoken) {
            color = '#ffffff';
            textShadow = '0 2px 6px rgba(0,0,0,0.9)';
          }

          return (
            <span
              key={`${w.word}_${wIdx}`}
              style={{
                display: 'inline-block',
                fontFamily: 'Montserrat, Inter, system-ui, -apple-system, sans-serif',
                fontSize: 44,
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color,
                textShadow,
                transform: `scale(${scale})`,
                transition: 'color 0.1s ease',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
