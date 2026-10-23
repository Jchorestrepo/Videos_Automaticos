import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { NarrativeBlockType } from '../types/index.ts';

export interface VisualBeatsProps {
  sceneId: number;
  actNumber?: number;
  narrativeBlock?: NarrativeBlockType;
  highlightMetric?: string;
  highlightLabel?: string;
  accentColor: string;
  durationInFrames: number;
  language?: 'es' | 'en';
}

const BLOCK_BADGE_MAP_ES: Record<
  NarrativeBlockType,
  { tag: string; subtitle: string; badgeColor: string }
> = {
  hook_climax: {
    tag: 'ACTO I • EL ESPEJISMO EN LA CIMA',
    subtitle: 'CASO DE ESTUDIO FORENSE',
    badgeColor: '#f59e0b',
  },
  protagonist_origin: {
    tag: 'ACTO II • EXPEDIENTE DEL PROTAGONISTA',
    subtitle: 'ORIGEN, ASCENSO Y PSICOLOGÍA',
    badgeColor: '#38bdf8',
  },
  antagonist_rival: {
    tag: 'ACTO III • LA FUERZA EN LA SOMBRA',
    subtitle: 'EL RIVAL Y EL CONTRAPESO ESTRATÉGICO',
    badgeColor: '#a855f7',
  },
  concept_explainer: {
    tag: 'ACTO IV • PARÉNTESIS MAESTRO',
    subtitle: 'EXPLICACIÓN DEL MECANISMO OCULTO',
    badgeColor: '#10b981',
  },
  collision_collapse: {
    tag: 'ACTO V • PUNTO DE QUIEBRE',
    subtitle: 'CRONOLOGÍA DEL COLAPSO',
    badgeColor: '#ef4444',
  },
  aftermath_verdict: {
    tag: 'ACTO VI • VEREDICTO FINAL',
    subtitle: 'LAS CENIZAS DEL IMPERIO',
    badgeColor: '#94a3b8',
  },
};

const BLOCK_BADGE_MAP_EN: Record<
  NarrativeBlockType,
  { tag: string; subtitle: string; badgeColor: string }
> = {
  hook_climax: {
    tag: 'ACT I • THE MIRAGE AT THE TOP',
    subtitle: 'FORENSIC CASE STUDY',
    badgeColor: '#f59e0b',
  },
  protagonist_origin: {
    tag: 'ACT II • PROTAGONIST DOSSIER',
    subtitle: 'ORIGIN, RISE & PSYCHOLOGY',
    badgeColor: '#38bdf8',
  },
  antagonist_rival: {
    tag: 'ACT III • FORCE IN THE SHADOWS',
    subtitle: 'THE RIVAL & STRATEGIC COUNTER',
    badgeColor: '#a855f7',
  },
  concept_explainer: {
    tag: 'ACT IV • MASTER EXPLAINER',
    subtitle: 'HIDDEN MECHANISM UNVEILED',
    badgeColor: '#10b981',
  },
  collision_collapse: {
    tag: 'ACT V • BREAKING POINT',
    subtitle: 'TIMELINE OF THE COLLAPSE',
    badgeColor: '#ef4444',
  },
  aftermath_verdict: {
    tag: 'ACT VI • FINAL VERDICT',
    subtitle: 'THE ASHES OF THE EMPIRE',
    badgeColor: '#94a3b8',
  },
};

