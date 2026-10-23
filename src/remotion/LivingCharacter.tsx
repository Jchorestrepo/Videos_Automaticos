import React from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';
import type { EmotionalAnimationEffect, MotionIntensityType } from '../types/index.ts';
import { EmotionalFX } from './effects/EmotionalFX.tsx';

interface LivingCharacterProps {
  src: string;
  durationInFrames: number;
  sceneId?: number;
  intensity?: MotionIntensityType;
  effect?: EmotionalAnimationEffect;
  accentColor?: string;
}

/**
 * Living Character Engine:
 * Dota de vida orgánica a cualquier imagen fija de un personaje mediante:
 * 1. Respiración anatómica (tórax y hombros con ciclo sinusoidal).
 * 2. Micro-balanceo postural de cabeza y mirada.
 * 3. Micro-parpadeo ocular procedural imperceptible pero vivo.
 * 4. Paralaje tridimensional 2.5D (fondo bokeh cinemático vs sujeto en primer plano).
 * 5. Efectos emocionales reactivos al guión (humo en cabeza, mareo, oro, pánico).
 */
export const LivingCharacter: React.FC<LivingCharacterProps> = ({
  src,
  durationInFrames,
  sceneId = 1,
  intensity = 'standard',
  effect = 'none',
  accentColor = '#38bdf8',
}) => {
  const frame = useCurrentFrame();

  // Multiplicador de intensidad
  const numIntensity =
    typeof intensity === 'number'
      ? intensity
      : intensity === 'subtle'
      ? 0.6
      : intensity === 'dynamic'
      ? 1.4
      : 1.0;

  // 1. CICLO DE RESPIRACIÓN ANATÓMICA (~3.8 segundos por ciclo a 30fps = 114 frames)
  const breatheFreq = (2 * Math.PI) / 114;
  const breatheCycle = Math.sin(frame * breatheFreq);
  // Pecho sube y hombros se expanden ligeramente en la inhalación
  const breatheScaleY = 1.0 + breatheCycle * 0.012 * numIntensity;
  const breatheScaleX = 1.0 + breatheCycle * 0.005 * numIntensity;
  const breatheTranslateY = -breatheCycle * 3 * numIntensity;

  // 2. MICRO-BALANCEO POSTURAL (Desfasado de la respiración para evitar sincronía robótica)
  const postureTilt = Math.sin(frame * 0.038 + sceneId) * 0.45 * numIntensity;
  const postureDriftX = Math.cos(frame * 0.026 + sceneId) * 2.5 * numIntensity;

  // 3. EFECTOS ESPECIALES REACTIVOS AL PERSONAJE (Furia / Mareo / Pánico)
  let extraJitterX = 0;
  let extraJitterY = 0;
  let extraRotation = 0;
  let extraScale = 1.0;

  if (effect === 'rage_jitter') {
    // Micro-temblor de furia contenida
    extraJitterX = (Math.random() - 0.5) * 3.5 * numIntensity;
    extraJitterY = (Math.random() - 0.5) * 2.5 * numIntensity;
  } else if (effect === 'dizzy_wobble') {
    // Balanceo ondulante de mareo o borrachera
    extraRotation = Math.sin(frame * 0.06) * 2.8 * numIntensity;
    extraJitterX = Math.sin(frame * 0.04) * 12 * numIntensity;
    extraJitterY = Math.cos(frame * 0.035) * 6 * numIntensity;
  } else if (effect === 'panic_heartbeat') {
    // Pulso cardíaco de pánico (lub-dub)
    const hbCycle = frame % 45;
    if (hbCycle < 6) {
      extraScale = 1.0 + Math.sin((hbCycle / 6) * Math.PI) * 0.022 * numIntensity;
    } else if (hbCycle >= 8 && hbCycle < 15) {
      extraScale = 1.0 + Math.sin(((hbCycle - 8) / 7) * Math.PI) * 0.03 * numIntensity;
    }
  }

  // 4. PARALAJE 2.5D: Acercamiento lento y continuo de cámara hacia el personaje
  const cameraZoom = interpolate(frame, [0, durationInFrames], [1.03, 1.12 * numIntensity], {
    extrapolateRight: 'clamp',
  });
  const bgZoom = interpolate(frame, [0, durationInFrames], [1.08, 1.18 * numIntensity], {
    extrapolateRight: 'clamp',
  });

  // 5. MICRO-PARPADEO OCULAR PROCEDURAL (Ocurre cada ~135 frames / ~4.5s durante 4 frames)
  const blinkCycle = frame % 135;
  const isBlinking = blinkCycle >= 120 && blinkCycle <= 124;
  const blinkOpacity = isBlinking
    ? interpolate(blinkCycle, [120, 122, 124], [0, 0.45, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#000000',
      }}
    >
      {/* CAPA DE FONDO 2.5D: Desenfocada con bokeh cinemático para separar al sujeto */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          transform: `scale(${bgZoom}) translate(${-postureDriftX * 0.5}px, ${-breatheTranslateY * 0.3}px)`,
          filter: 'blur(10px) brightness(0.65)',
          opacity: 0.85,
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* CAPA DE PERSONAJE PRINCIPAL (VIVO Y NÍTIDO) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 1200,
          transformOrigin: 'center 85%', // Anclaje inferior para respiración anatómicamente realista
          transform: `scale(${cameraZoom * extraScale}) rotate(${postureTilt + extraRotation}deg) translate(${postureDriftX + extraJitterX}px, ${breatheTranslateY + extraJitterY}px)`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transformOrigin: 'center 80%',
            transform: `scale(${breatheScaleX}, ${breatheScaleY})`,
          }}
        >
          <Img
            src={src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `contrast(1.05) saturate(1.04)`,
            }}
          />

          {/* Sombra sutil de micro-parpadeo ocular en tercio superior */}
          {blinkOpacity > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '28%',
                left: '35%',
                width: '30%',
                height: '8%',
                borderRadius: '50%',
                backgroundColor: '#000000',
                opacity: blinkOpacity,
                filter: 'blur(8px)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Resplandor volumétrico sutil en el borde del personaje (Rim Light Shimmer) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxShadow: `inset 0 0 80px rgba(0,0,0,0.5)`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* EFECTO EMOCIONAL CONTEXTUAL (Humo, Mareo, Oro, Pánico) */}
      <EmotionalFX effect={effect} accentColor={accentColor} />
    </div>
  );
};
