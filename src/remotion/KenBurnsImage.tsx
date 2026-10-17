import React from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';

interface KenBurnsImageProps {
  src: string;
  motion: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
  durationInFrames: number;
  sceneId?: number;
}

/**
 * Motor Multi-Cámara de Alta Retención:
 * Divide automáticamente cualquier escena larga (20-30s) en sub-cortes dinámicos (Beats)
 * de ~5 segundos cada uno, alternando entre Plano General, Punch-In Dramático,
 * Ángulo Lateral y Plano de Cierre para que la pantalla nunca se sienta estática.
 */
export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  motion,
  durationInFrames,
  sceneId = 1,
}) => {
  const frame = useCurrentFrame();

  // Dividir la escena en 4 sub-cortes (cada ~4.5 a 5.5 segundos)
  const beatDuration = Math.max(120, Math.min(165, Math.floor(durationInFrames / 4)));
  const beatIndex = Math.floor(frame / beatDuration);
  const frameInBeat = frame % beatDuration;

  const dirSign = sceneId % 2 === 0 ? 1 : -1;

  let scale = 1.05;
  let translateX = 0;
  let translateY = 0;
  let contrast = 1.0;

  switch (beatIndex % 4) {
    case 0:
      // BEAT 1 (0s - 5s): Plano de Establecimiento Dinámico
      if (motion === 'zoom_out') {
        scale = interpolate(frameInBeat, [0, beatDuration], [1.16, 1.04], {
          extrapolateRight: 'clamp',
        });
      } else if (motion === 'pan_left' || motion === 'pan_right') {
        scale = 1.12;
        translateX = interpolate(
          frameInBeat,
          [0, beatDuration],
          [3 * dirSign, -3 * dirSign],
          { extrapolateRight: 'clamp' }
        );
      } else {
        scale = interpolate(frameInBeat, [0, beatDuration], [1.02, 1.14], {
          extrapolateRight: 'clamp',
        });
      }
      break;

    case 1:
      // BEAT 2 (5s - 10s): CORTE A PRIMER PLANO DRAMÁTICO (Punch-in Cut)
      scale = interpolate(frameInBeat, [0, beatDuration], [1.26, 1.34], {
        extrapolateRight: 'clamp',
      });
      translateX = interpolate(
        frameInBeat,
        [0, beatDuration],
        [-2.5 * dirSign, -4.0 * dirSign],
        { extrapolateRight: 'clamp' }
      );
      translateY = -3.0;
      contrast = 1.06;
      break;

    case 2:
      // BEAT 3 (10s - 15s): CORTE A ENCUADRE LATERAL (Acompaña a la Tarjeta Forense)
      scale = interpolate(frameInBeat, [0, beatDuration], [1.18, 1.24], {
        extrapolateRight: 'clamp',
      });
      translateX = interpolate(
        frameInBeat,
        [0, beatDuration],
        [3.5 * dirSign, 1.0 * dirSign],
        { extrapolateRight: 'clamp' }
      );
      translateY = 1.5;
      contrast = 1.03;
      break;

    case 3:
    default:
      // BEAT 4 (15s - fin): PLANO PANORÁMICO DE TRANSICIÓN
      scale = interpolate(frameInBeat, [0, beatDuration], [1.16, 1.04], {
        extrapolateRight: 'clamp',
      });
      translateX = interpolate(
        frameInBeat,
        [0, beatDuration],
        [-1.5 * dirSign, 1.5 * dirSign],
        { extrapolateRight: 'clamp' }
      );
      translateY = 0;
      break;
  }

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: `contrast(${contrast})`,
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
};
