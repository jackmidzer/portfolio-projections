# Portfolio Predictor - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd portfolio-predictor
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

✅ Complete React + TypeScript setup with Vite
✅ Pre-configured Tailwind CSS
✅ Recharts for data visualization
✅ Three account types: Savings, Pension, Brokerage
✅ Compound interest calculations with monthly contributions
✅ Interactive charts (Line & Area)
✅ Year-by-year breakdown table
✅ Responsive design for all devices

---

## 🎯 Default Example Values

The app comes pre-filled with sample data:

**Savings Account**
- Current Balance: $10,000
- Monthly Contribution: $500
- Expected Return: 3%

**Pension Account**
- Current Balance: $50,000
- Monthly Contribution: $1,000
- Expected Return: 7%

**Brokerage Account**
- Current Balance: $25,000
- Monthly Contribution: $750
- Expected Return: 8%

**Time Horizon**: 20 years

---

## 📁 Key Files to Know

- `src/App.tsx` - Main application component
- `src/components/InputForm.tsx` - Form for user inputs
- `src/utils/calculations.ts` - Compound interest logic
- `src/types/index.ts` - TypeScript interfaces

---

## 🛠 Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

## 💡 Next Steps

1. **Customize the defaults** in `InputForm.tsx`
2. **Add more account types** by extending the `AccountType` in `types/index.ts`
3. **Modify calculations** in `utils/calculations.ts`
4. **Style changes** using Tailwind classes or modify `tailwind.config.js`

---

## 🤔 Need Help?

Check the full README.md for:
- Detailed project structure
- How calculations work
- Ideas for future features
- Architecture notes for scaling

Happy coding! 🎉
