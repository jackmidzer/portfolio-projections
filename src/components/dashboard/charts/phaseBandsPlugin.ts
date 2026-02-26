import type { Plugin, Chart } from 'chart.js';
import { getPhaseColor, getPhasePillBg, getPhasePillText, getPhasePillBorder } from './chartTheme';

export interface PhaseBandsOptions {
  fireAge: number;
  pensionAge: number;
  ages: number[];  // array of age labels matching the x-axis
}

type PhaseEntry = {
  left: number;
  right: number;
  phase: 'working' | 'bridging' | 'drawdown';
  label: string;
};

/** Resolve phase bands pixel positions from chart state */
function resolvePhases(chart: Chart): PhaseEntry[] | null {
  const opts = (chart.options as any).phaseBands as PhaseBandsOptions | undefined;
  if (!opts) return null;

  const { fireAge, pensionAge, ages } = opts;
  if (!ages.length) return null;

  const xScale = chart.scales['x'];
  const yScale = chart.scales['y'];
  if (!xScale || !yScale) return null;

  const chartLeft = xScale.left;
  const chartRight = xScale.right;

  const erIdx = ages.findIndex((a) => a >= fireAge);
  const penIdx = ages.findIndex((a) => a >= pensionAge);

  const erX = erIdx >= 0 ? xScale.getPixelForValue(erIdx) : chartRight;
  const penX = penIdx >= 0 ? xScale.getPixelForValue(penIdx) : chartRight;

  const phases: PhaseEntry[] = [];

  if (erX > chartLeft) {
    phases.push({ left: chartLeft, right: Math.min(erX, chartRight), phase: 'working', label: 'Working Phase' });
  }
  if (erIdx >= 0 && penX > erX) {
    phases.push({ left: erX, right: Math.min(penX, chartRight), phase: 'bridging', label: 'Bridging Phase' });
  }
  if (penIdx >= 0 && chartRight > penX) {
    phases.push({ left: penX, right: chartRight, phase: 'drawdown', label: 'Drawdown Phase' });
  }

  return phases;
}

/** Helper to draw a rounded rect (compatible with older browsers lacking ctx.roundRect) */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Chart.js plugin that draws semi-transparent background bands
 * for each financial lifecycle phase (Working / Bridging / Drawdown).
 *
 * Background bands render in beforeDraw (behind data).
 * Phase pill labels render in afterDatasetsDraw (in front of data).
 */
export const phaseBandsPlugin: Plugin<'line' | 'bar'> = {
  id: 'phaseBands',

  /* ── Background bands (behind data) ── */
  beforeDraw(chart: Chart) {
    const phases = resolvePhases(chart);
    if (!phases) return;

    const { ctx } = chart;
    const yScale = chart.scales['y'];
    if (!yScale) return;
    const top = yScale.top;
    const bottom = yScale.bottom;

    ctx.save();
    for (const band of phases) {
      const width = band.right - band.left;
      if (width <= 0) continue;
      ctx.fillStyle = getPhaseColor(band.phase);
      ctx.fillRect(band.left, top, width, bottom - top);
    }
    ctx.restore();
  },

  /* ── Phase pill labels (in front of data) ── */
  afterDatasetsDraw(chart: Chart) {
    const phases = resolvePhases(chart);
    if (!phases) return;

    const { ctx } = chart;
    const yScale = chart.scales['y'];
    if (!yScale) return;
    const top = yScale.top;

    ctx.save();

    const fontSize = 11;
    const fontStr = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    const paddingX = 8;
    const paddingY = 3;
    const pillRadius = 4;
    const pillY = top + 6;

    for (const band of phases) {
      const width = band.right - band.left;
      if (width <= 40) continue;

      ctx.font = fontStr;
      const textWidth = ctx.measureText(band.label).width;
      const pillW = textWidth + paddingX * 2;
      const pillH = fontSize + paddingY * 2;
      const centerX = band.left + width / 2;
      const pillX = centerX - pillW / 2;

      // Pill background
      roundedRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
      ctx.fillStyle = getPhasePillBg(band.phase);
      ctx.fill();

      // Pill border
      ctx.strokeStyle = getPhasePillBorder(band.phase);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pill text
      ctx.fillStyle = getPhasePillText(band.phase);
      ctx.font = fontStr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(band.label, centerX, pillY + paddingY);
    }

    ctx.restore();
  },
};
