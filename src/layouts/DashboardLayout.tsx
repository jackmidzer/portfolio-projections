import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft, Menu, TrendingUp, Share2, Check, Calculator, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SidebarForm } from '@/components/form/SidebarForm';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { NegativeBalanceBanner } from '@/components/dashboard/NegativeBalanceBanner';
import { useProjectionStore } from '@/store/useProjectionStore';
import { useAutoCalculate } from '@/hooks/useAutoCalculate';
import { cn } from '@/lib/utils';
import { compressToEncodedURIComponent } from 'lz-string';
import type { FormInputs } from '@/store/useProjectionStore';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const results = useProjectionStore(s => s.results);
  const isCalculating = useProjectionStore(s => s.isCalculating);
  const resetForm = useProjectionStore(s => s.resetForm);
  const validationErrors = useProjectionStore(s => s.validationErrors);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  useAutoCalculate();

  const handleShare = useCallback(() => {
    const state = useProjectionStore.getState();
    // Extract only FormInputs fields for serialisation
    const formKeys: (keyof FormInputs)[] = [
      'dateOfBirth', 'targetAge', 'currentSalary', 'annualSalaryIncrease',
      'bonusPercent', 'taxBikValue', 'accounts', 'pensionAge', 'fireAge',
      'withdrawalRate', 'salaryReplacementRate', 'enablePensionLumpSum',
      'pensionLumpSumAge', 'pensionLumpSumMaxAmount', 'lumpSumToBrokerageRate',
      'enableHouseWithdrawal', 'houseWithdrawalAge', 'houseDepositFromBrokerageRate',
      'mortgageExemption', 'baseHousePrice', 'houseAnnualPriceIncrease',
      'includeStatePension', 'statePensionAge', 'statePensionWeeklyAmount',
    ];
    const inputs: Partial<FormInputs> = {};
    for (const key of formKeys) {
      (inputs as any)[key] = (state as any)[key];
    }
    const json = JSON.stringify(inputs);
    const compressed = compressToEncodedURIComponent(json);
    const url = new URL(window.location.href);
    url.searchParams.set('s', compressed);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 0 : 380 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col border-r bg-sidebar overflow-hidden flex-shrink-0"
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm truncate">Wealth Projections</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <SidebarForm formId="desktop-sidebar-form" />
          </div>
        </ScrollArea>
        <div className="flex gap-2 h-14 px-4 items-center border-t border-sidebar-border bg-sidebar flex-shrink-0">
          <Button
            type="submit"
            form="desktop-sidebar-form"
            className="flex-1"
            variant="outline"
            size="sm"
            disabled={hasValidationErrors || isCalculating}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resetForm()}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </motion.aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="relative flex items-center justify-between border-b px-4 h-14 bg-background flex-shrink-0">
          {isCalculating && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 overflow-hidden">
              <div className="h-full bg-primary animate-pulse" />
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Desktop sidebar expand button */}
            <AnimatePresence>
              {sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex h-9 w-9"
                    onClick={() => setSidebarCollapsed(false)}
                    aria-label="Expand sidebar"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-5 w-5 text-primary", !sidebarCollapsed && "lg:hidden")} />
              <h1 className={cn("font-semibold text-lg", !sidebarCollapsed && "lg:hidden")}>
                Wealth Projections
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {results && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleShare}
                aria-label="Share projection"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <NegativeBalanceBanner />
          <div className="p-6 max-w-7xl mx-auto">
            {results ? (
              <DashboardContent />
            ) : (
              <EmptyState onOpenSidebar={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen(true);
                } else {
                  setSidebarCollapsed(false);
                }
              }} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t px-4 h-14 bg-background flex-shrink-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            This calculator is a planning tool, not professional financial advice. Results are estimates based on your inputs.
          </p>
        </footer>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[340px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Wealth Projections
            </SheetTitle>
            <SheetDescription>Configure your financial projections</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100dvh-180px)] pb-[env(safe-area-inset-bottom)]">
            <div className="p-4">
              <SidebarForm formId="mobile-sidebar-form" onCalculated={() => setMobileOpen(false)} />
            </div>
          </ScrollArea>
          <div className="flex gap-2 p-4 border-t bg-background flex-shrink-0">
            <Button
              type="submit"
              form="mobile-sidebar-form"
              className="flex-1"
              variant="outline"
              size="sm"
              disabled={hasValidationErrors || isCalculating}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resetForm()}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyState({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="rounded-full bg-muted p-6 mb-6">
        <TrendingUp className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Welcome to Wealth Projections</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        See how your investments could grow over time. Configure your details in the sidebar and calculate your projections.
      </p>
      <Button onClick={onOpenSidebar} size="lg">
        <PanelLeft className="h-4 w-4 mr-2" />
        Open Calculator
      </Button>
    </motion.div>
  );
}
