import React from 'react';
import { Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneItem, MotionIntensityType } from '../types/index.ts';
import { LivingVisualRenderer } from './LivingVisualRenderer.tsx';
import { resolveShotFrames } from './shotTiming.ts';

const SHOT_CROSSFADE_FRAMES = 4;

export interface ShotSequenceProps {
  scene: SceneItem;
  fallbackSrc: string;
  durationInFrames: number;
  motionIntensity?: MotionIntensityType;
  accentColor: string;
  resolveUrl: (url?: string) => string;
}

/**
 * Visual layer for sequence mode: renders the scene's camera shots back to back,
 * anchored to the narration. Audio, captions and cards stay at the scene level.
 */
export const ShotSequence: React.FC<ShotSequenceProps> = ({
  scene,
  fallbackSrc,
  durationInFrames,
  motionIntensity = 'standard',
  accentColor,
  resolveUrl,
}) => {
  const { fps } = useVideoConfig();
  const ranges = resolveShotFrames(scene, fps, durationInFrames);

  return (
    <>
      {ranges.map(({ shot, from, durationInFrames: shotFrames }, idx) => (
        <Sequence key={shot.shot_id} from={from} durationInFrames={shotFrames} layout="none">
          <ShotFrame
            src={shot.imageUrl ? resolveUrl(shot.imageUrl) : fallbackSrc}
            fadeIn={idx > 0}
            durationInFrames={shotFrames}
            motion={shot.camera_motion || scene.camera_motion || 'zoom_in'}
            sceneId={scene.scene_id * 100 + idx}
            shotType={shot.shot_type || scene.shot_type}
            motionIntensity={motionIntensity}
            accentColor={accentColor}
          />
        </Sequence>
      ))}
    </>
  );
};

interface ShotFrameProps {
  src: string;
  fadeIn: boolean;
  durationInFrames: number;
  motion: string;
  sceneId: number;
  shotType?: SceneItem['shot_type'];
  motionIntensity: MotionIntensityType;
  accentColor: string;
}

const ShotFrame: React.FC<ShotFrameProps> = ({
  src,
  fadeIn,
  durationInFrames,
  motion,
  sceneId,
  shotType,
  motionIntensity,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn
    ? interpolate(frame, [0, SHOT_CROSSFADE_FRAMES], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', opacity }}>
      <LivingVisualRenderer
        src={src}
        motion={motion}
        durationInFrames={durationInFrames}
        sceneId={sceneId}
        shotType={shotType}
        motionMode="cinematic_camera"
        intensity={motionIntensity}
        accentColor={accentColor}
      />
    </div>
  );
};
