import { useState } from 'react';
import { Eye, EyeOff, Trash2, Copy, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { type SavedScenario, useProjectionStore } from '@/store/useProjectionStore';
import { PortfolioResults } from '@/types';
import { formatCurrency, deflate } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface ScenarioComparisonProps {
  currentResults: PortfolioResults;
  scenarios: SavedScenario[];
  visibleScenarioIds: string[];
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  showRealValues?: boolean;
  inflationRate?: number;
  currentAge?: number;
}

export function ScenarioComparison({
  currentResults,
  scenarios,
  visibleScenarioIds,
  onToggleVisibility,
  onDelete,
  showRealValues,
  inflationRate = 2.5,
  currentAge,
}: ScenarioComparisonProps) {
  const duplicateScenario = useProjectionStore(s => s.duplicateScenario);
  const loadScenario = useProjectionStore(s => s.loadScenario);
  const saveScenario = useProjectionStore(s => s.saveScenario);

  const [scenarioLabel, setScenarioLabel] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = () => {
    if (!showSaveInput) {
      setShowSaveInput(true);
      return;
    }
    const label = scenarioLabel.trim() || `Scenario ${new Date().toLocaleTimeString()}`;
    saveScenario(label);
    setScenarioLabel('');
    setShowSaveInput(false);
  };

  const startAge = currentResults.accountResults[0]?.yearlyData[0]?.age;
  const endAge = currentResults.accountResults[0]?.yearlyData.slice(-1)[0]?.age ?? 75;
  const effectiveCurrentAge = currentAge ?? startAge ?? 0;
  const yearsToEnd = endAge - effectiveCurrentAge;

  const adj = (value: number) =>
    showRealValues ? deflate(value, yearsToEnd, inflationRate) : value;

  const subtitle = showRealValues ? '(Real €)' : '(Nominal €)';

  const currentFinal = adj(currentResults.totalFinalBalance);
  const currentContributions = adj(currentResults.totalContributions);
  const currentInterest = adj(currentResults.totalInterest);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Scenario Comparison <span className="text-sm font-normal text-muted-foreground">{subtitle}</span>
        </h3>
        <Badge variant="outline">{scenarios.length} saved</Badge>
      </div>

      {/* Save current scenario */}
      <div className="flex gap-2">
        {showSaveInput && (
          <Input
            placeholder="Scenario name…"
            value={scenarioLabel}
            onChange={(e) => setScenarioLabel(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
            autoFocus
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={showSaveInput ? 'shrink-0' : 'w-full'}
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Scenario
        </Button>
      </div>

      {/* Current scenario baseline */}
      <Card className="border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="default">Current</Badge>
            Active Projection
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Final Balance</span>
              <p className="font-bold tabular-nums">{formatCurrency(currentFinal)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Contributions</span>
              <p className="font-medium tabular-nums">{formatCurrency(currentContributions)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Interest</span>
              <p className="font-medium tabular-nums">{formatCurrency(currentInterest)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved scenarios */}
      {scenarios.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No saved scenarios yet. Use the <strong>Save Scenario</strong> button to snapshot the current projection and compare it against future changes.
        </p>
      )}
      <div className="space-y-3">
        {scenarios.map((scenario) => {
          const isVisible = visibleScenarioIds.includes(scenario.id);
          const scenarioResults = scenario.results;

          if (!scenarioResults) {
            return (
              <Card key={scenario.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{scenario.label}</span>
                    <span className="text-xs text-muted-foreground">No results</span>
                  </div>
                </CardContent>
              </Card>
            );
          }

          const scenFinal = adj(scenarioResults.totalFinalBalance);
          const scenContributions = adj(scenarioResults.totalContributions);
          const scenInterest = adj(scenarioResults.totalInterest);

          const deltaFinal = currentFinal - scenFinal;
          const deltaContributions = currentContributions - scenContributions;
          const deltaInterest = currentInterest - scenInterest;

          return (
            <Card key={scenario.id} className={cn(isVisible && 'ring-1 ring-primary/30')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="secondary">{scenario.label}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onToggleVisibility(scenario.id)}
                      title={isVisible ? 'Hide from charts' : 'Show on charts'}
                    >
                      {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => loadScenario(scenario.id)}
                      title="Load this scenario"
                    >
                      <span className="text-xs font-medium">↩</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => duplicateScenario(scenario.id)}
                      title="Duplicate scenario"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDelete(scenario.id)}
                      title="Delete scenario"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <MetricCell
                    label="Final Balance"
                    value={scenFinal}
                    delta={deltaFinal}
                  />
                  <MetricCell
                    label="Contributions"
                    value={scenContributions}
                    delta={deltaContributions}
                  />
                  <MetricCell
                    label="Interest"
                    value={scenInterest}
                    delta={deltaInterest}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({ label, value, delta }: { label: string; value: number; delta: number }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-bold tabular-nums">{formatCurrency(value)}</p>
      {delta !== 0 && (
        <span className={cn(
          'text-xs tabular-nums',
          isPositive && 'text-emerald-600 dark:text-emerald-400',
          isNegative && 'text-red-500',
        )}>
          {isPositive ? '+' : ''}{formatCurrency(delta)}
        </span>
      )}
    </div>
  );
}
