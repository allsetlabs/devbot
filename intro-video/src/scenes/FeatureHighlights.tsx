import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { ChevronRightIcon } from '../components/Icon';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '700'],
  subsets: ['latin'],
});

const features = [
  'Run Claude Code from anywhere',
  'Stream responses in real-time',
  'Upload files straight from your phone',
  'Schedule tasks to run while you sleep',
];

const FeatureLine: React.FC<{ text: string; delay: number; index: number }> = ({
  text,
  delay,
  index: _index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 20, stiffness: 180 },
  });

  const translateX = interpolate(entrance, [0, 1], [-60, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Chevron bounce
  const chevronScale = spring({
    frame,
    fps,
    delay: delay + 8,
    config: { damping: 8, stiffness: 200 },
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      {/* Orange bullet / chevron */}
      <div
        style={{
          transform: `scale(${chevronScale})`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ChevronRightIcon size={28} />
      </div>

      {/* Feature text */}
      <div
        style={{
          fontSize: 38,
          fontWeight: 600,
          color: COLORS.text,
          letterSpacing: 0.5,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const FeatureHighlights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
      {/* Decorative side accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: `linear-gradient(180deg, transparent, ${COLORS.primary}, transparent)`,
          opacity: interpolate(titleProgress, [0, 1], [0, 0.6]),
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 50,
          paddingLeft: 80,
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
          Built for <span style={{ color: COLORS.primary }}>Developers on the Go</span>
        </div>

        {/* Feature list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {features.map((feature, i) => (
            <FeatureLine key={feature} text={feature} delay={20 + i * 20} index={i} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
