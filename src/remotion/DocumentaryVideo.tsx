import React from 'react';
import { Sequence, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneItem, MotionIntensityType } from '../types/index.ts';
import { LivingVisualRenderer } from './LivingVisualRenderer.tsx';
import { ShotSequence } from './ShotSequence.tsx';
import { Atmosphere } from './Atmosphere.tsx';
import { KineticCaptions } from './KineticCaptions.tsx';
import { VisualBeats } from './VisualBeats.tsx';

export interface DocumentaryVideoProps {
  channelId: string;
  title: string;
  scenes: SceneItem[];
  visualMode?: 'classic' | 'sequence';
  showCaptions?: boolean;
  showAtmosphere?: boolean;
  showHighlightCards?: boolean;
  showChapterBadge?: boolean;
  motionIntensity?: MotionIntensityType;
  language?: 'es' | 'en';
  [key: string]: unknown;
}

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/storage') || url.startsWith('/channel-assets')) {
    return `http://127.0.0.1:3001${url}`;
  }
  return url;
}

export const DocumentaryVideo: React.FC<DocumentaryVideoProps> = ({
  channelId,
  scenes = [],
  visualMode,
  showCaptions = true,
  showAtmosphere = true,
  showHighlightCards = true,
  showChapterBadge = true,
  motionIntensity = 'standard',
  language = 'en',
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
        const videoSrc = scene.videoUrl ? resolveMediaUrl(scene.videoUrl) : undefined;

        return (
          <Sequence
            key={`scene_${scene.scene_id}_${idx}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SceneRenderer
              scene={scene}
              visualMode={visualMode}
              imgSrc={imgSrc}
              videoSrc={videoSrc}
              durationInFrames={durationInFrames}
              channelId={channelId}
              accentColor={accentColor}
              showCaptions={showCaptions}
              showAtmosphere={showAtmosphere}
              showHighlightCards={showHighlightCards}
              showChapterBadge={showChapterBadge}
              motionIntensity={motionIntensity}
              language={language}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

interface SceneRendererProps {
  scene: SceneItem;
  visualMode?: 'classic' | 'sequence';
  imgSrc: string;
  videoSrc?: string;
  durationInFrames: number;
  channelId: string;
  accentColor: string;
  showCaptions?: boolean;
  showAtmosphere?: boolean;
  showHighlightCards?: boolean;
  showChapterBadge?: boolean;
  motionIntensity?: MotionIntensityType;
  language?: 'es' | 'en';
}

const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  visualMode,
  imgSrc,
  videoSrc,
  durationInFrames,
  channelId,
  accentColor,
  showCaptions = true,
  showAtmosphere = true,
  showHighlightCards = true,
  showChapterBadge = true,
  motionIntensity = 'standard',
  language = 'en',
}) => {
  const frame = useCurrentFrame();

  // Smooth fade in / fade out (12 frames)
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
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
      {visualMode !== 'classic' && scene.shots && scene.shots.length > 0 ? (
        <ShotSequence
          scene={scene}
          fallbackSrc={imgSrc}
          durationInFrames={durationInFrames}
          motionIntensity={motionIntensity}
          accentColor={accentColor}
          resolveUrl={resolveMediaUrl}
        />
      ) : (
        <LivingVisualRenderer
          src={imgSrc}
          videoUrl={videoSrc}
          motion={scene.camera_motion || 'zoom_in'}
          durationInFrames={durationInFrames}
          sceneId={scene.scene_id}
          shotType={scene.shot_type}
          motionMode={scene.motion_mode}
          characterEffect={scene.character_effect}
          intensity={motionIntensity}
          accentColor={accentColor}
        />
      )}
      {showAtmosphere && <Atmosphere channelId={channelId} />}

      {/* Cortes de Cámara Dinámicos y Tarjetas Forenses de Datos / Conceptos */}
      {showHighlightCards && (
        <VisualBeats
          sceneId={scene.scene_id}
          actNumber={scene.act_number}
          narrativeBlock={scene.narrative_block}
          highlightMetric={scene.highlight_metric}
          highlightLabel={scene.highlight_label}
          accentColor={accentColor}
          durationInFrames={durationInFrames}
          language={language}
        />
      )}

      {/* Audio de Locución Sincronizado */}
      {scene.audioUrl && <Audio src={resolveMediaUrl(scene.audioUrl)} />}

      {/* Chapter Badge (Top Left) */}
      {showChapterBadge && (
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
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${accentColor}40`,
            zIndex: 40,
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
            {scene.scene_id}. {scene.chapter}
          </span>
        </div>
      )}

      {/* Subtítulos Cinematográficos Cinéticos de Alta Retención */}
      {showCaptions && (
        <KineticCaptions
          voiceover={scene.voiceover}
          wordTimings={scene.wordTimings}
          accentColor={accentColor}
          durationInFrames={durationInFrames}
        />
      )}
    </div>
  );
};

