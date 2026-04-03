import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

type ReasonCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  color: string;
};

const ReasonCard: React.FC<ReasonCardProps> = ({ icon, title, description, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, delay, config: { damping: 12, stiffness: 120 } });
  const translateY = interpolate(entrance, [0, 1], [80, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `translateY(${translateY}px)`,
        width: 320,
        padding: 30,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: `${color}20`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: COLORS.white,
          margin: 0,
          textAlign: 'center',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 16,
          color: COLORS.textMuted,
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
};

const PortabilityIcon = () => (
  <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
    <circle cx={18} cy={18} r={14} stroke="#326CE5" strokeWidth={2.5} />
    <path
      d="M8 18h20M18 4c-4 4-4 12 0 14s4 10 0 14M18 4c4 4 4 12 0 14s-4 10 0 14"
      stroke="#326CE5"
      strokeWidth={2}
    />
  </svg>
);

const EcosystemIcon = () => (
  <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
    <rect x={4} y={4} width={12} height={12} rx={3} stroke="#FF9900" strokeWidth={2.5} />
    <rect x={20} y={4} width={12} height={12} rx={3} stroke="#FF9900" strokeWidth={2.5} />
    <rect x={12} y={20} width={12} height={12} rx={3} stroke="#FF9900" strokeWidth={2.5} />
    <line x1={16} y1={16} x2={18} y2={20} stroke="#FF9900" strokeWidth={2} />
    <line x1={20} y1={16} x2={18} y2={20} stroke="#FF9900" strokeWidth={2} />
  </svg>
);

const ScaleIcon = () => (
  <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
    <path
      d="M6 28L14 16L20 22L30 8"
      stroke="#10B981"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="24,8 30,8 30,14"
      stroke="#10B981"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const reasons = [
  {
    icon: <PortabilityIcon />,
    title: 'Portability',
    description: 'Avoid vendor lock-in with Kubernetes standard APIs and multi-cloud flexibility',
    color: '#326CE5',
  },
  {
    icon: <EcosystemIcon />,
    title: 'Rich Ecosystem',
    description: 'Access Helm, Istio, ArgoCD, Prometheus and thousands of CNCF projects',
    color: '#FF9900',
  },
  {
    icon: <ScaleIcon />,
    title: 'Advanced Scaling',
    description: 'HPA, VPA, KEDA, and cluster autoscaler for fine-grained control',
    color: '#10B981',
  },
];

export const WhyMigrate: React.FC = () => {
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
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
        gap: 50,
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
        Why Migrate to <span style={{ color: '#326CE5' }}>EKS</span>?
      </h2>

      <div style={{ display: 'flex', gap: 30 }}>
        {reasons.map((reason, i) => (
          <ReasonCard key={reason.title} {...reason} delay={25 + i * 20} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
