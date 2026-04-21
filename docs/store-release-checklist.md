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

## Still required before submission

- Publish a production Privacy Policy URL.
- Publish Terms of Service, especially because the app handles payments, KYC, and event hosting.
- Create a public web URL for Google Play account deletion support.
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
- Confirm backend production environment variables are configured and rotated safely.
- Validate push notifications, KYC upload, image upload, PIX payment, and account deletion on physical devices.
- Produce final store assets:
  - app description
  - short description
  - screenshots
  - support contact
  - privacy links
  - review notes

## Security and backend hardening still recommended

- Several backend routes still trust client-sent `userId` or `hostId`.
- Before public launch, extend authenticated ownership checks to:
  - event creation and update
  - bookings create/cancel/approve/reject
  - ticket validation
  - withdrawals
  - reviews delete
- Add rate limiting and structured audit logs for KYC, withdrawals, and ticket validation.

## Validation status

- `npm run lint`: passes with warnings only.
- `backend/npm run build`: passes.
- `backend/npm test -- --runInBand`: passes.
