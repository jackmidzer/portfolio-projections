import { AlertCircle, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectionStore } from '@/store/useProjectionStore';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  compact?: boolean;
}

export function ErrorFallback({ error, resetErrorBoundary, compact }: ErrorFallbackProps) {
  const handleResetForm = () => {
    useProjectionStore.getState().resetForm();
    resetErrorBoundary();
  };

  if (compact) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-destructive mb-1">Chart failed to render</h3>
        <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        {error.message}
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Try again, or reset the form to default values.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={resetErrorBoundary}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
        <Button variant="destructive" onClick={handleResetForm}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset form
        </Button>
      </div>
    </div>
  );
}
