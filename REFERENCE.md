# Personal Finance Planner - Project Reference

## Overview
This project is a comprehensive personal finance planning application built with Next.js, TypeScript, and Tailwind CSS. It allows users to track income, expenses, goals, and credit card accounts, while providing financial forecasts and analytics.

## Core Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer
- **Icons**: Lucide React
- **Date Handling**: Custom utilities (no external heavy libraries like moment.js)

### Project Structure
- **/app**: Next.js App Router pages and layouts.
  - **/cards**: Credit card management.
  - **/dashboard**: Main dashboard view.
  - **/expenses**: Expense tracking and calendar.
  - **/goals**: Financial goals tracking.
  - **/income**: Income source management.
  - **/settings**: Application settings.
- **/components**: Reusable UI components.
  - **Navigation.tsx**: Main navigation bar.
  - **TransactionForm.tsx**: Generic form for add/edit operations.
  - **ui**: Basic UI elements (Button, Card, Input, etc.).
- **/context**: Global state management.
  - **FinancialProvider.tsx**: Context provider.
  - **actions.ts**: Redux-style action creators.
  - **reducer.ts**: State transition logic.
  - **types.ts**: Context-specific types.
  - **initialState.ts**: Default state definitions.
- **/types**: Shared TypeScript interfaces (`UserPlan`, `Income`, `Expense`, `CreditCardAccountInfo`, etc.).
- **/utils**: Helper functions for calculations, date formatting, and validation.

## Key Data Models

### UserPlan
The central data structure containing all user data:
- `income`: Array of Income sources.
- `expenses`: Array of Expenses.
- `goals`: Array of Financial Goals.
- `creditCardAccounts`: Array of Credit Card Accounts.
- `forecast`: Generated financial forecast data.
- `currentBalance`: User's current total balance.
- `forecastConfig`: Configuration for projection calculations.

### CreditCardAccountInfo
- `id`: Unique identifier.
- `name`: Card name (e.g., "Nubank").
- `dueDay`: Day of month bill is due.
- `closingDay`: Day of month billing cycle closes.
- `isActive`: Boolean flag.

## State Management Flow
1. **Context**: `FinancialContext` holds the global state.
2. **Provider**: `FinancialProvider` wraps the app, handles initialization, validation, and persistence (localStorage).
3. **Actions**: Components dispatch actions (e.g., `ADD_INCOME`, `UPDATE_CREDIT_CARD_ACCOUNT`) via `useFinancialActions` hook.
4. **Reducer**: `financialReducer` processes actions and updates the state immutably.
5. **Auto-Save**: Changes to `UserPlan` trigger an auto-save effect in `FinancialProvider`.

## Internationalization & Localization
- **Currency**: Handled by `CurrencyContext` (BRL/USD/EUR).
- **Language**: Handled by `LanguageContext` (PT-BR/EN).
- **Date Format**: Localized based on selected language.

## Recent Updates
- **Credit Card Feature**: Added full support for credit card accounts including types, context actions, and UI integration.
- **Top Bar Redesign**: Improved layout using Flexbox for perfect alignment of Title, Navigation, and Settings.
- **Expense Calendar**: Fixed logic to ensure past months (like January) are visible by dynamically calculating the start date based on earliest expense.
