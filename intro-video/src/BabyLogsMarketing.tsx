import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { BABY_LOGS_SCENES } from './lib/constants';
import { BabyLogsTitle } from './scenes/BabyLogsTitle';
import { BabyLogsFeatures } from './scenes/BabyLogsFeatures';
import { BabyLogsAnalytics } from './scenes/BabyLogsAnalytics';
import { BabyLogsTracking } from './scenes/BabyLogsTracking';
import { BabyLogsClosing } from './scenes/BabyLogsClosing';

const FADE = linearTiming({
  durationInFrames: BABY_LOGS_SCENES.transitionDuration,
});

export const BabyLogsMarketing: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={BABY_LOGS_SCENES.title}>
        <BabyLogsTitle />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={BABY_LOGS_SCENES.features}>
        <BabyLogsFeatures />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={BABY_LOGS_SCENES.analytics}>
        <BabyLogsAnalytics />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={BABY_LOGS_SCENES.tracking}>
        <BabyLogsTracking />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={BABY_LOGS_SCENES.closing}>
        <BabyLogsClosing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
