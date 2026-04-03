import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

const PINK = '#f472b6';
const BLUE = '#60a5fa';
const ORANGE = '#e8913a';
const TEAL = '#2dd4bf';

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

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 12, stiffness: 120 },
  });
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

const BottleIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <rect x={14} y={8} width={12} height={4} rx={2} fill={PINK} opacity={0.6} />
    <rect x={12} y={12} width={16} height={22} rx={4} stroke={PINK} strokeWidth={2.5} />
    <line x1={12} y1={20} x2={28} y2={20} stroke={PINK} strokeWidth={1.5} strokeDasharray="3 2" />
    <rect x={14} y={20} width={12} height={12} rx={2} fill={PINK} opacity={0.3} />
  </svg>
);

const DiaperIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <ellipse cx={20} cy={22} rx={14} ry={12} stroke={BLUE} strokeWidth={2.5} />
    <path d="M10 18C14 14 26 14 30 18" stroke={BLUE} strokeWidth={2} strokeLinecap="round" />
    <circle cx={16} cy={24} r={2} fill={BLUE} opacity={0.5} />
    <circle cx={24} cy={24} r={2} fill={BLUE} opacity={0.5} />
    <circle cx={20} cy={27} r={1.5} fill={BLUE} opacity={0.3} />
  </svg>
);

const ChartIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <rect x={6} y={24} width={6} height={10} rx={2} fill={ORANGE} opacity={0.7} />
    <rect x={14} y={18} width={6} height={16} rx={2} fill={ORANGE} opacity={0.85} />
    <rect x={22} y={12} width={6} height={22} rx={2} fill={ORANGE} />
    <rect x={30} y={8} width={6} height={26} rx={2} fill={ORANGE} opacity={0.7} />
    <path
      d="M8 22L16 16L24 10L32 6"
      stroke={ORANGE}
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray="4 3"
    />
  </svg>
);

const TimerIcon = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <circle cx={20} cy={22} r={14} stroke={TEAL} strokeWidth={2.5} />
    <line x1={20} y1={22} x2={20} y2={14} stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" />
    <line x1={20} y1={22} x2={26} y2={22} stroke={TEAL} strokeWidth={2} strokeLinecap="round" />
    <line x1={16} y1={4} x2={24} y2={4} stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" />
    <line x1={20} y1={4} x2={20} y2={8} stroke={TEAL} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const features = [
  {
    icon: <BottleIcon />,
    title: 'Bottle & Breast',
    description:
      'Track ml per feed, breast duration, and see who fed the baby with multi-caregiver support',
    accentColor: PINK,
  },
  {
    icon: <DiaperIcon />,
    title: 'Diaper Tracking',
    description: 'Log wet diapers with saturation % and poop with size. Daily counts at a glance',
    accentColor: BLUE,
  },
  {
    icon: <ChartIcon />,
    title: '14-Day Analytics',
    description:
      'See trends in feedings, ml per day, avg bottle size, diaper counts, and growth charts',
    accentColor: ORANGE,
  },
  {
    icon: <TimerIcon />,
    title: 'Smart Timers',
    description:
      'Built-in feeding timer with gap tracking between feeds. Never miss a feeding window',
    accentColor: TEAL,
  },
];

export const BabyLogsFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 14 },
  });
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
        Everything You <span style={{ color: PINK }}>Need</span>
      </h2>

      <div style={{ display: 'flex', gap: 28 }}>
        {features.map((feature, i) => (
          <FeatureCard key={feature.title} {...feature} delay={25 + i * 15} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
