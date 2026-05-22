import React, { useMemo } from 'react';
import { useBatchTimer } from '../../context/BatchTimerContext';

interface BatchClockProps {
  size?: number;      // diameter in px (default 80)
  className?: string;
}

/**
 * CalebDeck Branded Batch Clock
 *
 * A premium animated clock where:
 * - The plate is the clock face (glassmorphism)
 * - A fork acts as the minute hand
 * - A spoon acts as the hour/countdown hand
 *
 * Driven entirely by `useBatchTimer()` — no local intervals.
 * Uses CSS `transform: rotate()` for GPU-accelerated animation.
 */
export function BatchClock({ size = 80, className = '' }: BatchClockProps) {
  const { countdownMs, isBatchOpen } = useBatchTimer();

  // Derive hand rotations from countdown
  const { forkAngle, spoonAngle } = useMemo(() => {
    // By using the raw total seconds without a modulo (% 60), 
    // the CSS transform value grows/shrinks continuously (e.g. 360 -> 354 -> 348).
    // This prevents the visual "snapping" or "restarting" effect when crossing 0.
    const totalSeconds = countdownMs / 1000;

    // Fork (minute hand): full rotation per 60 minutes
    const forkDeg = (totalSeconds / 60) * 6; 
    
    // Spoon (second hand): full rotation per 60 seconds
    const spoonDeg = totalSeconds * 6;

    return { forkAngle: forkDeg, spoonAngle: spoonDeg };
  }, [countdownMs]);

  const center = size / 2;
  const plateRadius = size * 0.44;
  const innerRadius = size * 0.38;
  const forkLength = size * 0.30;
  const spoonLength = size * 0.22;
  const tickLength = size * 0.04;
  const tickOffset = size * 0.36;

  // Generate 12 tick marks
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30) * (Math.PI / 180);
    const x1 = center + Math.sin(angle) * tickOffset;
    const y1 = center - Math.cos(angle) * tickOffset;
    const x2 = center + Math.sin(angle) * (tickOffset + tickLength);
    const y2 = center - Math.cos(angle) * (tickOffset + tickLength);
    return { x1, y1, x2, y2, major: i % 3 === 0 };
  });

  const glowColor = 'rgba(124, 58, 237, 0.25)';
  const primaryColor = '#7C3AED'; // Purple
  const secondaryColor = '#FCD34D'; // Honey Yellow
  const pulseClass = isBatchOpen ? 'animate-pulse' : '';

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="drop-shadow-lg"
      >
        {/* Outer glow ring */}
        <circle
          cx={center}
          cy={center}
          r={plateRadius + 2}
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Plate — glass clock face */}
        <circle
          cx={center}
          cy={center}
          r={plateRadius}
          className="fill-card/80 stroke-border"
          strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 2px 8px ${glowColor})` }}
        />

        {/* Inner rim (plate edge detail) */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          className="stroke-border/50"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            className="stroke-muted-foreground/40"
            strokeWidth={tick.major ? 1.5 : 0.75}
            strokeLinecap="round"
          />
        ))}

        {/* Fork (minute hand) — the tines */}
        <g
          style={{
            transform: `rotate(${forkAngle}deg)`,
            transformOrigin: `${center}px ${center}px`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Fork handle */}
          <line
            x1={center}
            y1={center + 3}
            x2={center}
            y2={center - forkLength}
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Fork tines */}
          <line
            x1={center - 2.5}
            y1={center - forkLength + 3}
            x2={center - 2.5}
            y2={center - forkLength - 2}
            stroke={primaryColor}
            strokeWidth="1"
            strokeLinecap="round"
          />
          <line
            x1={center}
            y1={center - forkLength + 1}
            x2={center}
            y2={center - forkLength - 3}
            stroke={primaryColor}
            strokeWidth="1"
            strokeLinecap="round"
          />
          <line
            x1={center + 2.5}
            y1={center - forkLength + 3}
            x2={center + 2.5}
            y2={center - forkLength - 2}
            stroke={primaryColor}
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* Spoon (hour/second hand) — rounded bowl */}
        <g
          style={{
            transform: `rotate(${spoonAngle}deg)`,
            transformOrigin: `${center}px ${center}px`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Spoon handle */}
          <line
            x1={center}
            y1={center + 3}
            x2={center}
            y2={center - spoonLength + 3}
            stroke={secondaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Spoon bowl */}
          <ellipse
            cx={center}
            cy={center - spoonLength - 1}
            rx="2.5"
            ry="4"
            fill={secondaryColor}
            stroke="none"
          />
        </g>

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={size * 0.04}
          fill={secondaryColor}
        />
      </svg>

      {/* Subtle pulsing glow behind plate when batch is open */}
      {isBatchOpen && (
        <div
          className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}
