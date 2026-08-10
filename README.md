# BillingApp

A personal finance app to understand and control everyday money — especially **ant spends** — with a simple loop: register → classify → understand → decide.

## Overview

BillingApp helps you log income and expenses quickly, see the month clearly, and get local reminders for the concepts you choose. Every movement is attributed to the person who logged it, so if a household ledger is shared later, each expense still belongs to whoever registered it.

Built for daily use on iPhone: guided onboarding, friendly logging (coffee, delivery, salary…), budgets only for concepts you already use, and an assistant for questions like “How much did I spend on delivery this month?”

## Features

- **Guided logging** for expenses, income, transfers, and debt payments
- **Quick templates** (coffee, delivery, transport, salary, savings)
- **Home** month summary: income, expenses, savings signal, debts, and net worth
- **Activity** by today / week / month, with edit and delete
- **Plan**: daily local reminders + budgets for registered concepts
- **Other** reminders: custom concept names (receipts, parking, utilities, etc.)
- **Understand**: category ranking and “Ask BillingApp”
- **Wealth**: accounts, debts, and subscriptions
- **i18n** English / Spanish (device language)
- **On-device** data (AsyncStorage); no remote push server required

## Stack

- TypeScript
- React Native + Expo (~57) + Expo Router
- AsyncStorage, Reanimated, Expo Notifications (local alerts)

## Getting started

```bash
npm install
npx expo start
# iOS device / simulator
npx expo run:ios
```

Release build on a physical iPhone (example):

```bash
npx expo run:ios --device <UDID> --configuration Release
```

## Structure

```
app/           # Screens (Expo Router)
src/           # Components, hooks, i18n, data, and utilities
assets/        # Icon, splash, and fonts
```

## Privacy

Movements are stored on the phone. Reminder notifications are **local** (scheduled on the device). No account or backend is required for basic use.

## License

See `LICENSE`.
