import { Home, Clock, Landmark, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PortfolioResults, MilestoneSnapshot } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { toBadgeVariant } from '@/utils/badgeVariant';
import { cn } from '@/lib/utils';

interface MilestoneTimelineProps {
  results: PortfolioResults;
}

interface MilestoneItem {
  id: string;
  label: string;
  icon: typeof Home;
  snapshot: MilestoneSnapshot;
  color: string;
}

export function MilestoneTimeline({ results }: MilestoneTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const milestones: MilestoneItem[] = [];

  if (results.houseWithdrawalAgeSnapshot) {
    milestones.push({
      id: 'house',
      label: 'House Purchase',
      icon: Home,
      snapshot: results.houseWithdrawalAgeSnapshot,
      color: 'text-amber-500',
    });
  }

  if (results.fireSnapshot) {
    milestones.push({
      id: 'fire',
      label: 'FIRE',
      icon: Clock,
      snapshot: results.fireSnapshot,
      color: 'text-emerald-500',
    });
  }

  if (results.pensionDrawdownSnapshot) {
    milestones.push({
      id: 'pension-drawdown',
      label: 'Pension Drawdown',
      icon: Landmark,
      snapshot: results.pensionDrawdownSnapshot,
      color: 'text-blue-500',
    });
  }

  if (milestones.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Milestones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {milestones.map((milestone) => {
              const Icon = milestone.icon;
              const isExpanded = expanded === milestone.id;
              return (
                <div key={milestone.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-2 top-3 h-5 w-5 rounded-full border-2 bg-background flex items-center justify-center",
                    isExpanded ? "border-primary" : "border-muted-foreground/30"
                  )}>
                    <Icon className={cn("h-3 w-3", milestone.color)} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : milestone.id)}
                    className="w-full text-left rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${milestone.label} milestone`}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{milestone.label}</span>
                        <Badge variant="outline" className="text-xs">Age {milestone.snapshot.age}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(milestone.snapshot.totalBalance)}
                        </span>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-3">
                          {/* Summary stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Contributions</p>
                              <p className="text-sm font-semibold tabular-nums">{formatCurrency(milestone.snapshot.totalContributions)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Interest</p>
                              <p className="text-sm font-semibold tabular-nums">{formatCurrency(milestone.snapshot.totalInterest)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-sm font-semibold tabular-nums">{formatCurrency(milestone.snapshot.totalBalance)}</p>
                            </div>
                          </div>

                          {/* Account breakdown */}
                          <div className="space-y-2">
                            {milestone.snapshot.accountBalances.map(account => {
                              const variant = toBadgeVariant(account.accountName);
                              return (
                                <div key={account.accountName} className="flex items-center justify-between text-sm">
                                  <Badge variant={variant} className="text-xs">
                                    {account.accountName}
                                  </Badge>
                                  <span className="font-medium tabular-nums">{formatCurrency(account.finalBalance)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
