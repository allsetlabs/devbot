import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

const GREEN = '#22c55e';

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  accentColor: string;
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay,
  accentColor,
}) => {
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
        width: 380,
        padding: 36,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        border: `1px solid ${COLORS.border}`,
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: `${accentColor}18`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 26,
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
          fontSize: 17,
          color: COLORS.textMuted,
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  );
};

const BrainIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <circle cx={14} cy={16} r={8} stroke={GREEN} strokeWidth={2.5} />
    <circle cx={26} cy={16} r={8} stroke={GREEN} strokeWidth={2.5} />
    <path
      d="M14 24C14 30 20 34 20 34C20 34 26 30 26 24"
      stroke={GREEN}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    <circle cx={20} cy={14} r={3} fill={GREEN} opacity={0.5} />
  </svg>
);

const DollarIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <circle cx={20} cy={20} r={16} stroke="#f59e0b" strokeWidth={2.5} />
    <path
      d="M20 8V32M14 16C14 13 17 12 20 12C23 12 26 13 26 16C26 19 20 19 20 20C20 21 20 21 20 22C20 22 14 23 14 26C14 29 17 30 20 30C23 30 26 29 26 26"
      stroke="#f59e0b"
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <rect x={6} y={10} width={28} height={24} rx={4} stroke="#3b82f6" strokeWidth={2.5} />
    <line x1={6} y1={18} x2={34} y2={18} stroke="#3b82f6" strokeWidth={2.5} />
    <line x1={14} y1={6} x2={14} y2={14} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
    <line x1={26} y1={6} x2={26} y2={14} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
    <rect x={12} y={22} width={5} height={4} rx={1} fill="#3b82f6" opacity={0.6} />
    <rect x={23} y={22} width={5} height={4} rx={1} fill="#3b82f6" opacity={0.6} />
    <rect x={12} y={28} width={5} height={4} rx={1} fill="#3b82f6" opacity={0.3} />
  </svg>
);

const features = [
  {
    icon: <BrainIcon />,
    title: 'AI-Researched Plans',
    description:
      'Claude browses real retail sites to find actual products, prices, and URLs for your lawn',
    accentColor: GREEN,
  },
  {
    icon: <DollarIcon />,
    title: 'Real Cost Breakdown',
    description:
      'See exact costs per application with links to buy from Home Depot, Lowes, or Walmart',
    accentColor: '#f59e0b',
  },
  {
    icon: <CalendarIcon />,
    title: 'Seasonal Schedule',
    description:
      '3-6 timed applications across the year, optimized for your climate zone and grass type',
    accentColor: '#3b82f6',
  },
];

export const LawnCareFeatures: React.FC = () => {
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
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.white,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          margin: 0,
        }}
      >
        Why You&apos;ll <span style={{ color: GREEN }}>Love</span> It
      </h2>

      <div style={{ display: 'flex', gap: 36 }}>
        {features.map((feature, i) => (
          <FeatureCard key={feature.title} {...feature} delay={25 + i * 18} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
