// The backend (this repo's Express server, `npm run dev` from the project root)
// isn't reachable at "localhost" from a physical phone or Android emulator —
// only from an iOS simulator on the same Mac. Set this to whichever applies:
//   - Physical phone (Expo Go): your computer's LAN IP, e.g. "http://192.168.1.23:3000"
//     (find it with `ipconfig getifaddr en0` on Mac, phone and computer must share Wi-Fi)
//   - Android emulator: "http://10.0.2.2:3000"
//   - iOS simulator: "http://localhost:3000"
export const API_BASE_URL = "http://192.168.1.118:3000";

export const ANALYZE_ENDPOINT = `${API_BASE_URL}/api/food/analyze`;
