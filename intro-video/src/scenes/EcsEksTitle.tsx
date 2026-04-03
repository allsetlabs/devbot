import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';
import { GlowEffect } from '../components/GlowEffect';

loadFont();

const EcsIcon: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <rect x={8} y={8} width={64} height={64} rx={8} fill="#FF9900" />
      <rect x={18} y={22} width={18} height={14} rx={3} fill="#232F3E" />
      <rect x={44} y={22} width={18} height={14} rx={3} fill="#232F3E" />
      <rect x={18} y={44} width={18} height={14} rx={3} fill="#232F3E" />
      <rect x={44} y={44} width={18} height={14} rx={3} fill="#232F3E" />
    </svg>
    <span
      style={{
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 700,
        color: '#FF9900',
        letterSpacing: 2,
      }}
    >
      Amazon ECS
    </span>
  </div>
);

const EksIcon: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <circle cx={40} cy={40} r={32} fill="#326CE5" />
      <path
        d="M40 18L40 62M22 30L58 50M58 30L22 50"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={40} cy={18} r={5} fill="#fff" />
      <circle cx={40} cy={62} r={5} fill="#fff" />
      <circle cx={22} cy={30} r={5} fill="#fff" />
      <circle cx={58} cy={50} r={5} fill="#fff" />
      <circle cx={58} cy={30} r={5} fill="#fff" />
      <circle cx={22} cy={50} r={5} fill="#fff" />
      <circle cx={40} cy={40} r={10} fill="#326CE5" stroke="#fff" strokeWidth={2} />
    </svg>
    <span
      style={{
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 700,
        color: '#326CE5',
        letterSpacing: 2,
      }}
    >
      Amazon EKS
    </span>
  </div>
);

export const EcsEksTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, delay: 10, config: { damping: 14 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const ecsSpring = spring({ frame, fps, delay: 30, config: { damping: 12 } });
  const ecsScale = interpolate(ecsSpring, [0, 1], [0.5, 1]);
  const ecsOpacity = interpolate(ecsSpring, [0, 1], [0, 1]);

  const arrowSpring = spring({ frame, fps, delay: 50, config: { damping: 12 } });
  const arrowOpacity = interpolate(arrowSpring, [0, 1], [0, 1]);
  const arrowWidth = interpolate(arrowSpring, [0, 1], [0, 120]);

  const eksSpring = spring({ frame, fps, delay: 65, config: { damping: 12 } });
  const eksScale = interpolate(eksSpring, [0, 1], [0.5, 1]);
  const eksOpacity = interpolate(eksSpring, [0, 1], [0, 1]);

  const subtitleSpring = spring({ frame, fps, delay: 85, config: { damping: 14 } });
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
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
        <GlowEffect size={600} color="#FF9900" pulseSpeed={2} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 400,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <GlowEffect size={300} color="#326CE5" pulseSpeed={2.5} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 50,
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.white,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            margin: 0,
            letterSpacing: -1,
          }}
        >
          Container Migration
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <EcsIcon opacity={ecsOpacity} scale={ecsScale} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              opacity: arrowOpacity,
              overflow: 'hidden',
              width: arrowWidth,
            }}
          >
            <svg width={120} height={40} viewBox="0 0 120 40" fill="none">
              <line
                x1={0}
                y1={20}
                x2={100}
                y2={20}
                stroke={COLORS.primary}
                strokeWidth={3}
                strokeDasharray="8 4"
              />
              <polygon points="95,10 115,20 95,30" fill={COLORS.primary} />
            </svg>
          </div>

          <EksIcon opacity={eksOpacity} scale={eksScale} />
        </div>

        <p
          style={{
            fontSize: 28,
            color: COLORS.textMuted,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            margin: 0,
            fontWeight: 500,
          }}
        >
          From ECS to EKS — A Step-by-Step Guide
        </p>
      </div>
    </AbsoluteFill>
  );
};
