import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { EmotionalAnimationEffect } from '../../types/index.ts';

interface EmotionalFXProps {
  effect: EmotionalAnimationEffect;
  accentColor?: string;
}

/**
 * Motor de Efectos Emocionales Procedurales:
 * Da vida contextual a los personajes según el estado anímico o lo que relata la escena
 * (Humo de enojo, balanceo de mareo/borrachera, destellos dorados de dinero, pulso de pánico).
 * 100% nativo, 0 costo de API, 60fps fluidos.
 */
export const EmotionalFX: React.FC<EmotionalFXProps> = ({
  effect,
  accentColor = '#38bdf8',
}) => {
  const frame = useCurrentFrame();

  if (!effect || effect === 'none') {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
        overflow: 'hidden',
      }}
    >
      {effect === 'smoke_head' && <SmokeHeadEffect frame={frame} />}
      {effect === 'dizzy_wobble' && <DizzyWobbleOverlay frame={frame} />}
      {effect === 'golden_glint' && <GoldenGlintEffect frame={frame} />}
      {effect === 'panic_heartbeat' && <PanicHeartbeatEffect frame={frame} />}
      {effect === 'rage_jitter' && <RageJitterEffect frame={frame} />}
    </div>
  );
};

/**
 * Humo / Vapor de cólera saliendo de la cabeza
 */
const SmokeHeadEffect: React.FC<{ frame: number }> = ({ frame }) => {
  // Generar 7 volutas de humo desfasadas en el tiempo que suben desde la zona superior central
  const puffs = [
    { id: 1, delay: 0, xOffset: -40, speed: 1.1, size: 70 },
    { id: 2, delay: 18, xOffset: 25, speed: 0.9, size: 85 },
    { id: 3, delay: 35, xOffset: -15, speed: 1.2, size: 60 },
    { id: 4, delay: 52, xOffset: 45, speed: 1.0, size: 90 },
    { id: 5, delay: 70, xOffset: -50, speed: 0.85, size: 75 },
    { id: 6, delay: 88, xOffset: 10, speed: 1.15, size: 80 },
    { id: 7, delay: 105, xOffset: -30, speed: 0.95, size: 65 },
  ];

  const cycleDuration = 75; // Duración de vida de cada voluta

  return (
    <>
      {/* Resplandor térmico de enojo sobre la cabeza */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          height: 180,
          background:
            'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.28) 0%, rgba(249, 115, 22, 0.12) 50%, transparent 80%)',
          mixBlendMode: 'screen',
          filter: 'blur(20px)',
          opacity: 0.8 + 0.2 * Math.sin(frame * 0.1),
        }}
      />

      {/* Volutas de vapor / humo ascendente */}
      {puffs.map((p) => {
        const localFrame = (frame + p.delay) % cycleDuration;
        const progress = localFrame / cycleDuration;

        const translateY = interpolate(progress, [0, 1], [0, -180 * p.speed]);
        const translateX =
          p.xOffset + Math.sin(progress * Math.PI * 3 + p.id) * 25;
        const scale = interpolate(progress, [0, 0.3, 1], [0.4, 1.2, 1.9]);
        const opacity = interpolate(
          progress,
          [0, 0.2, 0.7, 1],
          [0, 0.65, 0.45, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: 'rgba(240, 240, 245, 0.45)',
              transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
              opacity,
              filter: 'blur(16px)',
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
    </>
  );
};

/**
 * Efecto de distorsión y oscilación para estados de mareo, descontrol o borrachera
 */
const DizzyWobbleOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const wobbleX = Math.sin(frame * 0.05) * 14 + Math.sin(frame * 0.02) * 8;
  const wobbleY = Math.cos(frame * 0.04) * 8;
  const rotateZ = Math.sin(frame * 0.035) * 1.5;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${wobbleX}px, ${wobbleY}px) rotate(${rotateZ}deg)`,
        mixBlendMode: 'color-dodge',
        opacity: 0.22,
        background:
          'radial-gradient(circle at center, transparent 30%, rgba(168, 85, 247, 0.4) 100%)',
      }}
    />
  );
};

/**
 * Destellos y partículas doradas de dinero / riqueza / éxito
 */
const GoldenGlintEffect: React.FC<{ frame: number }> = ({ frame }) => {
  // Coordenadas fijas donde brotan destellos brillantes
  const stars = [
    { x: '35%', y: '28%', delay: 0 },
    { x: '62%', y: '25%', delay: 20 },
    { x: '48%', y: '42%', delay: 40 },
    { x: '25%', y: '50%', delay: 60 },
    { x: '72%', y: '48%', delay: 80 },
  ];

  return (
    <>
      {stars.map((s, idx) => {
        const starCycle = (frame + s.delay) % 90;
        const starProgress = starCycle / 90;
        const starOpacity = interpolate(
          starProgress,
          [0, 0.15, 0.35, 0.5, 1],
          [0, 1, 0.8, 0, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const starScale = interpolate(
          starProgress,
          [0, 0.25, 0.5],
          [0.2, 1.4, 0.1],
          { extrapolateRight: 'clamp' }
        );
        const rotation = (frame + s.delay) * 2;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: s.y,
              left: s.x,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${starScale})`,
              opacity: starOpacity,
              pointerEvents: 'none',
            }}
          >
            {/* Destello de 4 puntas dorado */}
            <svg width="40" height="40" viewBox="0 0 40 40">
              <path
                d="M 20 0 Q 20 20 40 20 Q 20 20 20 40 Q 20 20 0 20 Q 20 20 20 0 Z"
                fill="#fef08a"
              />
              <circle cx="20" cy="20" r="4" fill="#ffffff" />
            </svg>
          </div>
        );
      })}

      {/* Partículas de polvo de oro ambiental ascendente */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 40%, rgba(234, 179, 8, 0.12) 0%, transparent 70%)',
          mixBlendMode: 'screen',
        }}
      />
    </>
  );
};

/**
 * Pánico / Taquicardia (Latido cardíaco y viñeta de emergencia)
 */
const PanicHeartbeatEffect: React.FC<{ frame: number }> = ({ frame }) => {
  // Doble latido ("lub-dub") cada 45 fotogramas (~1.5 segundos)
  const cycle = frame % 45;
  let pulse = 0;
  if (cycle >= 0 && cycle < 6) {
    pulse = Math.sin((cycle / 6) * Math.PI) * 0.7;
  } else if (cycle >= 8 && cycle < 15) {
    pulse = Math.sin(((cycle - 8) / 7) * Math.PI) * 1.0;
  }

  const vignetteRed = interpolate(pulse, [0, 1], [0.15, 0.45]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        boxShadow: `inset 0 0 ${120 + pulse * 60}px rgba(220, 38, 38, ${vignetteRed})`,
        mixBlendMode: 'multiply',
      }}
    />
  );
};

/**
 * Furia contenida: Micro-temblor de vibración extrema
 */
const RageJitterEffect: React.FC<{ frame: number }> = ({ frame }) => {
  const intensity = 0.5 + 0.5 * Math.sin(frame * 0.1);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        boxShadow: `inset 0 0 100px rgba(239, 68, 68, ${0.25 * intensity})`,
        mixBlendMode: 'color-burn',
      }}
    />
  );
};
