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
const GREEN_DIM = '#22c55e80';

const GrassBlades: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const blades = Array.from({ length: 24 }, (_, i) => {
    const x = 80 + i * 75;
    const height = 60 + Math.sin(i * 1.3) * 30;
    const sway = Math.sin((frame / fps) * 2 + i * 0.5) * 4;
    const delay = 20 + i * 2;
    const growSpring = spring({ frame, fps, delay, config: { damping: 20, stiffness: 80 } });
    const scaleY = interpolate(growSpring, [0, 1], [0, 1]);

    return (
      <g key={i} transform={`translate(${x + sway}, 0)`}>
        <rect
          x={-4}
          y={-height * scaleY}
          width={8}
          height={height * scaleY}
          rx={4}
          fill={GREEN}
          opacity={0.5 + Math.sin(i * 0.7) * 0.3}
        />
      </g>
    );
  });

  return (
    <svg
      width={1920}
      height={120}
      viewBox="0 0 1920 120"
      style={{ position: 'absolute', bottom: 0 }}
    >
      <g transform="translate(0, 120)">{blades}</g>
    </svg>
  );
};

const LeafIcon: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <div
    style={{
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
      <path
        d="M50 90C50 90 15 70 15 40C15 10 50 5 50 5C50 5 85 10 85 40C85 70 50 90 50 90Z"
        fill={GREEN}
        opacity={0.9}
      />
      <path
        d="M50 20V80M35 35C40 40 45 42 50 42M65 50C60 55 55 57 50 57"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export const LawnCareTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconSpring = spring({ frame, fps, delay: 5, config: { damping: 12 } });
  const iconScale = interpolate(iconSpring, [0, 1], [0.3, 1]);
  const iconOpacity = interpolate(iconSpring, [0, 1], [0, 1]);

  const titleSpring = spring({ frame, fps, delay: 15, config: { damping: 14 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const lineWidth = spring({ frame, fps, delay: 25, config: { damping: 200 } });

  const subtitleSpring = spring({ frame, fps, delay: 35, config: { damping: 14 } });
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [30, 0]);

  const badgeSpring = spring({ frame, fps, delay: 55, config: { damping: 12 } });
  const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.8, 1]);

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
        <GlowEffect size={600} color={GREEN} pulseSpeed={2.5} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <LeafIcon opacity={iconOpacity} scale={iconScale} />

        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: COLORS.white,
            letterSpacing: -3,
            lineHeight: 1,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Lawn <span style={{ color: GREEN }}>Care</span>
        </div>

        <div
          style={{
            width: interpolate(lineWidth, [0, 1], [0, 400]),
            height: 3,
            background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
            borderRadius: 2,
          }}
        />

        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.textMuted,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            letterSpacing: 1,
          }}
        >
          AI-Powered Annual Lawn Maintenance Plans
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
          }}
        >
          {['Personalized', 'Real Prices', 'Step-by-Step'].map((label) => (
            <div
              key={label}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                border: `1px solid ${GREEN_DIM}`,
                backgroundColor: `${GREEN}15`,
                fontSize: 16,
                fontWeight: 600,
                color: GREEN,
                letterSpacing: 0.5,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <GrassBlades />
    </AbsoluteFill>
  );
};
