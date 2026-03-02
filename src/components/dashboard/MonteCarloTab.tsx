import { useState, useMemo, useCallback } from 'react';
import { Activity, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/form/FormField';
import { useProjectionStore } from '@/store/useProjectionStore';
import type { PortfolioResults } from '@/types';
import { useChartData, MonteCarloChart } from './charts';
import { AgeRangeSlider } from './charts/AgeRangeSlider';
import './charts/chartConfig';

interface MonteCarloTabProps {
  results: PortfolioResults;
  currentAge: number;
  showRealValues?: boolean;
  inflationRate?: number;
}

export function MonteCarloTab({
  results,
  currentAge,
  showRealValues,
  inflationRate = 2.5,
}: MonteCarloTabProps) {
  const monteCarloSimulations = useProjectionStore(s => s.monteCarloSimulations);
  const returnVolatility = useProjectionStore(s => s.returnVolatility);
  const isMonteCarloRunning = useProjectionStore(s => s.isMonteCarloRunning);
  const monteCarloPercentiles = useProjectionStore(s => s.monteCarloPercentiles);
  const runMonteCarloSimulations = useProjectionStore(s => s.runMonteCarloSimulations);
  const updateField = useProjectionStore(s => s.updateField);

  const {
    combined,
    phaseBands,
    monteCarloChartData,
  } = useChartData(results, { showRealValues, inflationRate, currentAge, monteCarloPercentiles });

  const ages = useMemo(() => combined.map(d => d.age), [combined]);
  const minAge = ages[0] ?? 0;
  const maxAge = ages[ages.length - 1] ?? 100;

  const [ageRange, setAgeRange] = useState<[number, number]>([minAge, maxAge]);

  const effectiveRange: [number, number] = useMemo(
    () => [Math.max(ageRange[0], minAge), Math.min(ageRange[1], maxAge)],
    [ageRange, minAge, maxAge],
  );

  const isSliced = effectiveRange[0] > minAge || effectiveRange[1] < maxAge;
  const chartAgeRange = isSliced ? effectiveRange : undefined;

  const handleRangeChange = useCallback((range: [number, number]) => {
    setAgeRange(range);
  }, []);

  return (
    <div className="space-y-4">
      {/* Controls card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            Monte Carlo Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Simulations"
              id="monteCarloSimulations"
              value={monteCarloSimulations}
              onChange={(v) => updateField('monteCarloSimulations', typeof v === 'number' ? v : 500)}
              min={50}
              max={5000}
              step={50}
              placeholder="500"
              hint="Number of runs (50–5,000)"
            />
            <NumberField
              label="Return Volatility (%)"
              id="returnVolatility"
              value={returnVolatility}
              onChange={(v) => updateField('returnVolatility', typeof v === 'number' ? v : 2)}
              min={0.5}
              max={30}
              step={0.5}
              placeholder="2"
              hint="Annual return std dev (%)"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isMonteCarloRunning}
            onClick={() => runMonteCarloSimulations()}
          >
            {isMonteCarloRunning ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running…</>
            ) : (
              <><Play className="h-3.5 w-3.5 mr-1.5" /> Run Simulation</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Runs {monteCarloSimulations} randomised return paths. Displays P10 / P25 / P50 / P75 / P90
            probability bands — the shaded inner band spans P25–P75 (interquartile range) and the
            outer band spans P10–P90.
          </p>
        </CardContent>
      </Card>

      {/* Chart card */}
      {(monteCarloChartData || isMonteCarloRunning) && (
        <Card data-chart-container>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
              P10 / P25 / Median / P75 / P90
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-0 sm:px-4">
            {monteCarloChartData ? (
              <>
                <MonteCarloChart
                  data={monteCarloChartData}
                  combined={combined}
                  phaseBands={phaseBands}
                  ageRange={chartAgeRange}
                  isLoading={isMonteCarloRunning}
                />
                <AgeRangeSlider
                  ages={ages}
                  fireAge={results.fireAge}
                  pensionAge={results.pensionAge}
                  value={effectiveRange}
                  onChange={handleRangeChange}
                />
              </>
            ) : (
              <div className="relative h-[240px] sm:h-[280px] lg:h-[320px] xl:h-[360px] w-full rounded-lg border border-dashed border-border flex flex-col items-center justify-center bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="h-5 w-5 animate-spin text-purple-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-muted-foreground">Running simulations…</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state before first run */}
      {!monteCarloChartData && !isMonteCarloRunning && (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Configure the settings above and click <span className="font-medium">Run Simulation</span> to
              visualise return uncertainty with randomised probability bands.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
