# Store Release Checklist

## Resolved in code

- Expo native permissions were declared for camera, gallery, location, and notifications in `app.json`.
- The mobile app no longer falls back to a local LAN IP in production builds when `EXPO_PUBLIC_API_URL` is missing.
- Broken visible actions were removed or redirected:
  - Facebook auth buttons were removed from login and signup.
  - The side menu settings entry now points to profile editing.
  - A real delete-account screen was added.
- The QR scanner hook flow was refactored so lint no longer fails on conditional hooks.
- The reusable button and checkbox components now expose display names, fixing the previous lint errors.
- Backend account deletion was added with authenticated deletion, blockers, and profile anonymization.
- Account deletion now removes user-owned Storage files and deletes the Supabase Auth identity with the server-side admin API.
- Signup now requires explicit acceptance of the Terms of Use and Privacy Policy for e-mail and Google registration.
- The landing project now includes a public account-deletion instructions page.
- Production no longer silently falls back to the Asaas sandbox URL.
- Paid moderated events now require host approval before payment.
- Host funds stay retained until 24 hours after the event and refunds preserve financial history.
- KYC no longer blocks participants; paid hosting and withdrawals still require manual approval.
- Profile column grants prevent clients from changing wallet, role, payout, or KYC decision fields.

## Still required before submission

- Deploy the landing project and confirm the production URLs for Privacy Policy, Terms of Service, and account deletion.
- Apply the pending Supabase migrations in production before validating account deletion.
- Add Sign in with Apple if Google login remains available in iOS as a first-party sign-in option.
- Prepare reviewer access notes for Apple and Google, including a test account if login is required.
- Fill in App Privacy Nutrition Labels (Apple) and Data Safety (Google Play).
- Decide whether `supportsTablet` should stay enabled.
  - If yes, prepare iPad screenshots and validate tablet UX.
  - If no, disable tablet support before the first App Store submission.
- Confirm all EAS production environment variables are configured:
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Confirm backend production environment variables are configured and rotated safely:
  - `NODE_ENV=production`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ASAAS_BASE_URL=https://api.asaas.com/v3`
  - `ASAAS_API_KEY`
  - `ASAAS_WEBHOOK_TOKEN`
- Validate push notifications, KYC upload, image upload, PIX payment, and account deletion on physical devices.
- Produce final store assets:
  - app description
  - short description
  - screenshots
  - support contact
  - privacy links
  - review notes

## Security and backend hardening still recommended

- Revalidar em ambiente implantado as politicas RLS, grants de coluna e migrations financeiras.
- Add rate limiting and structured audit logs for KYC, withdrawals, and ticket validation.
- Add a scheduled balance-release/reconciliation job and alerts for invariant failures.

## Validation status

- `npm run lint`: passes with warnings only.
- `backend/npm run build`: passes.
- `backend/npm test -- --runInBand`: passes.
