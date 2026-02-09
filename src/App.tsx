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
      inputs.salaryReplacementRate
    );
    setResults(calculatedResults);
    
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Portfolio Projections
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Plan your financial future with compound interest projections across multiple accounts
          </p>
        </header>

        {/* Input Form */}
        <div className="mb-12">
          <InputForm onCalculate={handleCalculate} />
        </div>

        {/* Results Section */}
        {results && (
          <div id="results" className="space-y-8">
            <AccountSummary results={results} />
            <PortfolioChart results={results} />
            <ResultsTable results={results} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>
            This is an MVP calculator for educational purposes. Results are projections based on
            your inputs and do not constitute financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
