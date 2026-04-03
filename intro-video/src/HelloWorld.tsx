import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const HelloWorld: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 120,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: '#ffffff',
          opacity,
        }}
      >
        Hello World
      </h1>
    </AbsoluteFill>
  );
};
