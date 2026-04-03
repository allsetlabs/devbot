import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

const GREEN = '#22c55e';

type StepProps = {
  number: number;
  title: string;
  description: string;
  delay: number;
  isLast?: boolean;
};

const Step: React.FC<StepProps> = ({ number, title, description, delay, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, delay, config: { damping: 12 } });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateX = interpolate(entrance, [0, 1], [60, 0]);

  const connectorSpring = spring({ frame, fps, delay: delay + 15, config: { damping: 20 } });
  const connectorWidth = interpolate(connectorSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          width: 260,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: GREEN,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 28,
            fontWeight: 900,
            color: '#fff',
            boxShadow: `0 0 30px ${GREEN}40`,
          }}
        >
          {number}
        </div>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.white,
            margin: 0,
            textAlign: 'center',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 15,
            color: COLORS.textMuted,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 220,
          }}
        >
          {description}
        </p>
      </div>

      {!isLast && (
        <div
          style={{
            width: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -60,
          }}
        >
          <svg width={80} height={20} viewBox="0 0 80 20">
            <line
              x1={0}
              y1={10}
              x2={60 * connectorWidth}
              y2={10}
              stroke={GREEN}
              strokeWidth={2}
              strokeDasharray="6 4"
              opacity={0.5}
            />
            <polygon points="55,4 70,10 55,16" fill={GREEN} opacity={connectorWidth} />
          </svg>
        </div>
      )}
    </div>
  );
};

const steps = [
  {
    title: 'Enter Your Lawn',
    description: 'Address, grass type, and optional square footage',
  },
  {
    title: 'AI Researches',
    description: 'Claude browses real stores for products and prices',
  },
  {
    title: 'Get Your Plan',
    description: 'A full annual schedule with cost breakdowns',
  },
  {
    title: 'Follow Along',
    description: 'Expand each card for detailed application instructions',
  },
];

export const LawnCareHowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, delay: 5, config: { damping: 14 } });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
        gap: 60,
      }}
    >
      <h2
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.white,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          margin: 0,
        }}
      >
        How It <span style={{ color: GREEN }}>Works</span>
      </h2>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {steps.map((step, i) => (
          <Step
            key={step.title}
            number={i + 1}
            title={step.title}
            description={step.description}
            delay={20 + i * 22}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
