import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { SummaryCards } from './SummaryCards';
import { HouseDepositCard } from './HouseDepositCard';
import { MilestoneTimeline } from './MilestoneTimeline';
import { ProjectionTable } from './ProjectionTable';
import { TaxBreakdown } from './TaxBreakdown';
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
  // bonusTaxBurden & lastCalculatedBonusPercent available if needed later
  // const bonusTaxBurden = useProjectionStore(s => s.bonusTaxBurden);
  // const lastCalculatedBonusPercent = useProjectionStore(s => s.lastCalculatedBonusPercent);

  if (!results) return null;

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Summary Cards */}
      <motion.div variants={fadeInUp}>
        <SummaryCards results={results} />
      </motion.div>

      {/* House Deposit */}
      {results.houseDepositCalculation && typeof results.houseWithdrawalAge === 'number' && (
        <motion.div variants={fadeInUp}>
          <HouseDepositCard
            age={results.houseWithdrawalAge}
            houseMetrics={results.houseDepositCalculation}
            mortgageExemption={results.mortgageExemption}
          />
        </motion.div>
      )}

      {/* Milestone Timeline */}
      <motion.div variants={fadeInUp}>
        <MilestoneTimeline results={results} />
      </motion.div>

      {/* Chart */}
      <motion.div variants={fadeInUp}>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
          <ProjectionChart results={results} />
        </Suspense>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeInUp}>
        <ProjectionTable results={results} />
      </motion.div>

      {/* Tax Summary */}
      {taxCalculationResult && (
        <motion.div variants={fadeInUp}>
          <TaxBreakdown
            result={taxCalculationResult}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
