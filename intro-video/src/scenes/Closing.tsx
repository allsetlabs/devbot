import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { GlowEffect } from '../components/GlowEffect';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700', '900'],
  subsets: ['latin'],
});

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Logo entrance
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const logoScale = interpolate(logoProgress, [0, 1], [0.8, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);

  // Tagline
  const taglineProgress = spring({
    frame,
    fps,
    delay: 12,
    config: { damping: 200 },
  });

  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineProgress, [0, 1], [20, 0]);

  // Fade to black at the end
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
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
      {/* Glow behind */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <GlowEffect size={600} pulseSpeed={3} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        {/* DevBot with gradient */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
            background: `linear-gradient(135deg, ${COLORS.white}, ${COLORS.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          DevBot
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.textMuted,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          Your workstation in your pocket
        </div>
      </div>

      {/* Fade to black overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: '#000000',
          opacity: fadeOut,
        }}
      />
    </AbsoluteFill>
  );
};
