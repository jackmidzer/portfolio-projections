import type { StateCreator } from 'zustand';
import type { PortfolioResults } from '@/types';
import type { FormInputs } from './formSlice';
import { extractFormInputs } from '@/store/formInputHelpers';

// ─── Types ───────────────────────────────────────────────────────────

export interface SavedScenario {
  id: string;
  label: string;
  inputs: FormInputs;
  results: PortfolioResults | null;
}

// ─── Slice Interface ─────────────────────────────────────────────────

export interface ScenarioSlice {
  scenarios: SavedScenario[];
  visibleScenarioIds: string[];

  saveScenario: (label: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;
  toggleScenarioVisibility: (id: string) => void;
}

// ─── Slice Creator ───────────────────────────────────────────────────

export const createScenarioSlice: StateCreator<
  ScenarioSlice & { results: PortfolioResults | null } & FormInputs,
  [],
  [],
  ScenarioSlice
> = (set, get) => ({
  scenarios: [],
  visibleScenarioIds: [],

  saveScenario: (label) => set((state) => {
    const id = crypto.randomUUID();
    const inputs = extractFormInputs(state as unknown as Record<string, unknown>);
    const scenario: SavedScenario = { id, label, inputs, results: state.results };
    return { scenarios: [...state.scenarios, scenario] };
  }),

  loadScenario: (id) => {
    const state = get();
    const scenario = state.scenarios.find((s) => s.id === id);
    if (!scenario) return;
    set({
      ...scenario.inputs,
      results: scenario.results,
    } as any);
  },

  deleteScenario: (id) => set((state) => ({
    scenarios: state.scenarios.filter((s) => s.id !== id),
    visibleScenarioIds: state.visibleScenarioIds.filter((sid) => sid !== id),
  })),

  duplicateScenario: (id) => set((state) => {
    const orig = state.scenarios.find((s) => s.id === id);
    if (!orig) return {};
    const newId = crypto.randomUUID();
    const copy: SavedScenario = {
      id: newId,
      label: `${orig.label} (copy)`,
      inputs: structuredClone(orig.inputs),
      results: orig.results,
    };
    return { scenarios: [...state.scenarios, copy] };
  }),

  toggleScenarioVisibility: (id) => set((state) => ({
    visibleScenarioIds: state.visibleScenarioIds.includes(id)
      ? state.visibleScenarioIds.filter((sid) => sid !== id)
      : [...state.visibleScenarioIds, id],
  })),
});
