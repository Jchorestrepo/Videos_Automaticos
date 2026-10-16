import React from 'react';
import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface KenBurnsImageProps {
  src: string;
  motion: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
  durationInFrames: number;
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  motion,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  switch (motion) {
    case 'zoom_in':
      scale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'zoom_out':
      scale = interpolate(frame, [0, durationInFrames], [1.12, 1.0], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'pan_left':
      scale = 1.08;
      translateX = interpolate(frame, [0, durationInFrames], [2, -2], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'pan_right':
      scale = 1.08;
      translateX = interpolate(frame, [0, durationInFrames], [-2, 2], {
        extrapolateRight: 'clamp',
      });
      break;
    case 'static':
    default:
      scale = 1.0;
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
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
};
