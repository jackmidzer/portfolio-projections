import { MotionConfig } from 'framer-motion';
import { DashboardLayout } from './layouts/DashboardLayout';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DashboardLayout />
    </MotionConfig>
  );
}

export default App;
