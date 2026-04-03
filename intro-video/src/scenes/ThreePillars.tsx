import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { MessageCircleIcon, TerminalIcon, ClockIcon } from '../components/Icon';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '700'],
  subsets: ['latin'],
});

type PillarData = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const pillars: PillarData[] = [
  {
    icon: <MessageCircleIcon size={56} />,
    title: 'Interactive Chat',
    description: 'Talk to Claude Code like ChatGPT',
  },
  {
    icon: <TerminalIcon size={56} />,
    title: 'CLI Sessions',
    description: 'Full terminal on your phone',
  },
  {
    icon: <ClockIcon size={56} />,
    title: 'Scheduler',
    description: 'Set it and forget it automation',
  },
];

const PillarCard: React.FC<{
  pillar: PillarData;
  delay: number;
}> = ({ pillar, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 15, stiffness: 120 },
  });

  const translateY = interpolate(entrance, [0, 1], [80, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Subtle glow animation on card border
  const glowIntensity = interpolate(frame, [delay + 20, delay + 40, delay + 60], [0, 0.8, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '48px 40px',
        width: 340,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        border: `1.5px solid ${COLORS.border}`,
        boxShadow: `0 0 ${30 * glowIntensity}px ${COLORS.primaryGlow}, 0 8px 32px rgba(0,0,0,0.4)`,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          backgroundColor: `${COLORS.primary}15`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {pillar.icon}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: COLORS.white,
          textAlign: 'center',
        }}
      >
        {pillar.title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: COLORS.textMuted,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        {pillar.description}
      </div>
    </div>
  );
};

export const ThreePillars: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section title
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 50,
        }}
      >
        {/* Section title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.white,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Three Ways to <span style={{ color: COLORS.primary }}>Control Your Work</span>
        </div>

        {/* Cards */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            justifyContent: 'center',
          }}
        >
          {pillars.map((pillar, i) => (
            <PillarCard key={pillar.title} pillar={pillar} delay={20 + i * 20} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
