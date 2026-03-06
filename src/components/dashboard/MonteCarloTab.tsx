import { useState, useMemo, useCallback } from 'react';
import { Activity, Play, Loader2, BarChart3, GitBranch, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/form/FormField';
import { useProjectionStore } from '@/store/useProjectionStore';
import type { PortfolioResults } from '@/types';
import { useChartData, MonteCarloChart } from './charts';
import type { MCViewMode } from './charts';
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
  const monteCarloIncomePercentiles = useProjectionStore(s => s.monteCarloIncomePercentiles);
  const monteCarloSamplePaths = useProjectionStore(s => s.monteCarloSamplePaths);
  const monteCarloSampleIncomePaths = useProjectionStore(s => s.monteCarloSampleIncomePaths);
  const monteCarloSuccessRate = useProjectionStore(s => s.monteCarloSuccessRate);
  const monteCarloSuccessCount = useProjectionStore(s => s.monteCarloSuccessCount);
  const runMonteCarloSimulations = useProjectionStore(s => s.runMonteCarloSimulations);
  const updateField = useProjectionStore(s => s.updateField);

  const [mcViewMode, setMcViewMode] = useState<MCViewMode>('both');
  const [mcSampleCount, setMcSampleCount] = useState(25);
  const [activeTab, setActiveTab] = useState<'balance' | 'income'>('balance');
  const maxSamples = monteCarloSamplePaths?.length ?? 50;

  const {
    combined,
    phaseBands,
    monteCarloChartData,
    monteCarloIncomeChartData,
  } = useChartData(results, { showRealValues, inflationRate, currentAge, monteCarloPercentiles, monteCarloIncomePercentiles, monteCarloSamplePaths, monteCarloSampleIncomePaths, mcViewMode, mcSampleCount });

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
              onChange={(v) => updateField('monteCarloSimulations', typeof v === 'number' ? v : 1000)}
              min={100}
              max={10000}
              step={50}
              placeholder="1000"
              hint="Number of runs (100–10,000)"
            />
            <NumberField
              label="Return Volatility (%)"
              id="returnVolatility"
              value={returnVolatility}
              onChange={(v) => updateField('returnVolatility', typeof v === 'number' ? v : 14)}
              min={0.5}
              max={30}
              step={0.5}
              placeholder="14"
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

          {/* Success rate */}
          {monteCarloSuccessRate !== null && monteCarloSuccessCount !== null && !isMonteCarloRunning && (() => {
            const total = monteCarloSimulations;
            const pct = monteCarloSuccessRate === 1 ? 100 : Math.floor(monteCarloSuccessRate * 100);
            const colour = pct >= 90 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
              : pct >= 75 ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800'
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
            return (
              <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${colour}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Simulation success rate</span>
                  <span className="text-[10px] opacity-75 tabular-nums">{monteCarloSuccessCount.toLocaleString()}/{total.toLocaleString()} runs positive</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{pct}%</span>
              </div>
            );
          })()}
          <p className="text-[10px] text-muted-foreground leading-snug">
            Runs {monteCarloSimulations} randomised return paths. Displays P10 / P25 / P50 / P75 / P90
            probability bands — the shaded inner band spans P25–P75 (interquartile range) and the
            outer band spans P10–P90.
          </p>

          {/* View mode toggle + sample count */}
          {(monteCarloChartData || monteCarloPercentiles) && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">View:</span>
                {([
                  { mode: 'percentiles' as MCViewMode, label: 'Percentiles', icon: BarChart3 },
                  { mode: 'samples' as MCViewMode, label: 'Samples', icon: GitBranch },
                  { mode: 'both' as MCViewMode, label: 'Both', icon: Layers },
                ] as const).map(({ mode, label, icon: Icon }) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={mcViewMode === mode ? 'default' : 'outline'}
                    className="h-7 px-2.5 text-xs gap-1"
                    onClick={() => setMcViewMode(mode)}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </Button>
                ))}
              </div>
              {(mcViewMode === 'samples' || mcViewMode === 'both') && (
                <div className="flex items-center gap-2">
                  <label htmlFor="mc-sample-count" className="text-xs text-muted-foreground whitespace-nowrap">
                    Sample paths:
                  </label>
                  <input
                    id="mc-sample-count"
                    type="range"
                    min={1}
                    max={maxSamples}
                    step={1}
                    value={mcSampleCount}
                    onChange={(e) => setMcSampleCount(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-orange-500"
                  />
                  <span className="text-xs font-medium tabular-nums w-6 text-right">{mcSampleCount}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed chart card */}
      {(monteCarloChartData || isMonteCarloRunning) && (
        <Card data-chart-container>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-base">
                {mcViewMode === 'samples'
                  ? `${mcSampleCount} Sample Path${mcSampleCount !== 1 ? 's' : ''}`
                  : mcViewMode === 'both'
                  ? 'Percentiles + Samples'
                  : 'P10 / P25 / Median / P75 / P90'}
              </CardTitle>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'balance' | 'income')}>
                <TabsList className="w-full h-8">
                  <TabsTrigger value="balance" className="flex-1 px-1.5 text-xs">
                    <span className="sm:hidden">Balance</span>
                    <span className="hidden sm:inline">Portfolio Balance</span>
                  </TabsTrigger>
                  <TabsTrigger value="income" className="flex-1 px-1.5 text-xs">
                    <span className="sm:hidden">Income</span>
                    <span className="hidden sm:inline">Net Income</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-0 sm:px-4">
            {activeTab === 'balance' && (
              monteCarloChartData ? (
                <>
                  <MonteCarloChart
                    data={monteCarloChartData}
                    combined={combined}
                    phaseBands={phaseBands}
                    ageRange={chartAgeRange}
                    isLoading={isMonteCarloRunning}
                    tooltipId="mc-balance-tooltip"
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
                    <svg className="h-5 w-5 animate-spin text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-medium text-muted-foreground">Running simulations…</span>
                  </div>
                </div>
              )
            )}
            {activeTab === 'income' && (
              monteCarloIncomeChartData ? (
                <>
                  <MonteCarloChart
                    data={monteCarloIncomeChartData}
                    combined={combined}
                    phaseBands={phaseBands}
                    ageRange={chartAgeRange}
                    isLoading={isMonteCarloRunning}
                    tooltipId="mc-income-tooltip"
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
                    <svg className="h-5 w-5 animate-spin text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-medium text-muted-foreground">Running simulations…</span>
                  </div>
                </div>
              )
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
