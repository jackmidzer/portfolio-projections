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
  ReferenceLine,
} from 'recharts';
import { PortfolioResults, AccountType } from '../types';
import { combineYearlyData } from '../utils/calculations';
import { formatCompactCurrency, getMonthsUntilYearEnd } from '../utils/formatters';

interface PortfolioChartProps {
  results: PortfolioResults;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ results }) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | 'All'>('All');
  const [showPrincipalInterest, setShowPrincipalInterest] = useState<boolean>(false);

  const allData = combineYearlyData(results.accountResults);
  
  // Filter data based on selected account and principal/interest view
  let data;
  if (showPrincipalInterest) {
    if (selectedAccount === 'All') {
      // Show total principal and interest breakdown
      data = allData;
    } else {
      // Show principal and interest for the selected account
      const accountResult = results.accountResults.find(r => r.accountName === selectedAccount);
      data = allData.map((entry, index) => {
        const yearData = accountResult?.yearlyData[index];
        if (!yearData) return { age: entry.age };
        
        // Calculate cumulative contributions and interest for this account
        // Principal = sum of all contributions up to this year
        // Interest = sum of all interest earned up to this year
        let accountPrincipal = 0;
        let accountInterest = 0;
        for (let y = 0; y <= index; y++) {
          accountPrincipal += accountResult.yearlyData[y]?.contributions || 0;
          accountInterest += accountResult.yearlyData[y]?.interestEarned || 0;
        }
        
        return {
          age: entry.age,
          Principal: accountPrincipal,
          Interest: accountInterest,
        };
      });
    }
  } else if (selectedAccount === 'All') {
    data = allData;
  } else {
    data = allData.map((entry) => ({
      age: entry.age,
      [selectedAccount]: entry[selectedAccount as keyof typeof entry],
    }));
  }
  
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
      const monthsUntilYearEnd = getMonthsUntilYearEnd();
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">Age {label}
            {isProRatedDataPoint && (
              <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-1 rounded">Pro-rated ({monthsUntilYearEnd} months)</span>
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

  // Custom shape for shortened reference lines relative to data height with labels
  const ShortenedReferenceLineWithLabel = (labelText: string, color: string, age: number, duplicateIndex: number = 0) => (props: any) => {
    const { x1, y1, y2, stroke, strokeDasharray } = props;
    const lineHeight = y2 - y1;
    
    // Find the data entry at this age to get the actual value
    const dataAtAge = data.find(d => d.age === age);
    if (!dataAtAge) {
      return <></>;
    }
    
    // Get the value (Total, selected account, or principal/interest)
    let value = 0;
    if (showPrincipalInterest) {
      value = (dataAtAge.Principal || 0) + (dataAtAge.Interest || 0);
    } else if (selectedAccount === 'All') {
      value = dataAtAge.Total || 0;
    } else {
      value = dataAtAge[selectedAccount as keyof typeof dataAtAge] || 0;
    }
    
    // Find max value in data to scale the line
    const maxValue = Math.max(
      ...data.map((d) => {
        if (showPrincipalInterest) {
          return (d.Principal || 0) + (d.Interest || 0);
        } else if (selectedAccount === 'All') {
          return d.Total || 0;
        } else {
          return d[selectedAccount as keyof typeof d] || 0;
        }
      })
    );
    
    // Calculate the line height relative to the data value
    const valueRatio = value / (maxValue * 2);
    const shortenedY2 = (y2 - lineHeight * (1 - valueRatio)) - 100;
    
    // Collect all milestone ages to detect overlapping labels
    const milestoneAges = [
      results.earlyRetirementAge,
      ...(results.enablePensionLumpSum !== false && results.pensionLumpSumAge !== undefined
        ? [results.pensionLumpSumAge]
        : []),
      results.pensionAge,
      ...(results.enableHouseWithdrawal && results.houseWithdrawalAge !== undefined 
        ? [results.houseWithdrawalAge] 
        : [])
    ];
    
    // Check if this age is close to other ages (within 4 years)
    const otherAges = milestoneAges.filter(a => a !== age);
    const closeAges = otherAges.filter(a => Math.abs(a - age) <= 4);
    const sameAges = milestoneAges.filter(a => a === age);
    
    let labelYOffset = 0;
    
    if (sameAges.length > 1) {
      // Multiple milestones at the same age - use duplicateIndex to alternate offsets
      if (closeAges.length > 0) {
        // If there are also nearby ages, use larger offsets for same-age milestones
        labelYOffset = duplicateIndex % 2 === 0 ? -30 : 30;
      } else {
        // Only same ages, standard offset
        labelYOffset = duplicateIndex % 2 === 0 ? -20 : 20;
      }
    } else if (closeAges.length > 0) {
      // Single milestone with nearby ages
      const hasYoungerClose = closeAges.some(a => a < age);
      const hasOlderClose = closeAges.some(a => a > age);
      
      if (hasYoungerClose && !hasOlderClose) {
        labelYOffset = -20; // Offset down
      } else if (hasOlderClose && !hasYoungerClose) {
        labelYOffset = 20; // Offset up
      } else {
        // Both younger and older nearby, alternate
        labelYOffset = age % 2 === 0 ? -20 : 20;
      }
    }
    
    return (
      <g>
        <line
          x1={x1}
          y1={y1}
          x2={x1}
          y2={shortenedY2 + labelYOffset}
          stroke={stroke}
          strokeDasharray={strokeDasharray}
        />
        <text
          x={x1}
          y={shortenedY2 + labelYOffset}
          fill={color}
          fontSize={12}
          textAnchor="middle"
        >
          {labelText}
        </text>
      </g>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 0 },
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
            {/* Phase transition reference lines */}
            {/* Working Phase ends / Early Retirement Phase begins */}
            <ReferenceLine
              x={results.earlyRetirementAge}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              shape={ShortenedReferenceLineWithLabel(`Stop Working (${results.earlyRetirementAge})`, '#d97706', results.earlyRetirementAge, 0)}
            />
            {/* Early Retirement Phase ends / Pension Phase begins */}
            <ReferenceLine
              x={results.pensionAge}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              shape={ShortenedReferenceLineWithLabel(`Access Pension (${results.pensionAge})`, '#f59e0b', results.pensionAge, results.pensionAge === results.earlyRetirementAge ? 1 : 0)}
            />
            {results.enablePensionLumpSum !== false && results.pensionLumpSumAge !== undefined && (
              <ReferenceLine
                x={results.pensionLumpSumAge}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                shape={ShortenedReferenceLineWithLabel(`Lump Sum (${results.pensionLumpSumAge})`, '#f59e0b', results.pensionLumpSumAge, [results.earlyRetirementAge, results.pensionAge].filter(a => a === results.pensionLumpSumAge).length)}
              />
            )}
            {results.enableHouseWithdrawal && results.houseWithdrawalAge !== undefined && (
              <ReferenceLine
                x={results.houseWithdrawalAge}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                shape={ShortenedReferenceLineWithLabel(`House Purchase (${results.houseWithdrawalAge})`, '#f59e0b', results.houseWithdrawalAge, [results.earlyRetirementAge, results.pensionAge].filter(a => a === results.houseWithdrawalAge).length)}
              />
            )}
            {showPrincipalInterest ? (
              <>
                <Area
                  type="monotone"
                  dataKey="Principal"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="Interest"
                  stackId="1"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.8}
                />
              </>
            ) : (
              accountNames.map((name) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stackId={selectedAccount === 'All' ? '1' : undefined}
                  stroke={colors[name]}
                  fill={colors[name]}
                  fillOpacity={0.6}
                />
              ))
            )}
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
          <ReferenceLine
            x={results.earlyRetirementAge}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            shape={ShortenedReferenceLineWithLabel(`Stop Working (${results.earlyRetirementAge})`, '#d97706', results.earlyRetirementAge, 0)}
          />
          <ReferenceLine
            x={results.pensionAge}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            shape={ShortenedReferenceLineWithLabel(`Access Pension (${results.pensionAge})`, '#f59e0b', results.pensionAge, results.pensionAge === results.earlyRetirementAge ? 1 : 0)}
          />
          {results.enablePensionLumpSum !== false && results.pensionLumpSumAge !== undefined && (
            <ReferenceLine
              x={results.pensionLumpSumAge}
              stroke="#8b5cf6"
              strokeDasharray="5 5"
              shape={ShortenedReferenceLineWithLabel(`Lump Sum (${results.pensionLumpSumAge})`, '#8b5cf6', results.pensionLumpSumAge, [results.earlyRetirementAge, results.pensionAge].filter(a => a === results.pensionLumpSumAge).length)}
            />
          )}
          {results.enableHouseWithdrawal && results.houseWithdrawalAge !== undefined && (
            <ReferenceLine
              x={results.houseWithdrawalAge}
              stroke="#ec4899"
              strokeDasharray="5 5"
              shape={ShortenedReferenceLineWithLabel(`House Purchase (${results.houseWithdrawalAge})`, '#ec4899', results.houseWithdrawalAge, [results.earlyRetirementAge, results.pensionAge].filter(a => a === results.houseWithdrawalAge).length)}
            />
          )}
          {showTotal && selectedAccount === 'All' && !showPrincipalInterest && (
            <Line
              type="monotone"
              dataKey="Total"
              stroke={colors.Total}
              strokeWidth={3}
              dot={false}
            />
          )}
          {showPrincipalInterest ? (
            <>
              <Line
                type="monotone"
                dataKey="Principal"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Interest"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
            </>
          ) : (
            accountNames.map((name) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colors[name]}
                strokeWidth={2}
                dot={false}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Growth Over Time</h2>
        
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

          <div className="flex gap-2">
            <button
              onClick={() => setShowPrincipalInterest(false)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                !showPrincipalInterest
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Total Value
            </button>
            <button
              onClick={() => setShowPrincipalInterest(true)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                showPrincipalInterest
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Deposits vs Growth
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
            <span className="text-sm font-medium text-gray-700">Show Total Line</span>
          </label>
        </div>
      )}

      {renderChart()}
    </div>
  );
};

export default PortfolioChart;
