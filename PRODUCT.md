# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Context API, Recharts, MySQL support

## Users

Individuals, professionals, and households taking active, disciplined control of their finances: budgeting, tracking income/expenses, planning long-term goals, vehicle ownership costs, wishlists, and multi-month cashflow forecasting.

## Product Purpose

A comprehensive, private personal financial intelligence and management workstation. It gives users immediate clarity on current liquid position, spending patterns, recurring obligations, asset costs, and future net worth trajectories, with actionable insights and automated suggestions to meet financial independence milestones.

## Positioning

Unlike generic tracker spreadsheets or fragmented mobile apps, this planner merges day-to-day transaction ledgering (recurring + one-time, car maintenance, wishlist prioritization) with forward-looking 12-month simulation, goal timeline allocation, multi-currency conversion, and an integrated AI Financial Assistant.

## Operating Context

Used regularly on desktop and mobile browsers for:
- Daily/weekly expense entry and monthly recurring reconciliation.
- Strategic quarterly/annual financial reviews and forecasting simulations.
- Goal progress tracking (emergency funds, vacations, down payments, vehicle purchases).
- Exporting and importing complete financial profiles (JSON/CSV) with offline-first persistence.

## Capabilities and Constraints

- **Dashboard**: High-level financial health KPI grid, monthly net surplus/deficit, goal tracking, category distribution, recent transaction audit.
- **Income Management**: Multi-frequency income sources (monthly, bi-weekly, one-time, freelance) with automated monthly conversion.
- **Expense Tracking**: Fixed recurring expenses with due dates vs variable/one-time expenses, categorized with tags and filters.
- **My Car (Asset & Cost Tracker)**: Vehicle purchase, financing, ongoing maintenance, insurance, fuel, and depreciation metrics.
- **Wishlist Planner**: Prioritized purchase pipeline with target dates, status, savings allocation, and affordability scoring.
- **Goals & Goal Planning**: Smart target date projection, required monthly contribution calculations, prioritization, and automated simulation.
- **12-Month Forecast**: Compound projected cashflow, balance trajectories, goal impact timelines, and risk warning indicators.
- **Import / Export**: Full state backups, CSV imports, migration scripts, and MySQL backend bridge.
- **Multi-currency & Localization**: Dynamic currency switching (BRL, USD, EUR, GBP, etc.) and multilingual interface (PT-BR, EN, ES).
- **AI Financial Assistant**: In-context conversational advice, budget optimization, and instant anomaly analysis.

## Brand Commitments

- Name: Personal Financial Planner (Finance Planner)
- Tone: Crisp, trustworthy, analytical, empowering, and executive-level precision.
- UI Style: Modern high-density workstation aesthetic, clean mathematical typography, harmonious financial palette (indigo/slate/emerald/rose), fluid transitions, and pristine dark & light themes.

## Evidence on Hand

- Database schema in `database.sql`, `car_migration.sql`, `wishlist_migration.sql`.
- Business logic contracts in `EXPENSES_LOGIC.md`, `FORECAST_LOGIC.md`, `GOALS_LOGIC.md`, `GOAL_PLAN_LOGIC.md`, `INCOME_LOGIC.md`, `SMART_SUGGESTIONS_LOGIC.md`.
- Sample data and context providers in `context/FinanceContext.tsx`, `context/LanguageContext.tsx`, `context/CurrencyContext.tsx`, `context/ThemeContext.tsx`.

## Product Principles

1. **Information Scannability & High Density**: Financial operators need numbers, trends, and status at a glance without decorative clutter or excessive clicks.
2. **Deterministic & Transparent Math**: Every metric, summary, forecast balance, and progress bar is mathematically consistent and immediately traceable.
3. **Frictionless Navigation & Immediate Response**: Fluid tab transitions, instant responsive filtering, keyboard accessibility, and zero lag on calculations.
4. **Resilient Data Sovereignty**: Seamless offline local storage persistence with lossless export/import and optional database synchronization.

## Accessibility & Inclusion

- WCAG 2.1 AA color contrast across light and dark modes.
- Semantic HTML tables, inputs, buttons, and progress indicators.
- Full keyboard navigation and visible focus rings.
- Respect `prefers-reduced-motion`.
