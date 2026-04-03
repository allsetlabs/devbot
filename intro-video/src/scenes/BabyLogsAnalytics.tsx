import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

const PINK = '#f472b6';
const ORANGE = '#e8913a';
const BLUE = '#60a5fa';
const TEAL = '#2dd4bf';

type StatCardProps = {
  label: string;
  value: string;
  sublabel: string;
  delay: number;
  accentColor: string;
};

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, delay, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 14, stiffness: 120 },
  });
  const scale = interpolate(entrance, [0, 1], [0.8, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity,
        transform: `scale(${scale})`,
        padding: '24px 32px',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${accentColor}`,
        minWidth: 200,
      }}
    >
      <div style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 42, fontWeight: 900, color: COLORS.white }}>{value}</div>
      <div style={{ fontSize: 13, color: COLORS.textMuted }}>{sublabel}</div>
    </div>
  );
};

type BarProps = {
  height: number;
  maxHeight: number;
  delay: number;
  color: string;
  label: string;
};

const AnimatedBar: React.FC<BarProps> = ({ height, maxHeight, delay, color, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const growSpring = spring({
    frame,
    fps,
    delay,
    config: { damping: 18, stiffness: 80 },
  });
  const barHeight = interpolate(growSpring, [0, 1], [0, (height / maxHeight) * 180]);
  const opacity = interpolate(growSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity,
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>{height}</div>
      <div
        style={{
          width: 44,
          height: barHeight,
          backgroundColor: color,
          borderRadius: 6,
          transition: 'height 0.3s',
        }}
      />
      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</div>
    </div>
  );
};

const feedingsData = [
  { day: '19', value: 8 },
  { day: '20', value: 9 },
  { day: '21', value: 8 },
  { day: '22', value: 8 },
  { day: '23', value: 8 },
  { day: '24', value: 9 },
  { day: '25', value: 9 },
  { day: '26', value: 9 },
  { day: '27', value: 8 },
  { day: '28', value: 9 },
  { day: '1', value: 10 },
  { day: '2', value: 9 },
  { day: '3', value: 8 },
  { day: '4', value: 8 },
];

const mlData = [
  { day: '19', value: 263 },
  { day: '20', value: 365 },
  { day: '21', value: 385 },
  { day: '22', value: 415 },
  { day: '23', value: 408 },
  { day: '24', value: 375 },
  { day: '25', value: 450 },
  { day: '26', value: 478 },
  { day: '27', value: 480 },
  { day: '28', value: 565 },
  { day: '1', value: 650 },
  { day: '2', value: 530 },
  { day: '3', value: 505 },
  { day: '4', value: 510 },
];

export const BabyLogsAnalytics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 14 },
  });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [40, 0]);

  const chartSpring = spring({
    frame,
    fps,
    delay: 50,
    config: { damping: 14 },
  });
  const chartOpacity = interpolate(chartSpring, [0, 1], [0, 1]);

  const mlChartSpring = spring({
    frame,
    fps,
    delay: 90,
    config: { damping: 14 },
  });
  const mlChartOpacity = interpolate(mlChartSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
        gap: 36,
        padding: '40px 80px',
      }}
    >
      <h2
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: COLORS.white,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          margin: 0,
        }}
      >
        Powerful <span style={{ color: ORANGE }}>Analytics</span>
      </h2>

      {/* Stat cards row */}
      <div style={{ display: 'flex', gap: 20 }}>
        <StatCard
          label="Avg feedings/day"
          value="7.9"
          sublabel="133b 10bf"
          delay={15}
          accentColor={PINK}
        />
        <StatCard
          label="Avg ml/bottle"
          value="53ml"
          sublabel="140 bottle feeds"
          delay={22}
          accentColor={ORANGE}
        />
        <StatCard
          label="Avg breast time"
          value="32m"
          sublabel="11 breast feeds"
          delay={29}
          accentColor={TEAL}
        />
        <StatCard
          label="Avg feeding gap"
          value="2h 45m"
          sublabel="19d tracked"
          delay={36}
          accentColor={BLUE}
        />
      </div>

      {/* Feedings per day chart */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          opacity: chartOpacity,
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: '20px 28px',
          border: `1px solid ${COLORS.border}`,
          width: '100%',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.white }}>
          Feedings per day{' '}
          <span style={{ color: COLORS.textMuted, fontWeight: 400, fontSize: 13 }}>
            Last 14 days
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {feedingsData.map((d, i) => (
            <AnimatedBar
              key={d.day}
              height={d.value}
              maxHeight={10}
              delay={55 + i * 3}
              color={ORANGE}
              label={d.day}
            />
          ))}
        </div>
      </div>

      {/* Total ml per day chart */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          opacity: mlChartOpacity,
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: '20px 28px',
          border: `1px solid ${COLORS.border}`,
          width: '100%',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.white }}>
          Total ml per day{' '}
          <span style={{ color: COLORS.textMuted, fontWeight: 400, fontSize: 13 }}>
            Last 14 days
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {mlData.map((d, i) => (
            <AnimatedBar
              key={d.day}
              height={d.value}
              maxHeight={650}
              delay={95 + i * 3}
              color={PINK}
              label={d.day}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