export const VisualBeats: React.FC<VisualBeatsProps> = ({
  sceneId,
  narrativeBlock = 'hook_climax',
  highlightMetric,
  highlightLabel,
  accentColor,
  durationInFrames,
  language = 'en',
}) => {
  const isEn = language === 'en';
  const blockMeta = (isEn ? BLOCK_BADGE_MAP_EN : BLOCK_BADGE_MAP_ES)[narrativeBlock] || (isEn ? BLOCK_BADGE_MAP_EN.hook_climax : BLOCK_BADGE_MAP_ES.hook_climax);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cada 5 segundos (~150 frames) hay un sub-corte de cámara
  const beatDurationFrames = Math.max(120, Math.min(165, Math.floor(durationInFrames / 4)));
  const frameInBeat = frame % beatDurationFrames;
  const beatIndex = Math.floor(frame / beatDurationFrames);

  // 1. Micro-destello óptico sutil cuando ocurre un corte de cámara interno (Beat 1, 2, 3)
  const isInternalCut = beatIndex > 0 && frameInBeat < 6 && frame < durationInFrames - 20;
  const flashOpacity = isInternalCut
    ? interpolate(frameInBeat, [0, 5], [0.16, 0], { extrapolateRight: 'clamp' })
    : 0;

  // 2. Tarjeta Forense de Evidencia / Cifra / Concepto Clave (Aparece en el segundo Beat, ~4.5s a 13s)
  const cardStartFrame = Math.min(135, Math.floor(durationInFrames * 0.25));
  const cardEndFrame = Math.min(
    durationInFrames - 35,
    cardStartFrame + Math.floor(fps * 7.5)
  );
  const showCard =
    Boolean(highlightMetric) && frame >= cardStartFrame && frame <= cardEndFrame;

  const cardSpringIn = spring({
    frame: Math.max(0, frame - cardStartFrame),
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.6 },
  });

  const cardFadeOut = interpolate(
    frame,
    [cardEndFrame - 15, cardEndFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const cardOpacity = cardSpringIn * cardFadeOut;
  const cardTranslateX = interpolate(cardSpringIn, [0, 1], [50, 0]);

  const activeColor = blockMeta.badgeColor || accentColor;

  // Alternar posición de la tarjeta (derecha o izquierda) según la escena para mayor dinamismo
  const isRightAligned = sceneId % 2 === 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 35,
      }}
    >
      {/* Micro-flash de corte de cámara cada ~5s */}
      {flashOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#ffffff',
            opacity: flashOpacity,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Indicador de Bloque Narrativo (Top Right) */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          right: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          padding: '8px 18px',
          borderRadius: 10,
          backgroundColor: 'rgba(8, 13, 26, 0.78)',
          backdropFilter: 'blur(10px)',
          borderRight: `4px solid ${activeColor}`,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 2.2,
            color: activeColor,
            textTransform: 'uppercase',
          }}
        >
          {blockMeta.tag}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: '#94a3b8',
            marginTop: 2,
          }}
        >
          {blockMeta.subtitle} • {isEn ? 'CAM' : 'CÁMARA'} {(beatIndex % 4) + 1}
        </span>
      </div>

      {/* Tarjeta Forense de Impacto (Mitad de escena: Dato Duro / Concepto / Personaje) */}
      {showCard && (
        <div
          style={{
            position: 'absolute',
            top: 210,
            ...(isRightAligned ? { right: 80 } : { left: 80 }),
            opacity: cardOpacity,
            transform: `translateX(${isRightAligned ? cardTranslateX : -cardTranslateX}px)`,
            maxWidth: 520,
            padding: '24px 32px',
            borderRadius: 18,
            backgroundColor: 'rgba(6, 11, 23, 0.88)',
            backdropFilter: 'blur(18px)',
            border: `1px solid ${activeColor}66`,
            boxShadow: `0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${activeColor}25`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: activeColor,
                boxShadow: `0 0 12px ${activeColor}`,
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 2.5,
                color: '#cbd5e1',
                textTransform: 'uppercase',
              }}
            >
              {highlightLabel || (isEn ? 'VERIFIED EVIDENCE' : 'EVIDENCIA VERIFICADA')}
            </span>
          </div>

          <div
            style={{
              fontSize: 54,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              textShadow: `0 0 30px ${activeColor}60`,
              fontFamily: 'Montserrat, Inter, system-ui, sans-serif',
            }}
          >
            {highlightMetric}
          </div>

          {/* Barra de progreso animada dentro de la tarjeta */}
          <div
            style={{
              marginTop: 16,
              width: '100%',
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${interpolate(
                  frame,
                  [cardStartFrame, cardEndFrame],
                  [15, 100],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}%`,
                backgroundColor: activeColor,
                boxShadow: `0 0 10px ${activeColor}`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
