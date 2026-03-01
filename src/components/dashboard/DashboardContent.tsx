import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CalendarClock, Table2, Receipt, HelpCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SummaryCards } from './SummaryCards';
import { HouseDepositCard } from './HouseDepositCard';
import { MilestoneTimeline } from './MilestoneTimeline';
import { EventTimeline } from './EventTimeline';
import { ProjectionTable } from './ProjectionTable';
import { TaxBreakdown } from './TaxBreakdown';
import { FAQGuide } from './FAQGuide';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectionStore } from '@/store/useProjectionStore';

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
  const results = useProjectionStore(s => s.results);
  const taxCalculationResult = useProjectionStore(s => s.taxCalculationResult);
  const accounts = useProjectionStore(s => s.accounts);
  const getCurrentAge = useProjectionStore(s => s.getCurrentAge);
  const targetAge = useProjectionStore(s => s.targetAge);
  const enableHouseWithdrawal = useProjectionStore(s => s.enableHouseWithdrawal);
  const houseWithdrawalAge = useProjectionStore(s => s.houseWithdrawalAge);
  const enablePensionLumpSum = useProjectionStore(s => s.enablePensionLumpSum);
  const pensionLumpSumAge = useProjectionStore(s => s.pensionLumpSumAge);
  const pensionLumpSumMaxAmount = useProjectionStore(s => s.pensionLumpSumMaxAmount);
  const includeStatePension = useProjectionStore(s => s.includeStatePension);
  const statePensionAge = useProjectionStore(s => s.statePensionAge);
  const statePensionWeeklyAmount = useProjectionStore(s => s.statePensionWeeklyAmount);
  const withdrawalRate = useProjectionStore(s => s.withdrawalRate);

  if (!results) return null;

  const currentAge = getCurrentAge();
  const numCurrentAge = typeof currentAge === 'number' ? currentAge : 28;
  const numTargetAge = typeof targetAge === 'number' ? targetAge : 75;
  const brokerage = accounts.find(a => a.name === 'Brokerage');
  const etfAllocationPercent = brokerage?.etfAllocationPercent ?? 50;

  // Shared props for event-aware components
  const eventProps = {
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
  };

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Summary Cards – always visible */}
      <motion.div variants={fadeInUp}>
        <SummaryCards results={results} />
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
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6 mt-4">
            <MilestoneTimeline results={results} />
            <EventTimeline results={results} {...eventProps} />
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="mt-4">
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
              />
            </Suspense>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="mt-4">
            <ProjectionTable results={results} {...eventProps} />
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
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
