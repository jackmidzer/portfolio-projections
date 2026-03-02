import { MotionConfig } from 'framer-motion';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorFallback } from './components/ErrorFallback';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
        <DashboardLayout />
      </ErrorBoundary>
    </MotionConfig>
  );
}

export default App;
