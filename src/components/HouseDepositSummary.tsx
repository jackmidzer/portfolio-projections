import React from 'react';
import { HouseDepositCalculation } from '../types';
import { formatCurrency } from '../utils/formatters';

interface HouseDepositSummaryProps {
  age: number;
  houseMetrics: HouseDepositCalculation;
  mortgageExemption?: boolean;
}

const HouseDepositSummary: React.FC<HouseDepositSummaryProps> = ({ age, houseMetrics, mortgageExemption = true }) => {
  const formulaText = mortgageExemption 
    ? '(salary + bonus ÷ 2) × 4.5 (first time buyer with exemption)'
    : '(salary + bonus ÷ 2) × 4 (standard first time buyer terms)';
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">House Purchase Summary at Age {age}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-1">Projected Salary</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(houseMetrics.projectedSalary)}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-1">Average House Price</p>
          <p className="text-xl font-bold text-amber-900">{formatCurrency(houseMetrics.projectedHousePrice)}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-cyan-800 mb-1">Maximum Mortgage</p>
          <p className="text-xl font-bold text-cyan-900">{formatCurrency(houseMetrics.projectedMortgage)}</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-rose-800 mb-1">Deposit Required</p>
          <p className="text-xl font-bold text-rose-900">{formatCurrency(houseMetrics.depositRequired)}</p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-teal-800 mb-1">Loan-to-Value</p>
          <p className="text-xl font-bold text-teal-900">{houseMetrics.loanToValuePercent.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> The mortgage is calculated as {formulaText}. 
          This represents the maximum amount a bank will lend based on your projected income at age {age}. 
          The deposit required covers the difference between the house price and this mortgage amount.
        </p>
      </div>
    </div>
  );
};

export default HouseDepositSummary;
