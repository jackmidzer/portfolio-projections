# Portfolio Projections - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd portfolio-projections
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
Open the URL shown in terminal (usually http://localhost:5173)

---

## 📋 What's Included

✅ Complete React 18 + TypeScript setup with Vite
✅ Pre-configured Tailwind CSS with shadcn/ui-style primitives
✅ Chart.js / react-chartjs-2 for data visualisation (4 chart views)
✅ Zustand for state management
✅ Three account types: Savings, Pension, Brokerage
✅ Full Irish tax modelling (PAYE, USC, PRSI, DIRT, CGT, pension relief)
✅ Compound interest calculations with monthly compounding
✅ Early retirement (FIRE) and pension phase planning
✅ House purchase deposit planning
✅ Animated milestone timeline (Framer Motion)
✅ Year-by-year expandable breakdown table
✅ Responsive sidebar + mobile sheet layout
✅ Dark mode with system preference detection

---

## 📁 Key Files to Know

- `src/App.tsx` — Root application component
- `src/layouts/DashboardLayout.tsx` — Sidebar + main content responsive layout
- `src/store/useProjectionStore.ts` — Zustand store (form state, calculation logic, results)
- `src/components/form/SidebarForm.tsx` — Collapsible sidebar form with all input sections
- `src/components/dashboard/DashboardContent.tsx` — Main results area (charts, table, cards)
- `src/components/dashboard/ProjectionChart.tsx` — Tabbed chart container
- `src/components/dashboard/ProjectionTable.tsx` — Year-by-year expandable table
- `src/utils/calculations.ts` — Portfolio growth and compound interest logic
- `src/utils/taxCalculations.ts` — Irish tax calculation logic
- `src/types/index.ts` — TypeScript type definitions

---

## 🛠 Available Commands

| Command             | Description                |
| ------------------- | -------------------------- |
| `npm run dev`       | Start development server   |
| `npm run build`     | Type-check and build for production |
| `npm run preview`   | Preview production build   |
| `npm run lint`      | Run ESLint                 |

---

## 💡 Next Steps

1. **Customise default inputs** — edit initial state in `src/store/useProjectionStore.ts`
2. **Add or modify account types** — extend `AccountType` in `src/types/index.ts`
3. **Adjust tax rates** — update `src/constants/irishTaxRates2026.ts`
4. **Modify calculations** — see `src/utils/calculations.ts` and `src/utils/taxCalculations.ts`
5. **Style changes** — Tailwind classes throughout, or edit `tailwind.config.js`
6. **Add new form sections** — create a component in `src/components/form/` and wire it into `SidebarForm.tsx`

---

## 🤔 Need Help?

Check the full README.md for:
- Detailed project structure
- How the calculation pipeline works
- Irish tax formula examples
- Architecture notes

Happy coding! 🎉
