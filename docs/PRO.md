# Rumi Pro

Pro is a monthly or annual subscription sold through Google Play and the App Store, validated by RevenueCat.

## What Pro unlocks

| | Free | Pro |
|---|---|---|
| Ask Rumi | 5 questions per calendar month | Unlimited |
| Monthly limits (Plan) | 3 (a debt's installment limit doesn't count) | Unlimited |
| Subcategory reminders | 3 (debt due-date reminders are always on) | Unlimited |
| Plan to get out of debt (how much sooner with an extra payment, interest saved, order) | Debt-free date with installments only | Yes |
| "Can I afford it?" for a later month (put aside per month / fortnight vs usual surplus) | This month only | Yes |
| Excel export (planned, 1.8.0): one `.xlsx` per year, a "Resumen" sheet with the 12 months side by side and one sheet per month (date, type, category, description, account, amount, month totals); asks which year when there is more than one | — | Yes |
| Movements CSV export | — | Yes |
| Backup export (JSON file to keep or move to another phone) | — | Yes |
| New Phase 2 features (category trend, recurring spends logged for you) | — | Yes |

The limits only stop adding a new limit, reminder or question; what was already set up keeps working. Logging, Home, Activity, accounts and app lock stay free.

**Exports and backups are Pro (decided 2026-11-10):** taking data out of the phone (Excel, CSV, JSON backup) is a paid feature. What stays free, so nobody's data is held hostage:
- **Restore a backup** (JSON or an automatic copy): anyone can bring their data back.
- **Automatic copies on the phone** (`AutoBackupRunner`): they keep running for everyone; they protect against data loss, they are not an export.
- **Founders** keep every export, as part of their free Pro.

**Retention:** Rumi keeps every year of movements; nothing is deleted on its own. When there are more than 3 years, Rumi may offer once a year to export the oldest year to Excel and, if the person wants, remove it from the phone. A DIAN review can reach 5 years back, so the data must never disappear without the person asking.

**Rumi Pro look:** while Pro is on (bought or founder), Home shows a gold "PRO" tag next to "Rumi" and the launch screen shows "Rumi Pro" under the mark. When a subscription expires, RevenueCat drops the `pro` entitlement and the app goes back to plain Rumi. The last state is saved as `showsPro` in `rumi.pro.v1`, because the launch screen runs before the store answers. The store icon and listing are the same for everyone.

**Founders:** whoever had finished onboarding the first time they open a build with Pro turned on keeps Pro for free, for good (`founder` in `rumi.pro.v1`, decided once). A fresh install, or a restore from backup on a new phone, is not a founder.

## Code

- `src/utils/pro.ts`: the free allowances and pure rules (tested in `src/utils/__tests__/pro.test.ts`).
- `src/hooks/usePro.tsx`: `ProProvider` configures RevenueCat, loads the plans and exposes `allow(feature, existing)` (opens `/pro` when the allowance is used up), `noteAsk()`, `purchase()` and `restore()`.
- `app/pro.tsx`: the Pro screen (reason, benefits, annual/monthly, subscribe, restore, terms, privacy, manage subscription).
- `debtPlan` and `afford` have no free allowance (`freeAllows` returns false). `DebtPlanCard` in Wealth shows the unlock button to free users; Ask Rumi gets `isPro` in its options and a locked answer carries `proFeature`, which shows "Ver Rumi Pro".
- Limits are checked in `app/(tabs)/insights.tsx` (ask), `src/components/ConceptsPlanCard.tsx` (new limit) and `src/components/ReminderSettingsCard.tsx` (new reminder or accepted suggestion). Settings shows a "Rumi Pro" row.

**Pro is off until a store key exists.** With no `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` / `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (local builds, Expo Go, web), nothing is limited and the Pro row is hidden, so a build without keys behaves exactly as before.

SDK: `react-native-purchases` ~10.16 (11.x needs `PurchasesHybridCommon` 20.x, not on CocoaPods trunk as of 2026-11-05). RevenueCat is configured with `automaticDeviceIdentifierCollectionEnabled: false`: it only gets an anonymous app user id and the store purchase.

## Setting it up (one time)

1. **Google Play Console**
   - Set up a payments profile (Configuración → Perfil de pagos) so the account can sell.
   - Monetizar → Productos → Suscripciones: create `rumi_pro` with two base plans, `monthly` (1 month, auto-renew) and `annual` (1 year, auto-renew). Prices: COP 9.900 and COP 69.900 (Play converts other countries). Optional: a 7-day free trial offer on `annual`.
   - Configuración → Acceso a la API: create a service account with financial data access and download its JSON; RevenueCat needs it to check purchases.
2. **App Store Connect** (when the Apple developer account is active): sign the Paid Apps agreement, add bank and tax info, and create a subscription group "Rumi Pro" with `rumi_pro_monthly` and `rumi_pro_annual`.
3. **RevenueCat** (free up to USD 2.500 a month in revenue)
   - New project "Rumi" → add the Play app `com.sotico91.rumiapp` with the service account JSON (and the iOS app later).
   - Import the products, create the entitlement **`pro`** and attach both products.
   - Offering `default` (current) with the `$rc_monthly` and `$rc_annual` packages.
   - Copy the public SDK keys (Android starts with `goog_`, iOS with `appl_`).
4. **EAS**: add the keys as environment variables for the `production` environment:
   ```bash
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_xxx --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --visibility plaintext
   ```
   Public SDK keys are meant to ship inside the app; they are not secrets.
5. **Before the first build with keys** (done for 1.2.0 on 2026-11-05: Android key in EAS `production`, privacy, terms and website prices)
   - Play Console → Seguridad de los datos: declare "Historial de compras" and "IDs de dispositivo u otros" (collected, not shared, for app functionality) before the build leaves the internal test.
6. **Test**: add the tester under Play Console → Administra la cuenta → Configuración de apps de Play → Configuración de la monetización → Prueba de licencias (the Spanish labels may differ a little), install from the internal test and buy; test purchases are free and renew every few minutes.
