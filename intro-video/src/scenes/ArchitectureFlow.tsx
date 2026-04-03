import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { SmartphoneIcon, ServerIcon, BotIcon } from '../components/Icon';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '700'],
  subsets: ['latin'],
});

type NodeData = {
  icon: React.ReactNode;
  label: string;
};

const nodes: NodeData[] = [
  { icon: <SmartphoneIcon size={52} />, label: 'Mobile App' },
  { icon: <ServerIcon size={52} />, label: 'Your Server' },
  { icon: <BotIcon size={52} />, label: 'Claude Code' },
];

const AnimatedArrow: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const width = interpolate(progress, [0, 1], [0, 120]);
  const opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);

  // Arrow head appears at end
  const headOpacity = interpolate(progress, [0.7, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: 120,
        opacity,
      }}
    >
      {/* Line */}
      <div
        style={{
          height: 3,
          width,
          background: `linear-gradient(90deg, ${COLORS.primary}40, ${COLORS.primary})`,
          borderRadius: 2,
        }}
      />
      {/* Arrow head */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderLeft: `12px solid ${COLORS.primary}`,
          opacity: headOpacity,
          marginLeft: -2,
        }}
      />
    </div>
  );
};

const ArchNode: React.FC<{ node: NodeData; delay: number }> = ({ node, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 15, stiffness: 120 },
  });

  const scale = interpolate(entrance, [0, 1], [0.5, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Label fade in (after node appears)
  const labelProgress = spring({
    frame,
    fps,
    delay: delay + 10,
    config: { damping: 200 },
  });
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelY = interpolate(labelProgress, [0, 1], [10, 0]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* Node circle */}
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          backgroundColor: COLORS.surface,
          border: `2px solid ${COLORS.primary}50`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: `0 0 30px ${COLORS.primaryGlow}`,
        }}
      >
        {node.icon}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.textMuted,
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
        }}
      >
        {node.label}
      </div>
    </div>
  );
};

export const ArchitectureFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

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
          gap: 60,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.white,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          Your Phone Controls <span style={{ color: COLORS.primary }}>Everything</span>
        </div>

        {/* Flow diagram */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 30,
          }}
        >
          <ArchNode node={nodes[0]} delay={10} />
          <AnimatedArrow delay={25} />
          <ArchNode node={nodes[1]} delay={35} />
          <AnimatedArrow delay={45} />
          <ArchNode node={nodes[2]} delay={55} />
        </div>

        {/* Bottom caption */}
        <div
          style={{
            fontSize: 22,
            color: COLORS.textMuted,
            opacity: interpolate(
              spring({ frame, fps, delay: 65, config: { damping: 200 } }),
              [0, 1],
              [0, 1]
            ),
          }}
        >
          No workstation needed. Just your phone.
        </div>
      </div>
    </AbsoluteFill>
  );
};
