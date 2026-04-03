import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { SCENES } from './lib/constants';
import { LogoReveal } from './scenes/LogoReveal';
import { ThreePillars } from './scenes/ThreePillars';
import { ArchitectureFlow } from './scenes/ArchitectureFlow';
import { FeatureHighlights } from './scenes/FeatureHighlights';
import { Closing } from './scenes/Closing';

const FADE = linearTiming({ durationInFrames: SCENES.transitionDuration });

export const DevBotIntro: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENES.logoReveal}>
        <LogoReveal />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={SCENES.threePillars}>
        <ThreePillars />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={SCENES.architectureFlow}>
        <ArchitectureFlow />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={SCENES.featureHighlights}>
        <FeatureHighlights />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={SCENES.closing}>
        <Closing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
