import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AccountType, PortfolioResults } from '@/types';
import {
  useChartData,
  PortfolioGrowthChart,
  ContributionsGrowthChart,
  AnnualFlowsChart,
  IncomeTimelineChart,
} from './charts';
import { AgeRangeSlider } from './charts/AgeRangeSlider';
// Ensure Chart.js registrations run
import './charts/chartConfig';

type ChartTab = 'growth' | 'deposits' | 'flows' | 'income';
type AccountFilter = 'all' | AccountType;

const TAB_LABELS: Record<ChartTab, string> = {
  growth: 'Portfolio Growth',
  deposits: 'Deposits vs Growth',
  flows: 'Annual Flows',
  income: 'Income',
};

interface ProjectionChartProps {
  results: PortfolioResults;
}

const fadeVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function ProjectionChart({ results }: ProjectionChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('growth');
  const [depositsAccount, setDepositsAccount] = useState<AccountFilter>('all');
  const [flowsAccount, setFlowsAccount] = useState<AccountFilter>('all');

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
  } = useChartData(results);

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

  const [ageRange, setAgeRange] = useState<[number, number]>([minAge, maxAge]);

  // Keep slider in sync when data changes (e.g. user edits form)
  const effectiveRange: [number, number] = useMemo(() => {
    return [Math.max(ageRange[0], minAge), Math.min(ageRange[1], maxAge)];
  }, [ageRange, minAge, maxAge]);

  // Only pass ageRange to charts when it's actually narrower than full range
  const isSliced = effectiveRange[0] > minAge || effectiveRange[1] < maxAge;
  const chartAgeRange = isSliced ? effectiveRange : undefined;

  const handleRangeChange = useCallback((range: [number, number]) => {
    setAgeRange(range);
  }, []);

  const sharedProps = {
    combined,
    phaseBands,
    isFirstYearProRated,
    proRatedMonths: monthsUntilYearEnd,
    ageRange: chartAgeRange,
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Growth Over Time</CardTitle>
          <div className="flex items-center gap-2 flex-wrap justify-end">
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
                data={portfolioGrowthData}
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
                data={incomeTimelineData}
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
