import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PortfolioResults, AccountType } from '../types';
import { combineYearlyData } from '../utils/calculations';
import { formatCompactCurrency } from '../utils/formatters';

interface PortfolioChartProps {
  results: PortfolioResults;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ results }) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | 'All'>('All');

  const allData = combineYearlyData(results.accountResults);
  
  // Filter data based on selected account
  const data = selectedAccount === 'All' 
    ? allData
    : allData.map((entry) => ({
        age: entry.age,
        [selectedAccount]: entry[selectedAccount as keyof typeof entry],
      }));
  
  const isFirstYearProRated = results.monthsUntilNextBirthday < 12;

  const colors = {
    Savings: '#3b82f6',
    Pension: '#10b981',
    Brokerage: '#a855f7',
    Total: '#1f2937',
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Determine if this is the first data point (year 0) and it's pro-rated
      const isProRatedDataPoint = isFirstYearProRated && data[0]?.age === label;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">Age {label}
            {isProRatedDataPoint && (
              <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-1 rounded">Pro-rated ({results.monthsUntilNextBirthday} months)</span>
            )}
          </p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between items-center gap-4 text-sm">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatCompactCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const accountNames = selectedAccount === 'All' 
      ? results.accountResults.map((r) => r.accountName)
      : [selectedAccount];

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="age"
              label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
            />
            <YAxis
              tickFormatter={(value) => formatCompactCurrency(value)}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {accountNames.map((name) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                stackId={selectedAccount === 'All' ? '1' : undefined}
                stroke={colors[name]}
                fill={colors[name]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="age"
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            tickFormatter={(value) => formatCompactCurrency(value)}
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {showTotal && selectedAccount === 'All' && (
            <Line
              type="monotone"
              dataKey="Total"
              stroke={colors.Total}
              strokeWidth={3}
              dot={false}
            />
          )}
          {accountNames.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colors[name]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Portfolio Growth</h2>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value as AccountType | 'All')}
            className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="All">All Accounts</option>
            {results.accountResults.map((result) => (
              <option key={result.accountName} value={result.accountName}>
                {result.accountName}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                chartType === 'area'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Area Chart
            </button>
          </div>
        </div>
      </div>

      {chartType === 'line' && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showTotal}
              onChange={(e) => setShowTotal(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Show Total Portfolio Line</span>
          </label>
        </div>
      )}

      {renderChart()}
    </div>
  );
};

export default PortfolioChart;
