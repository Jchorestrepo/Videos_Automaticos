import React from 'react';
import type {
  ShotType,
  VisualMotionMode,
  EmotionalAnimationEffect,
  MotionIntensityType,
} from '../types/index.ts';
import { LivingVisualRenderer } from './LivingVisualRenderer.tsx';

export interface KenBurnsImageProps {
  src: string;
  videoUrl?: string;
  motion?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
  durationInFrames: number;
  sceneId?: number;
  shotType?: ShotType;
  motionMode?: VisualMotionMode;
  characterEffect?: EmotionalAnimationEffect;
  intensity?: MotionIntensityType;
  accentColor?: string;
}

/**
 * KenBurnsImage (Adaptador Compatible de LivingVisualRenderer):
 * Mantiene compatibilidad con código existente al tiempo que entrega
 * la nueva experiencia cinematográfica de documental premium.
 */
export const KenBurnsImage: React.FC<KenBurnsImageProps> = (props) => {
  return <LivingVisualRenderer {...props} />;
};
