import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

type BoxProps = {
  label: string;
  color: string;
  width?: number;
  height?: number;
};

const Box: React.FC<BoxProps> = ({ label, color, width = 140, height = 44 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 8,
      backgroundColor: `${color}20`,
      border: `1.5px solid ${color}`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 13,
      fontWeight: 600,
      color,
    }}
  >
    {label}
  </div>
);

const EcsArchitecture: React.FC<{ opacity: number; translateY: number }> = ({
  opacity,
  translateY,
}) => (
  <div
    style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      padding: 30,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      border: `1px solid ${COLORS.border}`,
      width: 380,
    }}
  >
    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#FF9900', margin: 0 }}>ECS Architecture</h3>
    <Box label="ALB / Target Group" color="#FF9900" width={280} />
    <div style={{ display: 'flex', gap: 10 }}>
      <Box label="ECS Service" color="#FF9900" />
      <Box label="ECS Service" color="#FF9900" />
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <Box label="Task Def" color="#FF990080" width={90} height={36} />
      <Box label="Task Def" color="#FF990080" width={90} height={36} />
      <Box label="Task Def" color="#FF990080" width={90} height={36} />
    </div>
    <Box label="ECR Registry" color="#FF990060" width={200} height={36} />
    <div style={{ display: 'flex', gap: 10 }}>
      <Box label="CloudWatch" color="#FF990050" width={130} height={36} />
      <Box label="IAM Roles" color="#FF990050" width={130} height={36} />
    </div>
  </div>
);

const EksArchitecture: React.FC<{ opacity: number; translateY: number }> = ({
  opacity,
  translateY,
}) => (
  <div
    style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      padding: 30,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      border: `1px solid ${COLORS.border}`,
      width: 380,
    }}
  >
    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#326CE5', margin: 0 }}>EKS Architecture</h3>
    <Box label="Ingress Controller" color="#326CE5" width={280} />
    <div style={{ display: 'flex', gap: 10 }}>
      <Box label="Deployment" color="#326CE5" />
      <Box label="Deployment" color="#326CE5" />
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <Box label="Pod" color="#326CE580" width={90} height={36} />
      <Box label="Pod" color="#326CE580" width={90} height={36} />
      <Box label="Pod" color="#326CE580" width={90} height={36} />
    </div>
    <Box label="ECR / Helm Charts" color="#326CE560" width={200} height={36} />
    <div style={{ display: 'flex', gap: 10 }}>
      <Box label="Prometheus" color="#326CE550" width={130} height={36} />
      <Box label="IRSA" color="#326CE550" width={130} height={36} />
    </div>
  </div>
);

export const ArchitectureComparison: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, delay: 5, config: { damping: 14 } });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [40, 0]);

  const ecsSpring = spring({ frame, fps, delay: 20, config: { damping: 12 } });
  const ecsOpacity = interpolate(ecsSpring, [0, 1], [0, 1]);
  const ecsY = interpolate(ecsSpring, [0, 1], [60, 0]);

  const arrowSpring = spring({ frame, fps, delay: 50, config: { damping: 12 } });
  const arrowOpacity = interpolate(arrowSpring, [0, 1], [0, 1]);
  const arrowScale = interpolate(arrowSpring, [0, 1], [0, 1]);

  const eksSpring = spring({ frame, fps, delay: 65, config: { damping: 12 } });
  const eksOpacity = interpolate(eksSpring, [0, 1], [0, 1]);
  const eksY = interpolate(eksSpring, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
        gap: 30,
      }}
    >
      <h2
        style={{
          fontSize: 44,
          fontWeight: 800,
          color: COLORS.white,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          margin: 0,
        }}
      >
        Architecture <span style={{ color: '#10B981' }}>Comparison</span>
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <EcsArchitecture opacity={ecsOpacity} translateY={ecsY} />

        <div
          style={{
            opacity: arrowOpacity,
            transform: `scale(${arrowScale})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width={60} height={40} viewBox="0 0 60 40" fill="none">
            <line x1={0} y1={20} x2={42} y2={20} stroke={COLORS.primary} strokeWidth={3} />
            <polygon points="38,10 58,20 38,30" fill={COLORS.primary} />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.primary,
              letterSpacing: 1,
            }}
          >
            MIGRATE
          </span>
        </div>

        <EksArchitecture opacity={eksOpacity} translateY={eksY} />
      </div>
    </AbsoluteFill>
  );
};
