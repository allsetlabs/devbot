import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

const PINK = '#f472b6';
const BLUE = '#60a5fa';
const ORANGE = '#e8913a';
const TEAL = '#2dd4bf';

type LogEntryProps = {
  icon: string;
  type: string;
  detail: string;
  time: string;
  person: string;
  personColor: string;
  delay: number;
};

const LogEntry: React.FC<LogEntryProps> = ({
  icon,
  type,
  detail,
  time,
  person,
  personColor,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 14, stiffness: 120 },
  });
  const translateX = interpolate(entrance, [0, 1], [-60, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `translateX(${translateX}px)`,
        padding: '14px 20px',
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        border: `1px solid ${COLORS.border}`,
        width: 440,
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.white }}>{type}</span>
          <span style={{ fontSize: 16, color: COLORS.textMuted }}>{detail}</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>{time}</span>
          <span style={{ fontSize: 13, color: personColor }}>{person}</span>
        </div>
      </div>
    </div>
  );
};

type FilterPillProps = {
  label: string;
  active: boolean;
  delay: number;
  color?: string;
};

const FilterPill: React.FC<FilterPillProps> = ({ label, active, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 12, stiffness: 150 },
  });
  const scale = interpolate(entrance, [0, 1], [0.7, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const pillColor = color ?? ORANGE;

  return (
    <div
      style={{
        padding: '8px 18px',
        borderRadius: 20,
        backgroundColor: active ? pillColor : 'transparent',
        border: `1px solid ${active ? pillColor : COLORS.border}`,
        fontSize: 14,
        fontWeight: 600,
        color: active ? COLORS.white : COLORS.textMuted,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {label}
    </div>
  );
};

type PersonBadgeProps = {
  label: string;
  color: string;
  delay: number;
};

const PersonBadge: React.FC<PersonBadgeProps> = ({ label, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 12, stiffness: 150 },
  });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity,
        padding: '6px 14px',
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        fontSize: 13,
        fontWeight: 600,
        color: COLORS.textMuted,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      {label}
    </div>
  );
};

const DaySummary: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 14 },
  });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity,
        fontSize: 14,
        fontWeight: 600,
        color: ORANGE,
        letterSpacing: 1,
      }}
    >
      <span>510ML/7B</span>
      <span>45M/1BF</span>
      <span>6W</span>
      <span>5P</span>
      <span>~70ML/F</span>
    </div>
  );
};

export const BabyLogsTracking: React.FC = () => {
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

  const rightSpring = spring({
    frame,
    fps,
    delay: 60,
    config: { damping: 14 },
  });
  const rightOpacity = interpolate(rightSpring, [0, 1], [0, 1]);
  const rightX = interpolate(rightSpring, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
        gap: 32,
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
        Effortless <span style={{ color: TEAL }}>Tracking</span>
      </h2>

      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
        {/* Left: Filter pills + log entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            {['All', 'Feeding', 'Wet', 'Poop', 'Weight', 'Height'].map((label, i) => (
              <FilterPill key={label} label={label} active={label === 'All'} delay={12 + i * 4} />
            ))}
          </div>

          {/* Person badges */}
          <div style={{ display: 'flex', gap: 8 }}>
            <PersonBadge label="Daddy" color={BLUE} delay={38} />
            <PersonBadge label="Mommy" color={PINK} delay={42} />
            <PersonBadge label="Ayya" color={TEAL} delay={46} />
          </div>

          {/* Log entries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LogEntry
              icon="🍼"
              type="Bottle"
              detail="80ml"
              time="07:00 PM + 30m"
              person="Daddy"
              personColor={BLUE}
              delay={50}
            />
            <LogEntry
              icon="🍼"
              type="Bottle"
              detail="80ml"
              time="04:00 PM + 45m"
              person="Mommy"
              personColor={PINK}
              delay={58}
            />
            <LogEntry
              icon="💧"
              type="Wet"
              detail="75%"
              time="01:00 PM"
              person="Mommy"
              personColor={PINK}
              delay={66}
            />
            <LogEntry
              icon="💩"
              type="Poop"
              detail="small"
              time="01:00 PM"
              person="Mommy"
              personColor={PINK}
              delay={74}
            />
            <LogEntry
              icon="🍼"
              type="Bottle"
              detail="80ml"
              time="01:00 PM + 30m"
              person="Mommy"
              personColor={PINK}
              delay={82}
            />
          </div>
        </div>

        {/* Right: Daily summary + features */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          {/* Day summary */}
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: '24px 28px',
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 600 }}>
              TODAY&apos;S SUMMARY
            </div>
            <DaySummary delay={70} />
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 13,
                color: COLORS.textMuted,
              }}
            >
              <span>Time since last log: 3h 51m</span>
            </div>
          </div>

          {/* Weight card */}
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: '24px 28px',
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 600 }}>
              GROWTH TRACKING
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.white }}>
                  2.38<span style={{ fontSize: 16, color: COLORS.textMuted }}>kg</span>
                </div>
                <div style={{ fontSize: 12, color: TEAL }}>Weight</div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.white }}>
                  48.5<span style={{ fontSize: 16, color: COLORS.textMuted }}>cm</span>
                </div>
                <div style={{ fontSize: 12, color: TEAL }}>Height</div>
              </div>
            </div>
          </div>

          {/* Profile card */}
          <div
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: '24px 28px',
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 600 }}>
              BABY PROFILE
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>
              Name, DOB, Gender, Blood Type, Gestational Age, Parents
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
