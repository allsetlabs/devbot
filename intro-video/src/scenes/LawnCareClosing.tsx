import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { GlowEffect } from '../components/GlowEffect';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700', '900'],
  subsets: ['latin'],
});

const GREEN = '#22c55e';

export const LawnCareClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 12 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.8, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  const taglineSpring = spring({ frame, fps, delay: 15, config: { damping: 200 } });
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
        <GlowEffect size={600} color={GREEN} pulseSpeed={3} />
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
        {/* Leaf + DevBot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width={60} height={60} viewBox="0 0 60 60" fill="none">
            <path
              d="M30 55C30 55 10 42 10 24C10 6 30 2 30 2C30 2 50 6 50 24C50 42 30 55 30 55Z"
              fill={GREEN}
              opacity={0.9}
            />
            <path
              d="M30 12V48M20 22C24 26 27 27 30 27M40 32C36 36 33 37 30 37"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
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
            Lawn <span style={{ color: GREEN }}>Care</span>
          </div>
        </div>

        <div
          style={{
            width: 400,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
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
          Your yard, your plan, your schedule
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.white,
            backgroundColor: GREEN,
            padding: '14px 40px',
            borderRadius: 30,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            boxShadow: `0 0 40px ${GREEN}50`,
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
