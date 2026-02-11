import { useState } from 'react';
import InputForm from './components/InputForm';
import AccountSummary from './components/AccountSummary';
import PortfolioChart from './components/PortfolioChart';
import ResultsTable from './components/ResultsTable';
import { PortfolioInputs, PortfolioResults } from './types';
import { calculatePortfolioGrowth } from './utils/calculations';

function App() {
  const [results, setResults] = useState<PortfolioResults | null>(null);

  const handleCalculate = (inputs: PortfolioInputs) => {
    const timeHorizon = inputs.targetAge - inputs.currentAge + 1;
    const calculatedResults = calculatePortfolioGrowth(
      inputs.accounts,
      timeHorizon,
      inputs.currentAge,
      inputs.currentSalary,
      inputs.annualSalaryIncrease,
      inputs.monthsUntilNextBirthday,
      inputs.dateOfBirth,
      inputs.pensionAge,
      inputs.withdrawalRate,
      inputs.earlyRetirementAge,
      inputs.salaryReplacementRate,
      inputs.pensionLumpSumAge,
      inputs.lumpSumToBrokerageRate,
      inputs.useSalaryReplacementForPension,
      inputs.bonusPercent,
      inputs.houseWithdrawalAge,
      inputs.enableHouseWithdrawal,
      inputs.houseDepositPercent,
      inputs.houseDepositFromBrokerageRate,
      inputs.enablePensionLumpSum
    );
    setResults(calculatedResults);
    
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-block mb-4">
            <div className="text-5xl mb-3">📈</div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight">
            Portfolio Projections
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Advanced financial planning tool. Project your wealth growth across multiple investment accounts with precision.
          </p>
        </header>

        {/* Input Form */}
        <div className="mb-16">
          <InputForm onCalculate={handleCalculate} />
        </div>

        {/* Results Section */}
        {results && (
          <div id="results" className="space-y-12">
            <div className="pt-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span>📊</span> Your Projections
              </h2>
            </div>
            <AccountSummary results={results} />
            <PortfolioChart results={results} />
            <ResultsTable results={results} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-12 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p className="mb-2">
            ⚠️ This is an educational calculator demonstrating compound interest and financial projections.
          </p>
          <p>
            Results are estimates based on your inputs and do not constitute professional financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
