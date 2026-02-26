import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { getPhaseColor } from './chartTheme';

interface AgeRangeSliderProps {
  ages: number[];
  fireAge: number;
  pensionAge: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

/**
 * Dual-thumb range slider for brushing / zooming the chart x-axis by age.
 * Renders a miniature phase-band track behind the slider for visual context.
 */
export function AgeRangeSlider({
  ages,
  fireAge,
  pensionAge,
  value,
  onChange,
}: AgeRangeSliderProps) {
  const minAge = ages[0] ?? 0;
  const maxAge = ages[ages.length - 1] ?? 100;

  // Build a CSS linear-gradient that mirrors the phase band colors
  const trackGradient = useMemo(() => {
    if (ages.length < 2) return undefined;
    const total = maxAge - minAge;
    if (total <= 0) return undefined;

    const workingEnd = ((Math.min(fireAge, maxAge) - minAge) / total) * 100;
    const bridgingEnd = ((Math.min(pensionAge, maxAge) - minAge) / total) * 100;

    const workingColor = getPhaseColor('working');
    const bridgingColor = getPhaseColor('bridging');
    const drawdownColor = getPhaseColor('drawdown');

    return `linear-gradient(to right, ${workingColor} 0%, ${workingColor} ${workingEnd}%, ${bridgingColor} ${workingEnd}%, ${bridgingColor} ${bridgingEnd}%, ${drawdownColor} ${bridgingEnd}%, ${drawdownColor} 100%)`;
  }, [ages, minAge, maxAge, fireAge, pensionAge]);

  return (
    <div className="mt-3 px-2 sm:px-4">
      <div className="relative">
        {/* Phase band track background */}
        {trackGradient && (
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full opacity-70"
            style={{ background: trackGradient }}
          />
        )}
        <Slider
          min={minAge}
          max={maxAge}
          step={1}
          value={value}
          onValueChange={(v) => {
            if (v.length === 2) onChange([v[0], v[1]]);
          }}
          className="relative"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground">
          Age {value[0]}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Brush to adjust age range
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          Age {value[1]}
        </span>
      </div>
    </div>
  );
}
