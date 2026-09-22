# DKList Mobile

Native iOS + Android app for [dklist.com](https://dklist.com), built on Expo
(React Native + TypeScript). Consumes the existing `v2/` Next.js backend's
`/api/mobile/v1/*` REST API - no separate backend, no data migration.

## Status: infrastructure only

**No real screens are built yet, on purpose.** This is the groundwork laid
down ahead of actual screen-by-screen work (2026-09-22), not a partial app:

- Expo Router scaffold (SDK 57, TypeScript, React 19), reset to a bare
  placeholder screen (`src/app/index.tsx`).
- A typed API client (`src/api/client.ts`) + auth calls (`src/api/auth.ts`)
  wired against the real backend and verified end-to-end (see below) -
  imported by nothing yet, since there's no screen to call them from.
- Native secure token storage (`src/auth/token-storage.ts`, iOS Keychain /
  Android Keystore via `expo-secure-store`) - never plain AsyncStorage for
  the auth token.
- The backend side of this (see `v2/PLAN.md`'s matching entry): a new
  `verifyCredentials()` shared by both the web login and the mobile API, a
  `/api/mobile/v1/auth/login` + `/api/mobile/v1/me` + `/api/mobile/v1/health`
  route, and a dedicated Bearer-token JWT system (`jose`, `MOBILE_JWT_SECRET`)
  independent of Auth.js's own cookie-session JWT.

## Why Expo (React Native), not separate Swift/Kotlin apps

One TypeScript codebase covering iOS *and* Android, maintainable by the same
person/team already building the Next.js backend - two fully separate native
codebases would double every future screen's work indefinitely, which isn't
proportionate here. Expo specifically (not bare React Native) for its
managed native-module ecosystem (push notifications, secure storage, SF
Symbols via `expo-symbols`, EAS cloud builds - no local Xcode/Android Studio
required to ship). This still targets a genuinely native look/feel (per the
design brief this app is meant to follow), not a WebView wrapper.

## Running locally

```bash
cd mobile
npm install
cp .env.example .env.local   # then edit EXPO_PUBLIC_API_BASE_URL if needed
npx expo start
```

The backend must be running too: `cd v2 && npm run dev` (default
`http://localhost:3000`). On a physical device (not a simulator), set
`EXPO_PUBLIC_API_BASE_URL` in `.env.local` to your computer's LAN IP, not
`localhost` - a phone can't resolve your machine's own localhost.

`MOBILE_JWT_SECRET` should be set in `v2/.env.local` for the mobile login
route to sign tokens; it falls back to the existing `AUTH_SECRET` if unset
so this doesn't break a fresh clone, but a dedicated secret is the right
setup before this ships for real (rotating one should never affect the
other's tokens).

## Backend contract (`v2/src/app/api/mobile/v1/`)

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/health` | GET | none | connectivity/version check |
| `/auth/login` | POST | none | `{username, password, code?}` → `{token, user}` or `two_factor_required`/`suspended` |
| `/me` | GET | Bearer | current user's profile |

Verified against the real local database (not just typechecked): a real
login with a correct/incorrect password, a valid token reaching `/me`, and
an absent/invalid token being rejected - all confirmed via direct HTTP
calls during this setup, not assumed from reading the code.

## Folder layout

```
src/
  app/          # Expo Router screens/layouts ONLY - routing, not logic
  api/          # backend client (config, fetch wrapper, per-feature calls)
  auth/         # token storage
  components/   # (not started) shared UI
  hooks/        # (not started)
```

Non-route code stays out of `src/app/` - that directory is scanned by Expo
Router and every file in it becomes a screen.

## Deliberately not decided/built yet

- Real screens (see the separate design brief for the intended IA/screen
  list - this repo doesn't implement any of it yet).
- Push notifications (Expo Push / APNs / FCM) - no device-token table on
  the backend yet either.
- Refresh-token rotation - the mobile JWT is a single 30-day token for now,
  a deliberately simple choice for this phase, not a final security design.
- EAS project linkage / bundle identifiers are placeholders
  (`com.dklist.app`) - real Apple Developer / Google Play accounts needed
  before any real build or store submission.
- Offline queueing, widgets, Live Activities, Siri Shortcuts - all in the
  design brief, none started.
