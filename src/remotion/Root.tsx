import React from 'react';
import { Composition } from 'remotion';
import { DocumentaryVideo, type DocumentaryVideoProps } from './DocumentaryVideo.tsx';

export const RemotionRoot: React.FC = () => {
  const sampleProps: DocumentaryVideoProps = {
    channelId: 'tech_scandals',
    title: 'El Escándalo de Fast.co',
    scenes: [
      {
        scene_id: 1,
        chapter: 'El Espejismo Inicial',
        voiceover:
          'En Silicon Valley hay una regla que nadie dice en voz alta: si el dinero fluye lo suficientemente rápido, nadie se molesta en mirar los libros contables.',
        visual_prompt: 'Cinematic corporate boardroom with high contrast lighting',
        camera_motion: 'zoom_in',
        durationInSeconds: 10,
      },
      {
        scene_id: 2,
        chapter: 'La Máquina de Quemar Millones',
        voiceover:
          'Fast prometía el checkout en un clic que destruiría a Stripe. Quemaron 120 millones en 24 meses... antes de que la verdad saliera a la luz.',
        visual_prompt: 'Tech founder on stage with dazzling screens behind',
        camera_motion: 'pan_left',
        durationInSeconds: 12,
      },
    ],
  };

  const totalDurationInSeconds = sampleProps.scenes.reduce(
    (acc, s) => acc + s.durationInSeconds,
    0
  );

  return (
    <>
      <Composition<any, DocumentaryVideoProps>
        id="DocumentaryVideo"
        component={DocumentaryVideo}
        durationInFrames={Math.max(30, totalDurationInSeconds * 30)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={sampleProps}
        calculateMetadata={async ({ props }) => {
          const totalDuration = (props.scenes || []).reduce(
            (acc, s) => acc + (s.durationInSeconds || 5),
            0
          );
          return {
            durationInFrames: Math.max(30, Math.round(totalDuration * 30)),
            props,
          };
        }}
      />
    </>
  );
};
