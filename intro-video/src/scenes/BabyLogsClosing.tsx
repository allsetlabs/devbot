import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { GlowEffect } from '../components/GlowEffect';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700', '900'],
  subsets: ['latin'],
});

const PINK = '#f472b6';

export const BabyLogsClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 12 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.8, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  const taglineSpring = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineSpring, [0, 1], [20, 0]);

  const ctaSpring = spring({ frame, fps, delay: 35, config: { damping: 12 } });
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.9, 1]);

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
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <GlowEffect size={600} color={PINK} pulseSpeed={3} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        {/* Baby icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width={60} height={60} viewBox="0 0 60 60" fill="none">
            <circle cx={30} cy={27} r={20} fill={PINK} opacity={0.9} />
            <circle cx={24} cy={24} r={2.5} fill="#fff" />
            <circle cx={36} cy={24} r={2.5} fill="#fff" />
            <circle cx={24.5} cy={24.5} r={1.2} fill="#333" />
            <circle cx={36.5} cy={24.5} r={1.2} fill="#333" />
            <path
              d="M25 31C27 34 33 34 35 31"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <path
              d="M30 48C30 48 20 42 20 37C20 34 24 33 30 37C36 33 40 34 40 37C40 42 30 48 30 48Z"
              fill={PINK}
              opacity={0.5}
            />
          </svg>
          <div
            style={{
              fontSize: 90,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1,
              color: COLORS.white,
            }}
          >
            Baby <span style={{ color: PINK }}>Logs</span>
          </div>
        </div>

        <div
          style={{
            width: 400,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${PINK}, transparent)`,
            borderRadius: 2,
          }}
        />

        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: COLORS.textMuted,
            letterSpacing: 3,
            textTransform: 'uppercase',
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          Built by a parent, for parents
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.white,
            backgroundColor: PINK,
            padding: '14px 40px',
            borderRadius: 30,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            boxShadow: `0 0 40px ${PINK}50`,
          }}
        >
          Available in DevBot
        </div>
      </div>

      <AbsoluteFill
        style={{
          backgroundColor: '#000000',
          opacity: fadeOut,
        }}
      />
    </AbsoluteFill>
  );
};
