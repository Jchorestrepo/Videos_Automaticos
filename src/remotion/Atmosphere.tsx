import React from 'react';

interface AtmosphereProps {
  channelId: string;
}

export const Atmosphere: React.FC<AtmosphereProps> = ({ channelId }) => {
  const isTech = channelId.includes('tech');

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Cinematic Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.65) 100%)',
        }}
      />

      {/* Atmospheric Tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isTech
            ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.04) 0%, rgba(15, 23, 42, 0.25) 100%)'
            : 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(30, 20, 10, 0.3) 100%)',
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
};
