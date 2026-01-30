# Cash Flow Tracker

## Overview

A personal finance management application built with React and TypeScript. The app helps users track expenses, income, savings, and financial goals. It features multi-currency support (NTD, USD, CAD), time-based filtering, data visualization with charts, and monthly financial summaries with predictions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with CSS variables for theming, using the DM Sans font family
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: React hooks with localStorage persistence for all financial data
- **Routing**: React Router v6 with simple two-page structure (Index and NotFound)
- **Data Fetching**: TanStack React Query available but primarily client-side data

### Core Features
- **Expense Tracking**: One-time expenses with date, description, amount, and review flags
- **Fixed Expenses**: Recurring expenses with frequency options (weekly, monthly, quarterly, yearly)
- **Income Tracking**: Income entries with source, date, optional notes, and income type (Cash or Accrued Revenue)
- **Savings Tracking**: Savings entries with type (Balance for actual savings, Goal for desired savings) with bidirectional sync between goal entries and savings targets
- **Goals**: Financial goals with deadlines, drag-and-drop reordering, sub-tasks (10 max with action/cost/time/deadline), ideations (20 max), key constraint, URL packs with open-all functionality, and linked expenses that sync dates
- **Financial Targets**: Income targets, expense thresholds, and savings targets per currency and period with chart reference lines

### Data Flow
- All financial data stored in browser localStorage
- Data persisted as JSON arrays with unique IDs generated client-side
- Currency conversion handled at display time; amounts stored in NTD as base currency
- Import/export functionality for data backup via JSON files

### Component Structure
- `ExpenseTracker`: Main container component managing all state
- Form components: `ExpenseForm`, `IncomeForm`, `SavingForm`, `FixedExpenseForm`
- List components: `ExpenseList`, `IncomeList`, `SavingList`, `FixedExpenseList`, `GoalList`
- Visualization: `CombinedChart`, `MonthlySummary` using Recharts
- Navigation: `TimeNavigator` for hierarchical time-based filtering (Year → Quarter → Month → Week)

### Time Navigator Feature
- **Hierarchical Navigation**: Collapsible tree structure showing Year → Quarters (Q1-Q4) → Months → Weeks
- **Period Selection**: Click any level to filter all data (expenses, incomes, savings) to that time period
- **Responsive Layout**: Sidebar on desktop (lg+), inline collapsible section on mobile
- **Filtered Totals**: All totals, charts, and summaries update based on selected time period

### Design Patterns
- Context providers for global state (Currency, Tooltip)
- Controlled form components with local state
- Pagination for list components
- Inline editing for all financial entries

## External Dependencies

### UI Framework
- **Radix UI**: Headless accessible component primitives (dialogs, popovers, selects, etc.)
- **shadcn/ui**: Pre-styled component library on top of Radix
- **Lucide React**: Icon library

### Data & Visualization
- **Recharts**: Chart library for financial visualizations
- **date-fns**: Date manipulation and formatting
- **dnd-kit**: Drag and drop for goal reordering

### Forms & Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Validation resolvers (Zod support available)

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Intelligent class merging

### Data Storage
- **Browser localStorage**: All data persists locally in the browser
- No backend database currently; the app is entirely client-side