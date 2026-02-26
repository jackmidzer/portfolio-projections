import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft, Menu, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SidebarForm } from '@/components/form/SidebarForm';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { useProjectionStore } from '@/store/useProjectionStore';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const results = useProjectionStore(s => s.results);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 0 : 380 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col border-r bg-sidebar overflow-hidden flex-shrink-0"
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm truncate">Wealth Projections</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setSidebarCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <SidebarForm />
          </div>
        </ScrollArea>
      </motion.aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b px-4 h-14 bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileOpen(true)}
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
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
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
        <footer className="border-t px-4 py-3 bg-background flex-shrink-0">
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
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4">
              <SidebarForm onCalculated={() => setMobileOpen(false)} />
            </div>
          </ScrollArea>
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
