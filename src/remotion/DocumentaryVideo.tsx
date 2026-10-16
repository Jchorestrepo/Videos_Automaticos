import React from 'react';
import { Sequence, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneItem } from '../types/index.ts';
import { KenBurnsImage } from './KenBurnsImage.tsx';
import { Atmosphere } from './Atmosphere.tsx';
import { KineticCaptions } from './KineticCaptions.tsx';

export interface DocumentaryVideoProps {
  channelId: string;
  title: string;
  scenes: SceneItem[];
  [key: string]: unknown;
}

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/storage')) {
    return `http://127.0.0.1:3001${url}`;
  }
  return url;
}

export const DocumentaryVideo: React.FC<DocumentaryVideoProps> = ({
  channelId,
  title,
  scenes = [],
}) => {
  const { fps } = useVideoConfig();
  const isTech = channelId.includes('tech');
  const accentColor = isTech ? '#38bdf8' : '#fbbf24';

  let currentFrameOffset = 0;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#000000',
        position: 'relative',
        width: 1920,
        height: 1080,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {scenes.map((scene, idx) => {
        const durationInFrames = Math.max(30, Math.round(scene.durationInSeconds * fps));
        const from = currentFrameOffset;
        currentFrameOffset += durationInFrames;

        // Fallback placeholder image URL if not set
        const rawImgSrc =
          scene.imageUrl ||
          `https://placehold.co/1920x1080/0f172a/ffffff?text=${encodeURIComponent(
            scene.chapter
          )}`;
        const imgSrc = resolveMediaUrl(rawImgSrc);

        return (
          <Sequence
            key={`scene_${scene.scene_id}_${idx}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SceneRenderer
              scene={scene}
              imgSrc={imgSrc}
              durationInFrames={durationInFrames}
              channelId={channelId}
              accentColor={accentColor}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

interface SceneRendererProps {
  scene: SceneItem;
  imgSrc: string;
  durationInFrames: number;
  channelId: string;
  accentColor: string;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  imgSrc,
  durationInFrames,
  channelId,
  accentColor,
}) => {
  const frame = useCurrentFrame();

  // Smooth fade in / fade out (15 frames)
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity,
      }}
    >
      <KenBurnsImage
        src={imgSrc}
        motion={scene.camera_motion || 'zoom_in'}
        durationInFrames={durationInFrames}
      />
      <Atmosphere channelId={channelId} />

      {/* Audio de Locución Sincronizado */}
      {scene.audioUrl && <Audio src={resolveMediaUrl(scene.audioUrl)} />}

      {/* Chapter Badge (Top Left) */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 20px',
          borderRadius: 8,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${accentColor}40`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#f8fafc',
          }}
        >
          {scene.chapter}
        </span>
      </div>

      {/* Subtítulos Cinematográficos Cinéticos de Alta Retención */}
      <KineticCaptions
        voiceover={scene.voiceover}
        wordTimings={scene.wordTimings}
        accentColor={accentColor}
        durationInFrames={durationInFrames}
      />
    </div>
  );
};
