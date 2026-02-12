import { TaxCalculationResult } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface TaxSummaryProps {
  result: TaxCalculationResult;
  showDetail?: boolean;
}

export default function TaxSummary({ result, showDetail = true }: TaxSummaryProps) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-600 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Irish Tax Calculation
      </h3>

      {/* Top Summary Line */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-md bg-gray-50 p-4 dark:bg-gray-700">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Annual Net Salary</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(result.netSalary)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Net Salary</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(result.monthlyNetSalary)}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {showDetail && (
        <div className="space-y-4">
          <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-600">
            <span className="text-gray-700 dark:text-gray-300">Gross Salary</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {formatCurrency(result.grossSalary)}
            </span>
          </div>

          {result.pendingContribution > 0 && (
            <div className="ml-4 flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Pension Contribution</span>
              <span className="font-mono">{formatCurrency(result.pendingContribution)}</span>
            </div>
          )}

          {result.bikValue > 0 && (
            <div className="ml-4 flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>BIK Value</span>
              <span className="font-mono">{formatCurrency(result.bikValue)}</span>
            </div>
          )}

          <div className="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-600">
            <span className="text-gray-700 dark:text-gray-300">Taxable Income</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {formatCurrency(result.taxableIncome)}
            </span>
          </div>

          {/* PAYE Tax Bands */}
          <div className="space-y-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900 dark:bg-opacity-20">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">PAYE Tax Bands</p>
            {result.payeTaxBands.map((band, idx) => (
              <div key={idx} className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>
                  €{band.threshold === Infinity ? `${band.startThreshold.toLocaleString()}+` : `${band.startThreshold.toLocaleString()} - €${band.threshold.toLocaleString()}`}: {band.rate.toFixed(0)}%
                </span>
                <span className="font-mono">€{band.taxInBand.toFixed(2)}</span>
              </div>
            ))}
            <div className="ml-2 flex justify-between border-t border-blue-200 pt-2 dark:border-blue-700 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <span>PAYE Tax (before credits)</span>
              <span className="font-mono">
                €{result.payeTaxBands.reduce((sum, band) => sum + band.taxInBand, 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tax Credits */}
          <div className="space-y-1 rounded-md bg-green-50 p-3 dark:bg-green-900 dark:bg-opacity-20">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Tax Credits Applied</p>
            <div className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Personal Credit</span>
              <span className="font-mono">€{result.taxCreditsApplied.personal.toFixed(2)}</span>
            </div>
            <div className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Earned Income Credit</span>
              <span className="font-mono">€{result.taxCreditsApplied.earned.toFixed(2)}</span>
            </div>
            {result.taxCreditsApplied.rental > 0 && (
              <div className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>Rental Relief</span>
                <span className="font-mono">€{result.taxCreditsApplied.rental.toFixed(2)}</span>
              </div>
            )}
            {result.taxCreditsApplied.medicalInsurance > 0 && (
              <div className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>Medical Insurance Relief</span>
                <span className="font-mono">€{result.taxCreditsApplied.medicalInsurance.toFixed(2)}</span>
              </div>
            )}
            <div className="ml-2 flex justify-between border-t border-green-200 pt-1 dark:border-green-700 text-sm font-semibold text-green-700 dark:text-green-400">
              <span>PAYE Tax (after credits)</span>
              <span className="font-mono">€{result.payeTax.toFixed(2)}</span>
            </div>
          </div>

          {/* USC Bands */}
          <div className="space-y-2 rounded-md bg-purple-50 p-3 dark:bg-purple-900 dark:bg-opacity-20">
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">USC (Universal Social Charge)</p>
            {result.uscBands.map((band, idx) => (
              <div key={idx} className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>
                  €{band.threshold === Infinity ? `${band.startThreshold.toLocaleString()}+` : `${band.startThreshold.toLocaleString()} - €${band.threshold.toLocaleString()}`}: {band.rate}%
                </span>
                <span className="font-mono">€{band.uscInBand.toFixed(2)}</span>
              </div>
            ))}
            <div className="ml-2 flex justify-between border-t border-purple-200 pt-2 dark:border-purple-700 text-sm font-semibold text-purple-700 dark:text-purple-400">
              <span>Total USC</span>
              <span className="font-mono">€{result.usc.toFixed(2)}</span>
            </div>
          </div>

          {/* PRSI */}
          <div className="space-y-1 rounded-md bg-orange-50 p-3 dark:bg-orange-900 dark:bg-opacity-20">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">PRSI (Social Insurance)</p>
            <div className="ml-2 flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Employee Rate: {result.prsiPercentUsed.toFixed(1)}%</span>
              <span className="font-mono">€{result.prsi.toFixed(2)}</span>
            </div>
          </div>

          {/* Total Deductions Summary */}
          <div className="rounded-md bg-red-50 p-3 dark:bg-red-900 dark:bg-opacity-20">
            <div className="flex justify-between border-b border-red-200 pb-2 dark:border-red-700">
              <span className="font-semibold text-red-700 dark:text-red-400">Total Deductions</span>
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                €{result.totalDeductions.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 rounded-md bg-blue-50 p-3 dark:bg-blue-900 dark:bg-opacity-20">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Effective Tax Rate</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatPercentage(result.effectiveTaxRate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Disposable Income / Month</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(result.monthlyNetSalary)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Simple View - Just Numbers */}
      {!showDetail && (
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">PAYE</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(result.payeTax)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">USC</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(result.usc)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">PRSI</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(result.prsi)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tax Rate</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatPercentage(result.effectiveTaxRate)}
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        * Calculations based on Irish 2026 tax year rates. Pension contributions reduce taxable income for PAYE.
        BIK and gross salary are subject to USC and PRSI.
      </p>
    </div>
  );
}
