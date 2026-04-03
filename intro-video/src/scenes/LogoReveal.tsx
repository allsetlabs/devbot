import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { GlowEffect } from '../components/GlowEffect';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700', '900'],
  subsets: ['latin'],
});

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo scale entrance with spring
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  // Logo opacity
  const logoOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Subtitle entrance (delayed)
  const subtitleProgress = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });

  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  // Decorative line width animation
  const lineWidth = spring({
    frame,
    fps,
    delay: 15,
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
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <GlowEffect size={500} pulseSpeed={2} />
      </div>

      {/* Logo text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: COLORS.white,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Dev
          <span style={{ color: COLORS.primary }}>Bot</span>
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: interpolate(lineWidth, [0, 1], [0, 300]),
            height: 3,
            background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            color: COLORS.textMuted,
            letterSpacing: 2,
            transform: `translateY(${subtitleY}px)`,
            opacity: subtitleOpacity,
          }}
        >
          Midnight idea? Ship it from your bed.
        </div>
      </div>
    </AbsoluteFill>
  );
};
