# Store readiness checklist — Billing

## Before first submission

1. **Apple Developer Program** — Account → membership **Active** (not “Enroll Now”).
2. **Google Play Console** — one-time US$25 developer registration.
3. **GitHub Pages** — Settings → Pages → Deploy from branch `main` / folder `/docs`.
   Confirm: https://sotico91.github.io/BillingApp/privacy-policy.html
4. Create apps in **App Store Connect** and **Play Console** with package/bundle `com.billingapp.personal`.
5. Paste privacy URL + support email `edavidvelascop@gmail.com` in both store listings.
6. Build production:
   - `npm run eas:ios:production`
   - `npm run eas:android:production`
7. Upload to **TestFlight** and Play **internal testing** before production.

## App Store Connect fields

- Encryption: uses standard HTTPS only → answer **No** (app sets `ITSAppUsesNonExemptEncryption = false`).
- Privacy nutrition labels: data on device; Face ID / notifications optional; no tracking.
- Review notes: personal finance tracker; data stays on device; not a bank / payment processor.
- Screenshots: iPhone 6.7" + 6.1" (Home, Add, Plan, Entender).

## Play Console fields

- Data safety: financial info stored on device; not shared; user can delete by uninstall / restore.
- Upload **AAB** (production EAS profile).
- Declare notifications / exact alarms if prompted (reminders).

## Already handled in the repo

- No microphone / background audio entitlement for store builds (`expo-audio` playback-only).
- Privacy policy HTML + in-app link (profile menu + Plan footer).
- Face ID usage string.
- EAS production Android = `app-bundle`; iOS production profile added.
