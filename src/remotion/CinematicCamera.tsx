import React from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';
import type { MotionIntensityType } from '../types/index.ts';

interface CinematicCameraProps {
  src: string;
  motion?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static' | string;
  durationInFrames: number;
  sceneId?: number;
  intensity?: MotionIntensityType;
}

/**
 * Cinematic Camera Director (Documental Premium):
 * Aplica movimientos de cámara continuos, suaves y de alta gama cinematográfica
 * (Estilo BBC / Vox / Netflix Documentaries) sin cortes bruscos ni saltos artificiales.
 * 
 * Incorpora:
 * - Dolly Push-In / Pull-Out continuo y suave
 * - Paneo panorámico estabilizado (Pan & Scan)
 * - Micro-deriva orgánica de cámara en mano (Handheld Organic Drift)
 * - Respiración anamórfica sutil
 */
export const CinematicCamera: React.FC<CinematicCameraProps> = ({
  src,
  motion = 'zoom_in',
  durationInFrames,
  sceneId = 1,
  intensity = 'standard',
}) => {
  const frame = useCurrentFrame();

  const numIntensity =
    typeof intensity === 'number'
      ? intensity
      : intensity === 'subtle'
      ? 0.55
      : intensity === 'dynamic'
      ? 1.45
      : 1.0;

  const dirSign = sceneId % 2 === 0 ? 1 : -1;

  // 1. DERIVA ORGÁNICA DE CÁMARA EN MANO (Steady Handheld Drift)
  // Simula a un operador humano sosteniendo una cámara de cine estabilizada
  const handheldX =
    (Math.sin(frame * 0.032 + sceneId) * 3.5 +
      Math.sin(frame * 0.014 + sceneId * 2) * 2.0) *
    numIntensity;
  const handheldY =
    (Math.cos(frame * 0.028 + sceneId) * 2.8 +
      Math.cos(frame * 0.011 + sceneId * 3) * 1.5) *
    numIntensity;
  const handheldRot =
    Math.sin(frame * 0.022 + sceneId) * 0.28 * numIntensity;

  // 2. TRAYECTORIA CINEMATOGRÁFICA PRINCIPAL CONTINUA (Sin saltos cada 5s)
  let baseScale = 1.05;
  let moveX = 0;
  let moveY = 0;

  const progress = frame / Math.max(1, durationInFrames);

  switch (motion) {
    case 'zoom_out':
      baseScale = interpolate(
        progress,
        [0, 1],
        [1.16 * numIntensity, 1.04],
        { extrapolateRight: 'clamp' }
      );
      moveX = interpolate(progress, [0, 1], [1.5 * dirSign, -1.0 * dirSign]);
      break;

    case 'pan_left':
      baseScale = 1.12 + 0.03 * numIntensity;
      moveX = interpolate(
        progress,
        [0, 1],
        [4.0 * numIntensity, -4.0 * numIntensity]
      );
      moveY = interpolate(progress, [0, 1], [-0.5, 0.5]);
      break;

    case 'pan_right':
      baseScale = 1.12 + 0.03 * numIntensity;
      moveX = interpolate(
        progress,
        [0, 1],
        [-4.0 * numIntensity, 4.0 * numIntensity]
      );
      moveY = interpolate(progress, [0, 1], [0.5, -0.5]);
      break;

    case 'static':
      baseScale = 1.05;
      break;

    case 'zoom_in':
    default:
      // Dolly in continuo y elegante con ligera aceleración ease-out
      baseScale = interpolate(
        progress,
        [0, 1],
        [1.03, 1.15 * numIntensity],
        { extrapolateRight: 'clamp' }
      );
      moveX = interpolate(
        progress,
        [0, 1],
        [-1.0 * dirSign, 2.0 * dirSign * numIntensity]
      );
      moveY = interpolate(
        progress,
        [0, 1],
        [0, -1.5 * numIntensity]
      );
      break;
  }

  // 3. RESPIRACIÓN ANAMÓRFICA SUTIL (Lens Breathing)
  const lensBreathing = Math.sin(frame * 0.02) * 0.004 * numIntensity;
  const finalScale = baseScale + lensBreathing;

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
      <div
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: 'center center',
          transform: `scale(${finalScale}) translate(${moveX}% , ${moveY}%) translate(${handheldX}px, ${handheldY}px) rotate(${handheldRot}deg)`,
          filter: 'contrast(1.03) saturate(1.02)',
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

      {/* Viñeta cinematográfica anamórfica perimetral */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 55%, rgba(0, 0, 0, 0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
