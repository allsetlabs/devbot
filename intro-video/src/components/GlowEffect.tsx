import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../lib/constants';

type GlowEffectProps = {
  size?: number;
  color?: string;
  pulseSpeed?: number;
};

export const GlowEffect: React.FC<GlowEffectProps> = ({
  size = 400,
  color = COLORS.primary,
  pulseSpeed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = interpolate(
    frame % (fps * pulseSpeed),
    [0, (fps * pulseSpeed) / 2, fps * pulseSpeed],
    [0.3, 0.6, 0.3],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}${Math.round(pulse * 255)
          .toString(16)
          .padStart(2, '0')} 0%, transparent 70%)`,
        filter: `blur(${size * 0.15}px)`,
        position: 'absolute',
      }}
    />
  );
};
