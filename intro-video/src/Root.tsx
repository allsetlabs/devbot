import React from 'react';
import { Composition } from 'remotion';
import { DevBotIntro } from './DevBotIntro';
import { VIDEO, SCENES, ECS_EKS_SCENES, LAWN_CARE_SCENES, BABY_LOGS_SCENES } from './lib/constants';
import { HelloWorld } from './HelloWorld';
import { EcsToEks } from './EcsToEks';
import { LawnCareMarketing } from './LawnCareMarketing';
import { BabyLogsMarketing } from './BabyLogsMarketing';

// Total duration = sum of scenes - transitions overlap
// 5 scenes, 4 transitions of 15 frames each
const totalDuration =
  SCENES.logoReveal +
  SCENES.threePillars +
  SCENES.architectureFlow +
  SCENES.featureHighlights +
  SCENES.closing -
  4 * SCENES.transitionDuration;

const ecsEksDuration =
  ECS_EKS_SCENES.title +
  ECS_EKS_SCENES.whyMigrate +
  ECS_EKS_SCENES.migrationSteps +
  ECS_EKS_SCENES.architecture +
  ECS_EKS_SCENES.closing -
  4 * ECS_EKS_SCENES.transitionDuration;

const babyLogsDuration =
  BABY_LOGS_SCENES.title +
  BABY_LOGS_SCENES.features +
  BABY_LOGS_SCENES.analytics +
  BABY_LOGS_SCENES.tracking +
  BABY_LOGS_SCENES.closing -
  4 * BABY_LOGS_SCENES.transitionDuration;

const lawnCareDuration =
  LAWN_CARE_SCENES.title +
  LAWN_CARE_SCENES.features +
  LAWN_CARE_SCENES.howItWorks +
  LAWN_CARE_SCENES.appPreview +
  LAWN_CARE_SCENES.closing -
  4 * LAWN_CARE_SCENES.transitionDuration;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DevBotIntro"
        component={DevBotIntro}
        durationInFrames={totalDuration}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="EcsToEks"
        component={EcsToEks}
        durationInFrames={ecsEksDuration}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="LawnCareMarketing"
        component={LawnCareMarketing}
        durationInFrames={lawnCareDuration}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="BabyLogsMarketing"
        component={BabyLogsMarketing}
        durationInFrames={babyLogsDuration}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
