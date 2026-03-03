import type { StateCreator } from 'zustand';

// ─── Slice Interface ─────────────────────────────────────────────────

export interface UISlice {
  expandedSections: string[];
  showAdvancedOptions: boolean;
  isCalculating: boolean;
  validationErrors: Record<string, string>;
  showRealValues: boolean;

  toggleSection: (section: string) => void;
  setShowAdvancedOptions: (show: boolean) => void;
  setIsCalculating: (value: boolean) => void;
  toggleRealValues: () => void;
}

// ─── Slice Creator ───────────────────────────────────────────────────

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  expandedSections: ['personal', 'income', 'accounts'],
  showAdvancedOptions: false,
  isCalculating: false,
  validationErrors: {},
  showRealValues: false,

  toggleSection: (section) => set(state => {
    const sections = state.expandedSections;
    return {
      expandedSections: sections.includes(section)
        ? sections.filter(s => s !== section)
        : [...sections, section],
    };
  }),
  setShowAdvancedOptions: (show) => set({ showAdvancedOptions: show }),
  setIsCalculating: (value) => set({ isCalculating: value }),
  toggleRealValues: () => set((state) => ({ showRealValues: !state.showRealValues })),
});
