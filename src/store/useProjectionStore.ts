import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { extractFormInputs } from '@/store/formInputHelpers';

import { createFormSlice } from './slices/formSlice';
import { createUISlice } from './slices/uiSlice';
import { createScenarioSlice } from './slices/scenarioSlice';
import { createResultsSlice } from './slices/resultsSlice';

import type { FormSlice } from './slices/formSlice';
import type { UISlice } from './slices/uiSlice';
import type { ScenarioSlice } from './slices/scenarioSlice';
import type { ResultsSlice } from './slices/resultsSlice';

// --- Re-exports (preserve existing public API) ----------------------

export type { FormInputs } from './slices/formSlice';
export { defaultFormInputs } from './slices/formSlice';
export type { SavedScenario } from './slices/scenarioSlice';
export type { MonteCarloPercentiles } from './slices/resultsSlice';

// --- Combined Root Store ---------------------------------------------

type ProjectionStore = FormSlice & UISlice & ScenarioSlice & ResultsSlice;

// --- Persistence key -------------------------------------------------

const STORAGE_KEY = 'portfolio-projections-storage';

// --- Store -----------------------------------------------------------

export const useProjectionStore = create<ProjectionStore>()(
  persist(
    (set, get, api) => ({
      ...createFormSlice(set, get, api),
      ...createUISlice(set, get, api),
      ...(createScenarioSlice as any)(set, get, api),
      ...(createResultsSlice as any)(set, get, api),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      migrate: (persisted, _version) => persisted as any,
      partialize: (state) => ({
        ...extractFormInputs(state as unknown as Record<string, unknown>),
        scenarios: state.scenarios,
      }) as any,
    },
  ),
);
