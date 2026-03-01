import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { AccountType, AccountInput, PortfolioResults } from '@/types';
import { type SavedScenario } from '@/store/useProjectionStore';
import {
  useChartData,
  PortfolioGrowthChart,
  ContributionsGrowthChart,
  AnnualFlowsChart,
  IncomeTimelineChart,
} from './charts';
import { AgeRangeSlider } from './charts/AgeRangeSlider';
import { buildEventAnnotations } from './charts/chartAnnotations';
import { combineYearlyData } from '@/utils/calculations';
import { deflate } from '@/utils/formatters';
// Ensure Chart.js registrations run
import './charts/chartConfig';

type ChartTab = 'growth' | 'deposits' | 'flows' | 'income';
type AccountFilter = 'all' | AccountType;

const TAB_LABELS: Record<ChartTab, string> = {
  growth: 'Portfolio Growth',
  income: 'Income',
  deposits: 'Deposits vs Growth',
  flows: 'Annual Flows',
};

interface ProjectionChartProps {
  results: PortfolioResults;
  currentAge: number;
  enableHouseWithdrawal?: boolean;
  houseWithdrawalAge?: number;
  enablePensionLumpSum?: boolean;
  pensionLumpSumAge?: number;
  includeStatePension?: boolean;
  statePensionAge?: number;
  etfAllocationPercent?: number;
  accounts?: AccountInput[];
  showRealValues?: boolean;
  inflationRate?: number;
  visibleScenarios?: SavedScenario[];
}

