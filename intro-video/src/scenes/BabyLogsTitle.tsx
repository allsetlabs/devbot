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
const BLUE = '#60a5fa';
const PINK_DIM = '#f472b680';

const BabyIcon: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <div style={{ opacity, transform: `scale(${scale})` }}>
    <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
      {/* Baby face */}
      <circle cx={50} cy={45} r={32} fill={PINK} opacity={0.9} />
      {/* Eyes */}
      <circle cx={40} cy={40} r={4} fill="#fff" />
      <circle cx={60} cy={40} r={4} fill="#fff" />
      <circle cx={41} cy={41} r={2} fill="#333" />
      <circle cx={61} cy={41} r={2} fill="#333" />
      {/* Smile */}
      <path d="M40 52C43 57 57 57 60 52" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      {/* Pacifier */}
      <circle cx={50} cy={62} r={6} stroke="#fff" strokeWidth={2} fill="none" />
      <circle cx={50} cy={62} r={3} fill="#fff" opacity={0.5} />
      {/* Heart */}
      <path
        d="M50 80C50 80 35 72 35 65C35 60 40 58 50 65C60 58 65 60 65 65C65 72 50 80 50 80Z"
        fill={PINK}
        opacity={0.6}
      />
    </svg>
  </div>
);

const FloatingHearts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hearts = Array.from({ length: 12 }, (_, i) => {
    const x = 100 + i * 160;
    const delay = 25 + i * 3;
    const floatSpring = spring({
      frame,
      fps,
      delay,
      config: { damping: 20, stiffness: 60 },
    });
    const y = interpolate(floatSpring, [0, 1], [40, 0]);
    const opacity = interpolate(floatSpring, [0, 1], [0, 0.3]);
    const float = Math.sin((frame / fps) * 1.5 + i * 0.8) * 8;
    const heartSize = 12 + Math.sin(i * 1.7) * 6;
    const color = i % 2 === 0 ? PINK : BLUE;

    return (
      <g key={i} transform={`translate(${x}, ${float + y})`}>
        <path
          d={`M0 ${heartSize * 0.3}C0 0 ${heartSize * 0.5} ${-heartSize * 0.2} 0 ${heartSize * 0.7}C${-heartSize * 0.5} ${-heartSize * 0.2} 0 0 0 ${heartSize * 0.3}Z`}
          fill={color}
          opacity={opacity}
        />
      </g>
    );
  });

  return (
    <svg
      width={1920}
      height={80}
      viewBox="0 0 1920 80"
      style={{ position: 'absolute', bottom: 40 }}
    >
      <g transform="translate(0, 40)">{hearts}</g>
    </svg>
  );
};

export const BabyLogsTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 12 },
  });
  const iconScale = interpolate(iconSpring, [0, 1], [0.3, 1]);
  const iconOpacity = interpolate(iconSpring, [0, 1], [0, 1]);

  const titleSpring = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 14 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const lineWidth = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });

  const subtitleSpring = spring({
    frame,
    fps,
    delay: 35,
    config: { damping: 14 },
  });
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [30, 0]);

  const badgeSpring = spring({
    frame,
    fps,
    delay: 55,
    config: { damping: 12 },
  });
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
        <GlowEffect size={600} color={PINK} pulseSpeed={2.5} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <BabyIcon opacity={iconOpacity} scale={iconScale} />

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
          Baby <span style={{ color: PINK }}>Logs</span>
        </div>

        <div
          style={{
            width: interpolate(lineWidth, [0, 1], [0, 400]),
            height: 3,
            background: `linear-gradient(90deg, transparent, ${PINK}, transparent)`,
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
          Built by a Parent. Tested by a Parent.
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
          {['Feeding', 'Diapers', 'Growth', 'Analytics'].map((label) => (
            <div
              key={label}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                border: `1px solid ${PINK_DIM}`,
                backgroundColor: `${PINK}15`,
                fontSize: 16,
                fontWeight: 600,
                color: PINK,
                letterSpacing: 0.5,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <FloatingHearts />
    </AbsoluteFill>
  );
};
