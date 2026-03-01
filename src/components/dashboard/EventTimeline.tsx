import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Flame,
  Landmark,
  Receipt,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Clock,
  Shield,
  Wallet,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PortfolioResults, AccountInput } from '@/types';
import {
  generateLifecycleEvents,
  getEventCategoryColor,
  type LifecycleEvent,
  type EventCategory,
} from '@/utils/eventHelpers';

interface EventTimelineProps {
  results: PortfolioResults;
  accounts: AccountInput[];
  currentAge: number;
  targetAge: number;
  enableHouseWithdrawal?: boolean;
  houseWithdrawalAge?: number;
  enablePensionLumpSum?: boolean;
  pensionLumpSumAge?: number;
  pensionLumpSumMaxAmount?: number;
  includeStatePension?: boolean;
  statePensionAge?: number;
  statePensionWeeklyAmount?: number;
  withdrawalRate?: number;
}

const ICON_MAP: Record<LifecycleEvent['icon'], typeof Home> = {
  house: Home,
  fire: Flame,
  pension: Landmark,
  tax: Receipt,
  piggy: PiggyBank,
  trending: TrendingUp,
  alert: AlertTriangle,
  clock: Clock,
  shield: Shield,
  wallet: Wallet,
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  contribution: 'Contributions',
  withdrawal: 'Withdrawals',
  tax: 'Tax',
  milestone: 'Milestones',
  pension: 'Pension',
  house: 'House',
};

export function EventTimeline({
  results,
  accounts,
  currentAge,
  targetAge,
  enableHouseWithdrawal,
  houseWithdrawalAge,
  enablePensionLumpSum,
  pensionLumpSumAge,
  pensionLumpSumMaxAmount,
  includeStatePension,
  statePensionAge,
  statePensionWeeklyAmount,
  withdrawalRate,
}: EventTimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<EventCategory>>(new Set());

  const events = useMemo(
    () =>
      generateLifecycleEvents(results, accounts, currentAge, targetAge, {
        enableHouseWithdrawal,
        houseWithdrawalAge,
        enablePensionLumpSum,
        pensionLumpSumAge,
        pensionLumpSumMaxAmount,
        includeStatePension,
        statePensionAge,
        statePensionWeeklyAmount,
        withdrawalRate,
      }),
    [results, accounts, currentAge, targetAge, enableHouseWithdrawal, houseWithdrawalAge, enablePensionLumpSum, pensionLumpSumAge, pensionLumpSumMaxAmount, includeStatePension, statePensionAge, statePensionWeeklyAmount, withdrawalRate],
  );

  // Unique categories present
  const categories = useMemo(() => {
    const cats = new Set<EventCategory>();
    events.forEach(e => cats.add(e.category));
    return Array.from(cats);
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeFilters.size === 0) return events;
    return events.filter(e => activeFilters.has(e.category));
  }, [events, activeFilters]);

  const toggleFilter = (cat: EventCategory) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (events.length === 0) return null;

  // Group by age for the vertical timeline
  const grouped = useMemo(() => {
    const map = new Map<number, LifecycleEvent[]>();
    for (const e of filteredEvents) {
      const existing = map.get(e.age) ?? [];
      existing.push(e);
      map.set(e.age, existing);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredEvents]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Financial Events Timeline
          </CardTitle>
          <span className="text-xs text-muted-foreground">{events.length} events from age {currentAge} → {targetAge}</span>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          <button
            type="button"
            onClick={() => setActiveFilters(new Set())}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors',
              activeFilters.size === 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <Filter className="h-3 w-3" />
            All
          </button>
          {categories.map(cat => {
            const colors = getEventCategoryColor(cat);
            const active = activeFilters.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleFilter(cat)}
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                  active
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {grouped.map(([age, ageEvents]) => (
              <div key={age} className="relative">
                {/* Age marker */}
                <div className="relative pl-10 mb-1">
                  <div className="absolute left-2 top-1 h-5 w-5 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary">{age}</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">Age {age}</span>
                </div>

                {/* Events at this age */}
                {ageEvents.map((event, idx) => {
                  const eventKey = `${event.age}-${event.title}-${idx}`;
                  const isExpanded = expandedEvent === eventKey;
                  const Icon = ICON_MAP[event.icon];
                  const colors = getEventCategoryColor(event.category);

                  return (
                    <div key={eventKey} className="relative pl-10">
                      {/* Dot on timeline */}
                      <div className={cn(
                        'absolute left-[11px] top-3 h-2.5 w-2.5 rounded-full border',
                        colors.bg,
                        colors.border,
                      )} />

                      <button
                        type="button"
                        onClick={() => setExpandedEvent(isExpanded ? null : eventKey)}
                        className="w-full text-left rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', colors.text)} />
                            <span className="text-sm font-medium truncate">{event.title}</span>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0 flex-shrink-0', colors.bg, colors.text, colors.border)}
                            >
                              {CATEGORY_LABELS[event.category]}
                            </Badge>
                          </div>
                          <ChevronDown className={cn(
                            'h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0',
                            isExpanded && 'rotate-180',
                          )} />
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
                            <div className="px-2.5 pb-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {event.description}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
