import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../lib/constants';

loadFont();

const GREEN = '#22c55e';

type ApplicationCardProps = {
  order: number;
  date: string;
  name: string;
  cost: string;
  product: string;
  store: string;
  delay: number;
};

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  order,
  date,
  name,
  cost,
  product,
  store,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, delay, config: { damping: 12 } });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [40, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: '18px 22px',
        border: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: `${GREEN}20`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: GREEN,
          }}
        >
          {order}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white }}>{name}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
            {date} · {product} · {store}
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: GREEN,
        }}
      >
        {cost}
      </div>
    </div>
  );
};

const applications = [
  {
    order: 1,
    date: 'Early March',
    name: 'Pre-Emergent + Fertilizer',
    cost: '$22.99',
    product: 'Scotts Turf Builder with Halts',
    store: 'Home Depot',
  },
  {
    order: 2,
    date: 'Late April',
    name: 'Weed & Feed',
    cost: '$28.49',
    product: 'Scotts Turf Builder Weed & Feed',
    store: 'Lowes',
  },
  {
    order: 3,
    date: 'June',
    name: 'Summer Fertilizer',
    cost: '$19.99',
    product: 'Milorganite Organic',
    store: 'Walmart',
  },
  {
    order: 4,
    date: 'September',
    name: 'Fall Fertilizer + Overseed',
    cost: '$34.99',
    product: 'Scotts Thick R Lawn',
    store: 'Home Depot',
  },
  {
    order: 5,
    date: 'November',
    name: 'Winterizer',
    cost: '$24.99',
    product: 'Scotts WinterGuard',
    store: 'Lowes',
  },
];

export const LawnCareAppPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, delay: 5, config: { damping: 14 } });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [40, 0]);

  const summarySpring = spring({ frame, fps, delay: 15, config: { damping: 14 } });
  const summaryOpacity = interpolate(summarySpring, [0, 1], [0, 1]);
  const summaryScale = interpolate(summarySpring, [0, 1], [0.9, 1]);

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
        Your <span style={{ color: GREEN }}>Plan</span> at a Glance
      </h2>

      {/* Summary bar */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          opacity: summaryOpacity,
          transform: `scale(${summaryScale})`,
          backgroundColor: COLORS.surface,
          padding: '16px 40px',
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {[
          { label: 'Grass', value: 'Bermuda' },
          { label: 'Lawn Size', value: '5,000 sqft' },
          { label: 'Climate Zone', value: '7b' },
          { label: 'Annual Cost', value: '$131.45' },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>
              {item.label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: item.label === 'Annual Cost' ? GREEN : COLORS.white,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Application cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 850,
        }}
      >
        {applications.map((app, i) => (
          <ApplicationCard key={app.order} {...app} delay={30 + i * 14} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
