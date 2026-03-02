import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import type { AccountInput } from '@/types';
import { getAgeBracketPercentage, getEmployerAgeBracketPercentage } from '@/utils/calculations';

export interface ChartEventMarker {
  age: number;
  label: string;
  color: string;
}

/**
 * Build chart annotation markers for key financial events.
 * Returns annotation plugin config to render dashed vertical lines at event ages.
 */
export function buildEventAnnotations(
  ages: number[],
  opts: {
    fireAge: number;
    pensionAge: number;
    houseWithdrawalAge?: number;
    enableHouseWithdrawal?: boolean;
    pensionLumpSumAge?: number;
    enablePensionLumpSum?: boolean;
    statePensionAge?: number;
    includeStatePension?: boolean;
    currentAge: number;
    targetAge: number;
    etfAllocationPercent?: number;
    accounts?: AccountInput[];
  },
): Record<string, AnnotationOptions> {
  const annotations: Record<string, AnnotationOptions> = {};

  const markers: ChartEventMarker[] = [];

  // House purchase
  if (opts.enableHouseWithdrawal && opts.houseWithdrawalAge && opts.houseWithdrawalAge >= opts.currentAge && opts.houseWithdrawalAge <= opts.targetAge) {
    markers.push({ age: opts.houseWithdrawalAge, label: 'House', color: 'hsl(30, 80%, 55%)' });
  }

  // FIRE
  if (opts.fireAge >= opts.currentAge && opts.fireAge <= opts.targetAge) {
    markers.push({ age: opts.fireAge, label: 'FIRE', color: 'hsl(280, 60%, 55%)' });
  }

  // Pension lump sum (only if different from FIRE age)
  if (opts.enablePensionLumpSum && opts.pensionLumpSumAge && opts.pensionLumpSumAge >= opts.currentAge && opts.pensionLumpSumAge <= opts.targetAge && opts.pensionLumpSumAge !== opts.fireAge) {
    markers.push({ age: opts.pensionLumpSumAge, label: 'Lump Sum', color: 'hsl(210, 60%, 55%)' });
  }

  // Pension drawdown
  if (opts.pensionAge >= opts.currentAge && opts.pensionAge <= opts.targetAge) {
    markers.push({ age: opts.pensionAge, label: 'Drawdown', color: 'hsl(200, 65%, 50%)' });
  }

  // State pension
  if (opts.includeStatePension && opts.statePensionAge && opts.statePensionAge >= opts.currentAge && opts.statePensionAge <= opts.targetAge) {
    markers.push({ age: opts.statePensionAge, label: 'State Pension', color: 'hsl(160, 55%, 45%)' });
  }

  // ── Pension employee contribution bracket changes ─────────────
  const pension = opts.accounts?.find(a => a.name === 'Pension');
  if (pension?.ageBracketContributions) {
    const bracketAges = [30, 40, 50, 55, 60];
    for (const age of bracketAges) {
      if (age > opts.currentAge && age <= opts.targetAge && age < opts.fireAge) {
        const prevPct = getAgeBracketPercentage(age - 1, pension.ageBracketContributions);
        const newPct  = getAgeBracketPercentage(age,     pension.ageBracketContributions);
        if (newPct !== prevPct) {
          markers.push({ age, label: `Pension ${newPct}%`, color: 'hsl(152, 55%, 38%)' });
        }
      }
    }
  }

  // ── Employer pension contribution bracket changes ─────────────
  if (pension?.employerAgeBracketContributions) {
    const bracketAges = [25, 30, 35, 40, 45, 50, 55];
    for (const age of bracketAges) {
      if (age > opts.currentAge && age <= opts.targetAge && age < opts.fireAge) {
        const prevPct = getEmployerAgeBracketPercentage(age - 1, pension.employerAgeBracketContributions);
        const newPct  = getEmployerAgeBracketPercentage(age,     pension.employerAgeBracketContributions);
        if (newPct !== prevPct) {
          markers.push({ age, label: `Employer ${newPct}%`, color: 'hsl(152, 45%, 52%)' });
        }
      }
    }
  }

  // Deemed disposal (every 8 years)
  const etfPct = opts.etfAllocationPercent ?? 0;
  if (etfPct > 0) {
    for (let age = opts.currentAge + 8; age <= opts.targetAge; age += 8) {
      markers.push({ age, label: 'DD', color: 'hsl(45, 70%, 50%)' });
    }
  }

  // Forced min withdrawal at 61
  if (61 >= opts.currentAge && 61 <= opts.targetAge && opts.pensionAge <= 61) {
    markers.push({ age: 61, label: 'Min 4%', color: 'hsl(0, 65%, 55%)' });
  }

  // Forced min withdrawal at 71
  if (71 >= opts.currentAge && 71 <= opts.targetAge && opts.pensionAge <= 71) {
    markers.push({ age: 71, label: 'Min 5%', color: 'hsl(0, 65%, 55%)' });
  }

  // Assign vertical stagger lanes to avoid label overlap.
  // Two labels conflict if their x-indices are within PROXIMITY_THRESHOLD of each other.
  // Each successive lane shifts the label further up (more negative yAdjust).
  const PROXIMITY_THRESHOLD = 2; // index units; covers ~2 year gap on typical charts
  const BASE_Y_ADJUST = -6;
  const LANE_STEP = 18; // px per lane (approximate label height incl. padding)
  const MAX_LANES = 5;

  interface LaneEntry { idx: number; lane: number }
  const laneOccupancy: LaneEntry[] = [];

  function assignLane(idx: number): number {
    for (let lane = 0; lane < MAX_LANES; lane++) {
      const conflict = laneOccupancy.some(
        (e) => e.lane === lane && Math.abs(e.idx - idx) <= PROXIMITY_THRESHOLD,
      );
      if (!conflict) {
        laneOccupancy.push({ idx, lane });
        return lane;
      }
    }
    // Fallback: use last lane
    laneOccupancy.push({ idx, lane: MAX_LANES - 1 });
    return MAX_LANES - 1;
  }

  // Sort markers by age so lane assignment proceeds left-to-right
  markers.sort((a, b) => a.age - b.age);

  // Build annotations.
  // Each marker becomes TWO annotations:
  //   1. A visible dashed line at low z (no label) — drawn first, can be covered.
  //   2. An invisible zero-width line at high z (label only) — drawn last, always on top.
  for (const marker of markers) {
    const idx = ages.indexOf(marker.age);
    if (idx < 0) continue;

    const lane = assignLane(idx);
    const yAdjust = BASE_Y_ADJUST - lane * LANE_STEP;
    const key = `event_${marker.age}_${marker.label.replace(/\s/g, '_')}`;

    // Dashed line — no label, low z
    annotations[`${key}_line`] = {
      type: 'line' as const,
      xMin: idx,
      xMax: idx,
      borderColor: marker.color,
      borderWidth: 1.5,
      borderDash: [4, 3],
      z: 1,
    };

    // Label badge — invisible line, high z so it always renders above every dashed line
    annotations[`${key}_label`] = {
      type: 'line' as const,
      xMin: idx,
      xMax: idx,
      borderWidth: 0,
      borderColor: 'transparent',
      z: 100,
      label: {
        display: true,
        content: marker.label,
        position: 'start',
        backgroundColor: marker.color,
        color: '#fff',
        font: { size: 9, weight: 'bold' as const, family: 'Inter, system-ui, sans-serif' },
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        borderRadius: 3,
        yAdjust,
      },
    };
  }

  return annotations;
}
