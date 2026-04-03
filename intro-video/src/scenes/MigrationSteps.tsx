import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

type StepProps = {
  number: number;
  title: string;
  details: string;
  delay: number;
  accent: string;
};

const Step: React.FC<StepProps> = ({ number, title, details, delay, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, delay, config: { damping: 12 } });
  const translateX = interpolate(entrance, [0, 1], [-60, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  const connectorSpring = spring({ frame, fps, delay: delay + 10, config: { damping: 15 } });
  const connectorHeight = interpolate(connectorSpring, [0, 1], [0, 50]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity,
          transform: `translateX(${translateX}px)`,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: accent,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 16,
              color: COLORS.textMuted,
            }}
          >
            {details}
          </span>
        </div>
      </div>
      {number < 5 && (
        <div
          style={{
            width: 2,
            height: connectorHeight,
            backgroundColor: COLORS.border,
            marginLeft: -220,
          }}
        />
      )}
    </div>
  );
};

const steps = [
  {
    title: 'Audit ECS Services',
    details: 'Map task definitions, networking, IAM roles, and service discovery',
    accent: '#FF9900',
  },
  {
    title: 'Create EKS Cluster',
    details: 'Provision cluster with eksctl, configure node groups and VPC',
    accent: '#326CE5',
  },
  {
    title: 'Convert to K8s Manifests',
    details: 'Transform task defs to Deployments, Services, and Ingress resources',
    accent: '#10B981',
  },
  {
    title: 'Deploy & Validate',
    details: 'Roll out workloads, set up monitoring with Prometheus & Grafana',
    accent: '#8B5CF6',
  },
  {
    title: 'Traffic Cutover',
    details: 'Shift traffic via Route53 weighted routing, then decommission ECS',
    accent: COLORS.primary,
  },
];

export const MigrationSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, delay: 5, config: { damping: 14 } });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
        gap: 40,
      }}
    >
      <h2
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: COLORS.white,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          margin: 0,
        }}
      >
        Migration <span style={{ color: COLORS.primary }}>Roadmap</span>
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          width: 600,
        }}
      >
        {steps.map((step, i) => (
          <Step key={step.title} number={i + 1} {...step} delay={20 + i * 25} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
