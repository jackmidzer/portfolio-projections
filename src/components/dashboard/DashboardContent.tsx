import { lazy, Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CalendarClock, Table2, Receipt, HelpCircle, GitCompareArrows, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { SummaryCards } from './SummaryCards';
import { FIRECountdown } from './FIRECountdown';
import { HouseDepositCard } from './HouseDepositCard';
import { MilestoneTimeline } from './MilestoneTimeline';
import { EventTimeline } from './EventTimeline';
import { ProjectionTable } from './ProjectionTable';
import { TaxBreakdown } from './TaxBreakdown';
import { FAQGuide } from './FAQGuide';
import { ScenarioComparison } from './ScenarioComparison';
import { MonteCarloTab } from './MonteCarloTab';
import { PRSIContributionCard } from './PRSIContributionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback } from '@/components/ErrorFallback';
import { useProjectionStore } from '@/store/useProjectionStore';
import { useShallow } from 'zustand/react/shallow';

import { parseNumeric } from '@/utils/parseNumeric';

const ProjectionChart = lazy(() => import('./ProjectionChart').then(m => ({ default: m.ProjectionChart })));

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 }
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

export function DashboardContent() {
  const {
    results,
    taxCalculationResult,
    accounts,
    getCurrentAge,
    targetAge,
    enableHouseWithdrawal,
    houseWithdrawalAge,
    enablePensionLumpSum,
    pensionLumpSumAge,
    pensionLumpSumMaxAmount,
    includeStatePension,
    statePensionAge,
    statePensionWeeklyAmount,
    withdrawalRate,
    showRealValues,
    inflationRate,
    scenarios,
    visibleScenarioIds,
    toggleScenarioVisibility,
    deleteScenario,
  } = useProjectionStore(
    useShallow(s => ({
      results: s.results,
      taxCalculationResult: s.taxCalculationResult,
      accounts: s.accounts,
      getCurrentAge: s.getCurrentAge,
      targetAge: s.targetAge,
      enableHouseWithdrawal: s.enableHouseWithdrawal,
      houseWithdrawalAge: s.houseWithdrawalAge,
      enablePensionLumpSum: s.enablePensionLumpSum,
      pensionLumpSumAge: s.pensionLumpSumAge,
      pensionLumpSumMaxAmount: s.pensionLumpSumMaxAmount,
      includeStatePension: s.includeStatePension,
      statePensionAge: s.statePensionAge,
      statePensionWeeklyAmount: s.statePensionWeeklyAmount,
      withdrawalRate: s.withdrawalRate,
      showRealValues: s.showRealValues,
      inflationRate: s.inflationRate,
      scenarios: s.scenarios,
      visibleScenarioIds: s.visibleScenarioIds,
      toggleScenarioVisibility: s.toggleScenarioVisibility,
      deleteScenario: s.deleteScenario,
    }))
  );

  if (!results) return null;

  const currentAge = getCurrentAge();
  const numCurrentAge = typeof currentAge === 'number' ? currentAge : 28;
  const numTargetAge = parseNumeric(targetAge, 75);
  const numInflationRate = parseNumeric(inflationRate, 2.5);
  const brokerage = accounts.find(a => a.name === 'Brokerage');
  const etfAllocationPercent = brokerage?.etfAllocationPercent ?? 50;

  // Visible saved scenarios with results (memoised)
  const visibleScenarios = useMemo(
    () => scenarios.filter(s => visibleScenarioIds.includes(s.id) && s.results),
    [scenarios, visibleScenarioIds],
  );

  // Shared props for event-aware components (memoised)
  const eventProps = useMemo(() => ({
    accounts,
    currentAge: numCurrentAge,
    targetAge: numTargetAge,
    enableHouseWithdrawal,
    houseWithdrawalAge: typeof houseWithdrawalAge === 'number' ? houseWithdrawalAge : undefined,
    enablePensionLumpSum,
    pensionLumpSumAge: typeof pensionLumpSumAge === 'number' ? pensionLumpSumAge : undefined,
    pensionLumpSumMaxAmount: typeof pensionLumpSumMaxAmount === 'number' ? pensionLumpSumMaxAmount : undefined,
    includeStatePension,
    statePensionAge: typeof statePensionAge === 'number' ? statePensionAge : undefined,
    statePensionWeeklyAmount: typeof statePensionWeeklyAmount === 'number' ? statePensionWeeklyAmount : undefined,
    withdrawalRate: typeof withdrawalRate === 'number' ? withdrawalRate : undefined,
  }), [accounts, numCurrentAge, numTargetAge, enableHouseWithdrawal, houseWithdrawalAge, enablePensionLumpSum, pensionLumpSumAge, pensionLumpSumMaxAmount, includeStatePension, statePensionAge, statePensionWeeklyAmount, withdrawalRate]);

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Summary Cards – always visible */}
      <motion.div variants={fadeInUp}>
        <SummaryCards results={results} showRealValues={showRealValues} inflationRate={numInflationRate} currentAge={numCurrentAge} />
      </motion.div>

      {/* FIRE Countdown – always visible when FIRE age is set */}
      <motion.div variants={fadeInUp}>
        <FIRECountdown />
      </motion.div>

      {/* PRSI Contribution Card – visible when State Pension is enabled */}
      <motion.div variants={fadeInUp}>
        <PRSIContributionCard />
      </motion.div>

      {/* House Deposit – always visible when present */}
      {results.houseDepositCalculation && typeof results.houseWithdrawalAge === 'number' && (
        <motion.div variants={fadeInUp}>
          <HouseDepositCard
            age={results.houseWithdrawalAge}
            houseMetrics={results.houseDepositCalculation}
            mortgageExemption={results.mortgageExemption}
          />
        </motion.div>
      )}

      {/* Tabbed detail sections */}
      <motion.div variants={fadeInUp}>
        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <CalendarClock className="h-3.5 w-3.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="montecarlo" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5" />
              Monte Carlo
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Table2 className="h-3.5 w-3.5" />
              Data
            </TabsTrigger>
            {taxCalculationResult && (
              <TabsTrigger value="tax" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Receipt className="h-3.5 w-3.5" />
                Tax
              </TabsTrigger>
            )}
            <TabsTrigger value="help" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <GitCompareArrows className="h-3.5 w-3.5" />
              Scenarios
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6 mt-4">
            <MilestoneTimeline results={results} />
            <EventTimeline results={results} {...eventProps} />
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="mt-4">
            <ErrorBoundary fallback={(props) => <ErrorFallback {...props} compact />}>
              <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
                <ProjectionChart
                  results={results}
                  currentAge={numCurrentAge}
                  enableHouseWithdrawal={enableHouseWithdrawal}
                  houseWithdrawalAge={eventProps.houseWithdrawalAge}
                  enablePensionLumpSum={enablePensionLumpSum}
                  pensionLumpSumAge={eventProps.pensionLumpSumAge}
                  includeStatePension={includeStatePension}
                  statePensionAge={eventProps.statePensionAge}
                  etfAllocationPercent={etfAllocationPercent}
                  accounts={accounts}
                  showRealValues={showRealValues}
                  inflationRate={numInflationRate}
                  visibleScenarios={visibleScenarios}
                />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Monte Carlo Tab */}
          <TabsContent value="montecarlo" className="mt-4">
            <MonteCarloTab
              results={results}
              currentAge={numCurrentAge}
              showRealValues={showRealValues}
              inflationRate={numInflationRate}
            />
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="mt-4">
            <ProjectionTable results={results} {...eventProps} showRealValues={showRealValues} inflationRate={numInflationRate} />
          </TabsContent>

          {/* Tax Tab */}
          {taxCalculationResult && (
            <TabsContent value="tax" className="mt-4">
              <TaxBreakdown result={taxCalculationResult} />
            </TabsContent>
          )}

          {/* Help Tab */}
          <TabsContent value="help" className="mt-4">
            <FAQGuide />
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="mt-4">
            <ScenarioComparison
              currentResults={results}
              scenarios={scenarios}
              visibleScenarioIds={visibleScenarioIds}
              onToggleVisibility={toggleScenarioVisibility}
              onDelete={deleteScenario}
              showRealValues={showRealValues}
              inflationRate={numInflationRate}
              currentAge={numCurrentAge}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
