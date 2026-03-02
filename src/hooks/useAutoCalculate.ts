import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { useProjectionStore } from '@/store/useProjectionStore';

/**
 * Automatically re-runs calculate() 400 ms after any FormInputs field changes.
 * On the first render it calculates immediately (no debounce).
 * Uses requestIdleCallback when available to avoid blocking the UI thread.
 */
export function useAutoCalculate() {
  const inputs = useProjectionStore(
    useShallow(s => ({
      dateOfBirth: s.dateOfBirth,
      targetAge: s.targetAge,
      currentSalary: s.currentSalary,
      annualSalaryIncrease: s.annualSalaryIncrease,
      bonusPercent: s.bonusPercent,
      taxBikValue: s.taxBikValue,
      accounts: s.accounts,
      pensionAge: s.pensionAge,
      fireAge: s.fireAge,
      withdrawalRate: s.withdrawalRate,
      salaryReplacementRate: s.salaryReplacementRate,
      enablePensionLumpSum: s.enablePensionLumpSum,
      pensionLumpSumAge: s.pensionLumpSumAge,
      pensionLumpSumMaxAmount: s.pensionLumpSumMaxAmount,
      lumpSumToBrokerageRate: s.lumpSumToBrokerageRate,
      enableHouseWithdrawal: s.enableHouseWithdrawal,
      houseWithdrawalAge: s.houseWithdrawalAge,
      houseDepositFromBrokerageRate: s.houseDepositFromBrokerageRate,
      mortgageExemption: s.mortgageExemption,
      baseHousePrice: s.baseHousePrice,
      houseAnnualPriceIncrease: s.houseAnnualPriceIncrease,
      mortgageInterestRate: s.mortgageInterestRate,
      mortgageTerm: s.mortgageTerm,
      includeStatePension: s.includeStatePension,
      statePensionAge: s.statePensionAge,
      statePensionWeeklyAmount: s.statePensionWeeklyAmount,
      careerBreaks: s.careerBreaks,
      windfalls: s.windfalls,
      inflationRate: s.inflationRate,
      claimRentRelief: s.claimRentRelief,
      claimMedicalInsurance: s.claimMedicalInsurance,
      taxBandIndexation: s.taxBandIndexation,
      monteCarloEnabled: s.monteCarloEnabled,
    })),
  );

  const isFirstRun = useRef(true);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      const { calculate } = useProjectionStore.getState();
      await calculate();
    };

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => { execute(); }, { timeout: 500 });
      } else {
        execute();
      }
    };

    if (isFirstRun.current) {
      isFirstRun.current = false;
      schedule();
      return () => {
        mounted = false;
      };
    }

    const { setIsCalculating } = useProjectionStore.getState();
    setIsCalculating(true);

    const timerId = window.setTimeout(schedule, 400);

    return () => {
      mounted = false;
      clearTimeout(timerId);
    };
  }, [inputs]); // eslint-disable-line react-hooks/exhaustive-deps
}
