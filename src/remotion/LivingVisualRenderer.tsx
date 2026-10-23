import React from 'react';
import { Video, OffthreadVideo } from 'remotion';
import type {
  ShotType,
  VisualMotionMode,
  EmotionalAnimationEffect,
  MotionIntensityType,
} from '../types/index.ts';
import { LivingCharacter } from './LivingCharacter.tsx';
import { CinematicCamera } from './CinematicCamera.tsx';

export interface LivingVisualRendererProps {
  src: string;
  videoUrl?: string;
  motion?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static' | string;
  durationInFrames: number;
  sceneId?: number;
  shotType?: ShotType;
  motionMode?: VisualMotionMode;
  characterEffect?: EmotionalAnimationEffect;
  intensity?: MotionIntensityType;
  accentColor?: string;
}

/**
 * Orquestador de Cinematografía Híbrida:
 * Encuentra el equilibrio perfecto entre:
 * 1. Personajes con vida (Respiración anatómica, 2.5D, micro-parpadeo y emociones contextuales).
 * 2. Planos de cámara cinematográficos continuos para paisajes, diagramas y objetos.
 * 3. Reproducción fluida de clips de video si la escena cuenta con uno.
 */
export const LivingVisualRenderer: React.FC<LivingVisualRendererProps> = ({
  src,
  videoUrl,
  motion = 'zoom_in',
  durationInFrames,
  sceneId = 1,
  shotType,
  motionMode = 'auto',
  characterEffect = 'none',
  intensity = 'standard',
  accentColor = '#38bdf8',
}) => {
  // 1. Si la escena cuenta con un clip de video (generado o subido), se reproduce con prioridad
  if (videoUrl) {
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
        <OffthreadVideo
          src={videoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    );
  }

  // 2. Determinar si esta escena debe cobrar vida como personaje o usar movimiento de cámara
  let isCharacter = false;

  if (motionMode === 'character_alive') {
    isCharacter = true;
  } else if (motionMode === 'cinematic_camera') {
    isCharacter = false;
  } else {
    // Modo automático: inferir del shotType
    isCharacter =
      shotType === 'character_closeup' ||
      shotType === 'antagonist_shot' ||
      characterEffect !== 'none';
  }

  // 3. Renderizar el motor correspondiente
  if (isCharacter) {
    return (
      <LivingCharacter
        src={src}
        durationInFrames={durationInFrames}
        sceneId={sceneId}
        intensity={intensity}
        effect={characterEffect}
        accentColor={accentColor}
      />
    );
  }

  return (
    <CinematicCamera
      src={src}
      motion={motion}
      durationInFrames={durationInFrames}
      sceneId={sceneId}
      intensity={intensity}
    />
  );
};
