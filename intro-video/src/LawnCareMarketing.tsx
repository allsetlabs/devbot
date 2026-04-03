import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { LAWN_CARE_SCENES } from './lib/constants';
import { LawnCareTitle } from './scenes/LawnCareTitle';
import { LawnCareFeatures } from './scenes/LawnCareFeatures';
import { LawnCareHowItWorks } from './scenes/LawnCareHowItWorks';
import { LawnCareAppPreview } from './scenes/LawnCareAppPreview';
import { LawnCareClosing } from './scenes/LawnCareClosing';

const FADE = linearTiming({
  durationInFrames: LAWN_CARE_SCENES.transitionDuration,
});

export const LawnCareMarketing: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={LAWN_CARE_SCENES.title}>
        <LawnCareTitle />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={LAWN_CARE_SCENES.features}>
        <LawnCareFeatures />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={LAWN_CARE_SCENES.howItWorks}>
        <LawnCareHowItWorks />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={LAWN_CARE_SCENES.appPreview}>
        <LawnCareAppPreview />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={LAWN_CARE_SCENES.closing}>
        <LawnCareClosing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
