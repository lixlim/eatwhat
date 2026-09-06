# EatWhat (mobile)

Native mobile POC for the food nutrition analyzer, built with Expo/React Native. Lets you take or upload a photo of a meal and view the nutrition analysis returned by the backend in this repo.

## Prerequisites

- Node.js 18+
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Your phone and computer on the **same Wi-Fi network**
- The backend from the project root running (see the top-level [README](../README.md)) — this app has no backend of its own

## Setup

```bash
cd mobile
npm install
```

## Point the app at your backend

Edit **[src/config.ts](src/config.ts)** and set `API_BASE_URL` to your computer's LAN IP (not `localhost` — a physical phone can't reach your computer's `localhost`):

```bash
# find your Mac's LAN IP
ipconfig getifaddr en0
```

```ts
export const API_BASE_URL = "http://192.168.1.23:3000"; // use your actual IP
```

(If you're instead using an Android emulator, use `http://10.0.2.2:3000`; an iOS simulator on the same Mac can use `http://localhost:3000`.)

## Run

From the project root, start the backend first:

```bash
npm run dev
```

Then, in `mobile/`:

```bash
npm start
```

This opens the Expo dev tools with a QR code. Scan it with the Camera app (iOS) or the Expo Go app (Android) to launch EatWhat on your phone.

## Using the app

1. **Take photo** opens the camera directly; **Upload photo** opens your photo library (both will prompt for a one-time permission)
2. Confirm the image, then tap **Analyse meal**
3. While the request is in flight you'll see a loading state over the photo
4. On success you'll see the dish name, confidence, detected components with estimated portions, nutrition ranges, an interpretation, and caveats
5. **Scan another meal** resets the flow; on a failed request, **Try again** retries the same photo

## Notes

- No login, history, or local persistence — this is a stateless POC that mirrors the [web preview](../public/)
- If requests fail immediately with a network error, it's almost always the `API_BASE_URL` above — double check the IP and that both devices are on the same network
