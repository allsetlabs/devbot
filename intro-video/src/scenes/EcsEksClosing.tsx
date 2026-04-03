import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { GlowEffect } from '../components/GlowEffect';

loadFont();

const checkpoints = [
  'Kubernetes-native workloads',
  'Multi-cloud portability',
  'CNCF ecosystem access',
  'Advanced autoscaling',
];

export const EcsEksClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleSpring = spring({ frame, fps, delay: 5, config: { damping: 14 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);

  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
        gap: 40,
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
        <GlowEffect size={500} color="#326CE5" pulseSpeed={2} />
      </div>

      <h2
        style={{
          fontSize: 52,
          fontWeight: 800,
          margin: 0,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          background: `linear-gradient(135deg, ${COLORS.white}, #326CE5)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Migration Complete
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {checkpoints.map((text, i) => {
          const checkSpring = spring({
            frame,
            fps,
            delay: 25 + i * 15,
            config: { damping: 12 },
          });
          const checkOpacity = interpolate(checkSpring, [0, 1], [0, 1]);
          const checkX = interpolate(checkSpring, [0, 1], [-30, 0]);

          return (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: checkOpacity,
                transform: `translateX(${checkX}px)`,
              }}
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={12} r={10} fill="#326CE520" stroke="#326CE5" strokeWidth={2} />
                <path
                  d="M8 12l3 3 5-5"
                  stroke="#326CE5"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontSize: 22,
                  color: COLORS.text,
                  fontWeight: 500,
                }}
              >
                {text}
              </span>
            </div>
          );
        })}
      </div>

      <p
        style={{
          fontSize: 18,
          color: COLORS.textMuted,
          margin: 0,
          marginTop: 10,
          opacity: interpolate(
            spring({ frame, fps, delay: 90, config: { damping: 14 } }),
            [0, 1],
            [0, 1]
          ),
        }}
      >
        ECS &rarr; EKS — Modernize your container orchestration
      </p>

      <AbsoluteFill style={{ backgroundColor: '#000000', opacity: fadeOut }} />
    </AbsoluteFill>
  );
};
