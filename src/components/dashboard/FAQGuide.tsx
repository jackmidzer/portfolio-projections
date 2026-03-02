import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  ChevronDown,
  BookOpen,
  Calculator,
  TrendingUp,
  Landmark,
  Home,
  Receipt,
  PiggyBank,
  Clock,
  Shield,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
  icon: typeof HelpCircle;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // ── Getting Started ──
  {
    category: 'Getting Started',
    icon: BookOpen,
    question: 'How do I use this calculator?',
    answer: 'Fill in the sidebar form with your personal details, income, account balances, and retirement goals. The calculator will automatically project your wealth over time. Start with the Personal section (date of birth, target age), then Income (salary, bonus), Accounts (current balances and contribution rates), and finally Retirement settings (FIRE age, pension age, withdrawal rates).',
  },
  {
    category: 'Getting Started',
    icon: Calculator,
    question: 'What do the three phases mean?',
    answer: 'Your financial life is split into three phases:\n\n• Working Phase — You earn a salary, make contributions, and grow your accounts.\n• Bridging Phase — After your FIRE age, salary/contributions stop. You live off brokerage withdrawals until pension drawdown begins.\n• Drawdown Phase — From your pension age, you withdraw from your pension fund as your primary income source.',
  },
  {
    category: 'Getting Started',
    icon: TrendingUp,
    question: 'Why is the first year labelled "Pro-rated"?',
    answer: 'The simulation starts from the current month, not January. The first year only covers the remaining months until your next birthday, so contributions and growth are proportionally smaller. All subsequent years are full 12-month periods.',
  },

  // ── Contributions ──
  {
    category: 'Contributions',
    icon: PiggyBank,
    question: 'How do pension contribution limits work?',
    answer: 'Irish Revenue allows tax relief on pension contributions up to age-dependent percentages of your salary (capped at €115,000):\n\n• Under 30: 15%\n• 30–39: 20%\n• 40–49: 25%\n• 50–54: 30%\n• 55–59: 35%\n• 60+: 40%\n\nThe calculator automatically increases your contribution rate as you age. These changes take effect from January of the year you enter each bracket.',
  },
  {
    category: 'Contributions',
    icon: PiggyBank,
    question: 'What are employer pension contributions?',
    answer: 'Your employer also contributes to your pension based on age brackets. These are in addition to your own contributions and are also subject to age-based limits. Employer contribution percentages increase with age, typically starting at 5% for under-25s and reaching 20% for ages 55+.',
  },
  {
    category: 'Contributions',
    icon: Wallet,
    question: 'How does the bonus contribution work?',
    answer: 'If you receive an annual bonus (paid in December), you can allocate a percentage to each account. For pension, you can set it to follow the age-bracket percentages. The bonus is taxed at your marginal rate, and the net amount available for contribution reflects the incremental tax burden of the bonus on top of your regular salary.',
  },

  // ── Tax ──
  {
    category: 'Tax Rules',
    icon: Receipt,
    question: 'What is deemed disposal?',
    answer: 'Deemed disposal is an Irish tax rule specific to EU-domiciled ETFs. Every 8 years, you must pay 38% exit tax on any unrealised gains in your ETF holdings — even if you haven\'t sold anything. The cost basis resets after each deemed disposal event. This only affects the ETF portion of your brokerage account (set via the ETF allocation %).',
  },
  {
    category: 'Tax Rules',
    icon: Receipt,
    question: 'What is the difference between CGT and ETF exit tax?',
    answer: 'Stocks and non-EU ETFs in your brokerage are subject to Capital Gains Tax (CGT) at 33% when you sell at a profit. EU-domiciled ETFs are instead subject to exit tax at 38% on gains, with no loss offset and the deemed disposal rule applying every 8 years. The calculator splits your brokerage into stock/ETF portions based on your ETF allocation setting.',
  },
  {
    category: 'Tax Rules',
    icon: Receipt,
    question: 'How is DIRT calculated?',
    answer: 'DIRT (Deposit Interest Retention Tax) is charged at 33% on all interest earned in your Savings account. It is deducted automatically each month from your interest earnings.',
  },
  {
    category: 'Tax Rules',
    icon: Shield,
    question: 'What tax changes happen at age 65 and 66?',
    answer: 'At age 65, you receive an additional €245 annual tax credit that reduces your PAYE liability on pension income.\n\nAt age 66, you become exempt from PRSI (4.2375%) on pension withdrawal income, providing a meaningful tax reduction. This is also typically when the State Pension begins.',
  },

  // ── Withdrawals ──
  {
    category: 'Withdrawals',
    icon: AlertTriangle,
    question: 'What are forced minimum withdrawals?',
    answer: 'Irish regulations require minimum annual withdrawals from your ARF (Approved Retirement Fund) pension:\n\n• Ages 61–70: Minimum 4% per year\n• Ages 71+: Minimum 5% per year\n\nIf your chosen withdrawal rate is higher than the forced minimum, your rate applies instead. These minimums ensure pension funds are drawn down during retirement rather than accumulated indefinitely.',
  },
  {
    category: 'Withdrawals',
    icon: Landmark,
    question: 'How does the pension lump sum work?',
    answer: 'At your chosen pension lump sum age (minimum 50), you can withdraw 25% of your pension fund as a lump sum, capped at your maximum amount setting. Tax treatment:\n\n• First €200,000: Tax-free\n• €200,001–€500,000: Taxed at 20%\n• Above €500,000: Taxed at 40%\n\nThe net proceeds are distributed to your Savings and/or Brokerage accounts based on the lump sum distribution rate.',
  },
  {
    category: 'Withdrawals',
    icon: Landmark,
    question: 'How is pension drawdown income taxed?',
    answer: 'Pension withdrawals are taxed as income through PAYE (income tax), USC, and PRSI (if under 66). The calculator applies progressive tax bands to your total taxable pension income, including any State Pension. An age credit of €245 applies from age 65.',
  },

  // ── Pension ──
  {
    category: 'State Pension',
    icon: Clock,
    question: 'How does the State Pension work?',
    answer: 'The Irish State Pension (Contributory) currently pays €299.30 per week from age 66 (2026 rates). It is taxable income subject to PAYE and USC. During the bridging phase, the State Pension reduces how much you need to withdraw from your brokerage. During drawdown, it is combined with pension withdrawals for progressive tax calculation.',
  },
  {
    category: 'State Pension',
    icon: Clock,
    question: 'How are PRSI contributions tracked?',
    answer: 'Irish Revenue requires a minimum of 520 paid PRSI contributions (10 years) for any State Pension entitlement, and 2,080 contributions (40 years) for the full rate.\n\nThe calculator estimates your projected contribution count by assuming 52 contributions per year of PRSI-paying employment between now and your FIRE age. Full career breaks (0% salary) pause contributions; part-time breaks still count.\n\nYou can enter existing contributions already paid in the "Retirement Planning" form section. The PRSI Eligibility card on the dashboard and the inline indicator in the sidebar both flag if you fall short of the minimum or full threshold.',
  },

  // ── House ──
  {
    category: 'House Purchase',
    icon: Home,
    question: 'How is the house deposit calculated?',
    answer: 'The calculator projects house prices and your salary to your target purchase age. Maximum mortgage is calculated as:\n\n• With exemption: (salary + bonus ÷ 2) × 4.5\n• Without exemption: (salary + bonus ÷ 2) × 4\n\nThe deposit required is the house price minus the mortgage, capped at 90% LTV. Funds are withdrawn from your Savings and Brokerage accounts based on the deposit-from-brokerage rate setting. The brokerage portion is subject to CGT/exit tax on any gains.',
  },

  // ── Monte Carlo ──
  {
    category: 'Monte Carlo',
    icon: TrendingUp,
    question: 'What is Monte Carlo simulation?',
    answer: 'Monte Carlo simulation runs hundreds of randomised return scenarios to illustrate how uncertainty in annual returns affects your portfolio over time. Instead of a single deterministic line, it produces a fan of outcomes — showing the range of plausible futures based on a normal distribution of returns around your expected rate.',
  },
  {
    category: 'Monte Carlo',
    icon: TrendingUp,
    question: 'What do the probability bands mean?',
    answer: 'The chart displays five percentile lines from the simulation:\n\n• P10 / P90 — Outer band. Only 10% of simulated outcomes fell below P10 or above P90. This is the pessimistic/optimistic tail range.\n• P25 / P75 — Inner band (shaded). This is the interquartile range — 50% of all outcomes landed within this band.\n• Median (P50) — The middle outcome. Half of all simulations ended above this line and half below.\n\nA narrower fan indicates more predictable outcomes; a wider fan reflects greater uncertainty over a long horizon.',
  },
  {
    category: 'Monte Carlo',
    icon: TrendingUp,
    question: 'What does Return Volatility control?',
    answer: 'Return Volatility sets the standard deviation of annual returns used in the simulation. Each year, every simulation draws a return from a normal distribution centred on your account\'s expected return, with this figure as the spread.\n\nA lower value (e.g. 2%) produces a tighter fan — useful for conservative bond-heavy portfolios. A higher value (e.g. 15–20%) creates a wider fan reflecting the historical volatility of equity markets. The default of 2% is intentionally conservative; adjust upward to stress-test equity-heavy portfolios.',
  },
  {
    category: 'Monte Carlo',
    icon: TrendingUp,
    question: 'Why does the simulation show a different result each time?',
    answer: 'Each run generates fresh random return shocks, so the exact percentile values will vary slightly between runs — especially with a low simulation count. Increasing the number of simulations (e.g. to 1,000–2,000) reduces this variance and produces more stable bands. The Deterministic line (dashed grey) always matches the main projection chart and serves as a reference.',
  },

  // ── Charts ──
  {
    category: 'Charts & Tables',
    icon: TrendingUp,
    question: 'What do the dashed lines on the chart mean?',
    answer: 'Dashed vertical lines on the charts mark key financial events at specific ages — such as your house purchase, FIRE date, pension lump sum withdrawal, deemed disposal events, State Pension start, and forced withdrawal rate changes. Hover over the labels to see which event each line represents.',
  },
  {
    category: 'Charts & Tables',
    icon: TrendingUp,
    question: 'What do the coloured badges on the table mean?',
    answer: 'Coloured badges in the Year-by-Year table indicate financial events at that age. Green badges show contribution changes, orange/amber show tax events (like deemed disposal), blue show pension events, purple show milestones (like FIRE), and red show withdrawal rule changes. Hover over any badge for a detailed explanation.',
  },
];

// Group FAQ items by category
function groupByCategory(items: FAQItem[]): Map<string, FAQItem[]> {
  const map = new Map<string, FAQItem[]>();
  for (const item of items) {
    const existing = map.get(item.category) ?? [];
    existing.push(item);
    map.set(item.category, existing);
  }
  return map;
}

export function FAQGuide() {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const grouped = groupByCategory(FAQ_ITEMS);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          How to Use This Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Frequently asked questions about the calculator, Irish tax rules, and financial events.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
              <div className="space-y-1">
                {items.map((item, idx) => {
                  const key = `${category}-${idx}`;
                  const isOpen = expandedItem === key;
                  const Icon = item.icon;
                  return (
                    <div key={key} className="border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedItem(isOpen ? null : key)}
                        className="w-full text-left flex items-center justify-between gap-2 p-3 hover:bg-accent/50 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium">{item.question}</span>
                        </div>
                        <ChevronDown className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                          isOpen && 'rotate-180',
                        )} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-0">
                              <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border pt-2">
                                {item.answer}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
