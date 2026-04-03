import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { ECS_EKS_SCENES } from './lib/constants';
import { EcsEksTitle } from './scenes/EcsEksTitle';
import { WhyMigrate } from './scenes/WhyMigrate';
import { MigrationSteps } from './scenes/MigrationSteps';
import { ArchitectureComparison } from './scenes/ArchitectureComparison';
import { EcsEksClosing } from './scenes/EcsEksClosing';

const FADE = linearTiming({
  durationInFrames: ECS_EKS_SCENES.transitionDuration,
});

export const EcsToEks: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={ECS_EKS_SCENES.title}>
        <EcsEksTitle />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={ECS_EKS_SCENES.whyMigrate}>
        <WhyMigrate />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={ECS_EKS_SCENES.migrationSteps}>
        <MigrationSteps />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={ECS_EKS_SCENES.architecture}>
        <ArchitectureComparison />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={ECS_EKS_SCENES.closing}>
        <EcsEksClosing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