const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function ProjectionChart({
  results,
  currentAge,
  enableHouseWithdrawal,
  houseWithdrawalAge,
  enablePensionLumpSum,
  pensionLumpSumAge,
  includeStatePension,
  statePensionAge,
  etfAllocationPercent,
  accounts,
  showRealValues,
  inflationRate = 2.5,
  visibleScenarios = [],
}: ProjectionChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('growth');
  const [depositsAccount, setDepositsAccount] = useState<AccountFilter>('all');
  const [flowsAccount, setFlowsAccount] = useState<AccountFilter>('all');
  const [showEventMarkers, setShowEventMarkers] = useState(false);

  const accountNames = useMemo(
    () => results.accountResults.map((a) => a.accountName),
    [results],
  );

  const {
    combined,
    phaseBands,
    portfolioGrowthData,
    contributionsGrowthData,
    annualFlowsData,
    incomeTimelineData,
    perAccountContributionsGrowthData,
    perAccountAnnualFlowsData,
  } = useChartData(results, { showRealValues, inflationRate, currentAge });

  const isFirstYearProRated = results.monthsUntilNextBirthday < 12;

  // Months remaining in the current calendar year (Dec is month 11).
  // This is what the first pro-rated year represents in the projection.
  const monthsUntilYearEnd = useMemo(() => {
    const today = new Date();
    return 12 - today.getMonth() - 1; // months after the current month until end of year
  }, []);

  const ages = useMemo(() => combined.map((d) => d.age), [combined]);
  const minAge = ages[0] ?? 0;
  const maxAge = ages[ages.length - 1] ?? 100;

  // Build scenario overlay datasets for the portfolio growth chart
  const SCENARIO_COLORS = [
    'hsl(280, 60%, 55%)', // purple
    'hsl(30, 80%, 55%)',  // orange
    'hsl(340, 70%, 50%)', // pink
    'hsl(190, 65%, 45%)', // cyan
    'hsl(60, 70%, 45%)',  // yellow
  ];

  // Build scenario dataset entries shared across charts
  const scenarioOverlayDatasets = useMemo(() =>
    visibleScenarios.map((scenario, idx) => {
      const scenResults = scenario.results!;
      const scenCombined = combineYearlyData(scenResults.accountResults, scenResults.fireAge, scenResults.pensionAge);
      const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
      return { scenario, scenCombined, color, idx };
    }),
    [visibleScenarios, ages],
  );

  const portfolioGrowthWithScenarios = useMemo(() => {
    if (scenarioOverlayDatasets.length === 0) return portfolioGrowthData;

    const scenarioDatasets = scenarioOverlayDatasets.map(({ scenario, scenCombined, color, idx }) => {
      const scenDataByAge = new Map(scenCombined.map(d => [d.age, d.Savings + d.Pension + d.Brokerage]));
      const data = ages.map(age => {
        const val = scenDataByAge.get(age) ?? null;
        if (val === null) return null;
        return showRealValues ? deflate(val, age - currentAge, inflationRate) : val;
      });

      return {
        label: scenario.label,
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 8,
        borderDash: [6, 3],
        borderWidth: 2,
        order: 0,
        stack: `scenario-${idx}`,
        isScenarioOverlay: true,
      } as any;
    });

    return {
      ...portfolioGrowthData,
      datasets: [...portfolioGrowthData.datasets, ...scenarioDatasets],
    };
  }, [portfolioGrowthData, scenarioOverlayDatasets, ages, showRealValues, inflationRate, currentAge]);

  const incomeTimelineWithScenarios = useMemo(() => {
    if (scenarioOverlayDatasets.length === 0) return incomeTimelineData;

    const scenarioDatasets = scenarioOverlayDatasets.map(({ scenario, scenCombined, color }) => {
      const scenDataByAge = new Map(scenCombined.map(d => [d.age, d.netIncome]));
      const data = ages.map(age => {
        const val = scenDataByAge.get(age) ?? null;
        if (val === null) return null;
        return showRealValues ? deflate(val, age - currentAge, inflationRate) : val;
      });

      return {
        label: scenario.label,
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 8,
        borderDash: [6, 3],
        borderWidth: 2,
        order: 0,
        isScenarioOverlay: true,
      } as any;
    });

    return {
      ...incomeTimelineData,
      datasets: [...incomeTimelineData.datasets, ...scenarioDatasets],
    };
  }, [incomeTimelineData, scenarioOverlayDatasets, ages, showRealValues, inflationRate, currentAge]);

  const [ageRange, setAgeRange] = useState<[number, number]>([minAge, maxAge]);

  // Keep slider in sync when data changes (e.g. user edits form)
  const effectiveRange: [number, number] = useMemo(() => {
    return [Math.max(ageRange[0], minAge), Math.min(ageRange[1], maxAge)];
  }, [ageRange, minAge, maxAge]);

  // Only pass ageRange to charts when it's actually narrower than full range
  const isSliced = effectiveRange[0] > minAge || effectiveRange[1] < maxAge;
  const chartAgeRange = isSliced ? effectiveRange : undefined;

  // Compute the slice of ages that are actually visible on the chart.
  // Annotations use array indices as x-positions, so they must be computed
  // against the same (possibly sliced) ages array that Chart.js sees.
  const visibleAges = useMemo(() => {
    if (!isSliced) return ages;
    const startIdx = ages.findIndex((a) => a >= effectiveRange[0]);
    const endIdx = ages.findIndex((a) => a > effectiveRange[1]);
    const si = startIdx >= 0 ? startIdx : 0;
    const ei = endIdx >= 0 ? endIdx : ages.length;
    return ages.slice(si, ei);
  }, [ages, effectiveRange, isSliced]);

  // Build event annotation markers for the charts.
  // Uses visibleAges so that xMin/xMax indices align with the sliced x-axis.
  const eventAnnotations = useMemo(
    () =>
      buildEventAnnotations(visibleAges, {
        fireAge: results.fireAge,
        pensionAge: results.pensionAge,
        houseWithdrawalAge,
        enableHouseWithdrawal,
        pensionLumpSumAge,
        enablePensionLumpSum,
        statePensionAge,
        includeStatePension,
        currentAge,
        targetAge: maxAge,
        etfAllocationPercent,
        accounts,
      }),
    [visibleAges, results.fireAge, results.pensionAge, houseWithdrawalAge, enableHouseWithdrawal, pensionLumpSumAge, enablePensionLumpSum, statePensionAge, includeStatePension, currentAge, maxAge, etfAllocationPercent, accounts],
  );

  const handleRangeChange = useCallback((range: [number, number]) => {
    setAgeRange(range);
  }, []);

  const sharedProps = {
    combined,
    phaseBands,
    isFirstYearProRated,
    proRatedMonths: monthsUntilYearEnd,
    ageRange: chartAgeRange,
    eventAnnotations: showEventMarkers ? eventAnnotations : undefined,
  };

  const depositsData =
    depositsAccount !== 'all' && perAccountContributionsGrowthData[depositsAccount]
      ? perAccountContributionsGrowthData[depositsAccount]!
      : contributionsGrowthData;

  const flowsData =
    flowsAccount !== 'all' && perAccountAnnualFlowsData[flowsAccount]
      ? perAccountAnnualFlowsData[flowsAccount]!
      : annualFlowsData;

  return (
    <Card data-chart-container>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Growth Over Time</CardTitle>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5">
              <Switch
                id="event-markers-toggle"
                checked={showEventMarkers}
                onCheckedChange={setShowEventMarkers}
                className="scale-75 origin-right"
              />
              <Label htmlFor="event-markers-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                Events
              </Label>
            </div>
            {(activeTab === 'deposits' || activeTab === 'flows') && (
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={activeTab === 'deposits' ? depositsAccount : flowsAccount}
                onChange={(e) => {
                  const val = e.target.value as AccountFilter;
                  if (activeTab === 'deposits') setDepositsAccount(val);
                  else setFlowsAccount(val);
                }}
              >
                <option value="all">All Accounts</option>
                {accountNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as ChartTab);
              }}
            >
              <TabsList className="h-8">
                {(Object.keys(TAB_LABELS) as ChartTab[]).map((key) => (
                  <TabsTrigger key={key} value={key} className="px-2.5 text-xs">
                    {TAB_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-4 pt-0 sm:px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'growth' && (
            <motion.div key="growth" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <PortfolioGrowthChart
                data={portfolioGrowthWithScenarios}
                {...sharedProps}
              />
            </motion.div>
          )}

          {activeTab === 'deposits' && (
            <motion.div key={`deposits-${depositsAccount}`} variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <ContributionsGrowthChart
                data={depositsData}
                {...sharedProps}
              />
            </motion.div>
          )}

          {activeTab === 'flows' && (
            <motion.div key={`flows-${flowsAccount}`} variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <AnnualFlowsChart
                data={flowsData}
                {...sharedProps}
              />
            </motion.div>
          )}

          {activeTab === 'income' && (
            <motion.div key="income" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <IncomeTimelineChart
                data={incomeTimelineWithScenarios}
                {...sharedProps}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AgeRangeSlider
          ages={ages}
          fireAge={results.fireAge}
          pensionAge={results.pensionAge}
          value={effectiveRange}
          onChange={handleRangeChange}
        />
      </CardContent>
    </Card>
  );
}
