# Engineering Learnings: Express Backend + React Native (Expo) Frontend

https://claude.ai/code/artifact/486dec78-8dd4-47af-9208-84e362c33081#d028799d-0a3b.mc110qt1nbw.2300~middleware-the-pipeline-every-request-passes-through

Notes from building this project — not a tutorial, a record of the decisions and gotchas
that aren't obvious from reading the code cold.

## 0. Bootstrapping a Node.js + TypeScript project from scratch

The minimal file set the backend needed before any feature code existed, and the
commands that produced them, for the next time this needs doing from an empty directory.

### Files needed

| File | Purpose |
|---|---|
| `package.json` | Scripts + dependency list. `npm init -y` generates a stub; hand-edit `scripts` after. |
| `tsconfig.json` | Compiler config. `npx tsc --init` scaffolds one with everything commented out; trim it to what you actually need (see below). |
| An entry point (here, [`app.ts`](app.ts) at the repo root) | Where the server starts. |
| `.env` + `.env.example` | Secrets/config (`OPENAI_API_KEY`, `PORT`). `.env` is gitignored; `.env.example` documents the shape without the values. |
| `.gitignore` | At minimum `node_modules`, `dist`, `.env`. |
| `nodemon.json` | Dev-loop config — see below. |

### Commands, in the order they were actually run

```bash
npm init -y                                                    # 1. creates package.json
npm install express dotenv                                     # 2. runtime deps
npm install -D typescript ts-node nodemon @types/node @types/express  # 3. dev-only deps
npx tsc --init                                                 # 4. scaffolds tsconfig.json
# 5. trim tsconfig.json down (see below), write app.ts, add nodemon.json
npm run dev                                                     # 6. once "dev" exists in package.json scripts
```

**Learning:** `npm install` and `npm install -D` are two different commands, not a flag
you remember to add later — get the runtime/dev split right at install time. Everything
in this project's `devDependencies` (`typescript`, `ts-node`, `nodemon`, the `@types/*`
packages) is never needed at runtime in production, only to write and dev-loop the code.

### The `tsconfig.json` that actually matters, trimmed from `tsc --init`'s output

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "app.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`outDir`/`rootDir` matter together: they make `tsc` mirror `src/` and `app.ts`'s layout
inside `dist/` rather than flattening everything, so `dist/app.js` and `dist/src/...`
match what you'd expect from the source tree. `strict: true` is worth turning on from
the very first commit, not bolting on later — retrofitting strict null checks onto a
codebase that grew without them is far more painful than starting with it.

### The simplest thing that can run (before any real feature exists)

```ts
// app.ts
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (_req, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
```

That alone, plus a `package.json` with `"main": "app.ts"`, is enough to prove the setup
works before writing any actual routes or services.

### Wiring the dev loop: nodemon + ts-node instead of a separate build step

```json
// nodemon.json
{
  "watch": ["app.ts", "src"],
  "ext": "ts,json",
  "ignore": ["dist", "node_modules"],
  "exec": "ts-node app.ts"
}
```

```json
// package.json scripts
"scripts": {
  "dev": "nodemon",
  "build": "tsc",
  "start": "node dist/app.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

`npm run dev` runs `nodemon`, which watches `app.ts`/`src` and re-execs `ts-node app.ts`
on every change — no manual compile step during development, and no `dist/` output at
all until you actually run `npm run build`. Production is the opposite: `npm run build`
compiles once to `dist/`, then `npm start` runs plain `node` against the compiled JS,
with no `ts-node`/`nodemon` dependency at runtime.

**Learning:** this ts-node+nodemon combo trades a small amount of runtime overhead
(TypeScript is transpiled on the fly, not ahead of time) for a zero-step dev loop —
worth it for a POC's iteration speed. It's also why state kept only in memory (like
[`nutrition-service.ts`](src/services/nutrition-service.ts)'s `Map`) resets so often
during development: every save-triggered nodemon restart is a full process restart, not
a hot reload.

## 1. Setting up the Express backend

### Entry point and middleware order

Everything starts in [`app.ts`](app.ts). Middleware order matters more than it looks:

```ts
app.use(express.json());              // parses JSON bodies for every route below
app.use(express.static("public"));    // serves the web frontend as static files
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/food", upload.single("image"), foodRoutes);
```

The non-obvious part: `upload.single("image")` (multer) is mounted in front of *every*
route under `/api/food`, not just the image-upload one. Multer inspects the
`Content-Type` header — if it isn't `multipart/form-data`, it just calls `next()` and
does nothing. That's what lets `GET /records`, `DELETE /records/:id`, and the JSON-body
`PATCH /records/:id/components` route share the same router mount as the multipart
`POST /analyze` route without multer interfering. If you add a new route under
`/api/food` that expects JSON, you don't need to change this middleware chain — but it's
worth knowing *why* it doesn't break, rather than assuming it "just works."

**Learning:** when middleware is mounted broadly (`app.use(path, middleware, router)`),
check whether that middleware is content-type-aware before assuming it applies uniformly.

### OpenAPI docs were tried, then deliberately removed

Routes originally declared everything twice — a `registry.registerPath({...})` call
purely for OpenAPI metadata (feeding a generated `/api-docs` Swagger page), paired with
the actual `router.patch(...)` handler for the same route. The idea was appealing on
paper (**Zod schemas as the single source of truth**, reused for runtime validation,
static types, *and* docs, so they can't drift apart) but in practice, for a POC this
size, it meant every route was ~2x longer than a plain Express handler, for docs nobody
was actually consulting.

**Learning:** a "single source of truth reused N ways" pattern is only worth its
verbosity when all N consumers are real and used. Here the docs consumer wasn't — we
kept paying the complexity cost for a benefit nobody was collecting. Cut back to
`registry.registerPath` + a `defineRoute` wrapper that merged the two declarations, then
cut further to removing the OpenAPI layer entirely: [`food.controller.ts`](src/api/food.controller.ts)
is now a plain `router.get/post/patch/delete(path, handler)` router. Zod schemas
([`ai/schemas.ts`](src/ai/schemas.ts)) stayed, because they're still doing real work —
runtime validation of the OpenAI response and the one client-facing request body
(`PATCH /records/:id/components`), plus static types throughout — just not OpenAPI
generation. If real API docs are needed later, regenerating them from these same schemas
is the natural path back, but that's a "when actually needed" decision, not a "because
we can" one.

### Validate at the boundary, not everywhere

Request bodies coming from the client are the one place this codebase validates with
Zod at runtime (`safeParse` in the `PATCH /records/:id/components` handler). Internal
function calls (service → service) aren't re-validated — the type system is trusted
once data is inside the process. This follows the general principle: validate at
system boundaries (user input, external API responses), not defensively everywhere.
The OpenAI response is the *other* boundary that gets validated — see below.

### Service layer is a plain in-memory `Map`

[`nutrition-service.ts`](src/services/nutrition-service.ts) has no database — it's a
`Map<string, NutritionRecord>` behind a small class with `addRecord` / `getRecord` /
`updateComponents` / `deleteRecord`. This is fine for a POC and makes the class trivially
swappable for a real persistence layer later, since nothing outside this file knows
storage is in-memory. The tradeoff: state resets on every server restart (including
`nodemon` auto-restarts during development), which surprised us early on — a record
created before a restart is just gone.

### External API calls need their own validation gate

[`food-analyzer.ts`](src/services/food-analyzer.ts) calls OpenAI, then does three things
before trusting the result: regex-extracts the `{...}` JSON block (models sometimes wrap
JSON in prose), `JSON.parse`s it, then runs it through `MealAnalysisSchema.parse()`. If
any step fails, it throws and the route returns a 500. This is the same "validate at the
boundary" principle applied to an external service instead of a client request — never
trust a raw LLM completion to match your schema just because you asked it to.

---

## 2. How the React Native (Expo) frontend connects to the backend

### `localhost` does not mean what it means in a browser

This was the single biggest source of confusion. On a laptop, `fetch("http://localhost:3000")`
from a browser tab hits the server running on that same laptop — obviously. On a phone
running Expo Go, `localhost` means **the phone itself**, not your development machine.
There's no server listening on port 3000 on the phone, so requests just fail.

The fix is a plain config constant — [`mobile/src/config.ts`](mobile/src/config.ts) —
that has to be set to whichever of these actually applies:

| Where the RN app runs | What reaches the Mac's Express server |
|---|---|
| Physical phone (Expo Go) | `http://<your Mac's LAN IP>:3000` |
| Android emulator | `http://10.0.2.2:3000` (a special alias the emulator maps to the host) |
| iOS simulator | `http://localhost:3000` (the simulator shares the host's network stack) |

**Learning:** this constant has to be updated by hand every time your machine's LAN IP
changes (different Wi-Fi network, DHCP lease renewal, etc.) — it's not something Expo
can infer automatically. There's no way around this for a POC without adding a tunnel
(`expo start --tunnel`) or a real deployed backend.

### `fetch` isn't always the same `fetch`

The second non-obvious thing: as of Expo SDK 57, Expo installs its own WinterCG-spec
`fetch` (`expo/fetch`) as the **global** `fetch` on iOS/Android — so `fetch(...)`
anywhere in the app uses it automatically, without an explicit import. That
implementation only accepts a real `Blob`/`File` as a `FormData` part.

The older, very common React Native convention —

```ts
formData.append("image", { uri, name, type }); // plain object, not a Blob
```

— throws `Unsupported FormData part implementation` under this fetch, because a plain
object isn't a spec-compliant `Blob`. The fix used in
[`mobile/src/api.ts`](mobile/src/api.ts) is `expo-file-system`'s `File` class, which
*implements* `Blob` and can be built directly from a local `file://` URI:

```ts
import { File } from "expo-file-system";

const formData = new FormData();
formData.append("image", new File(image.uri)); // File implements Blob — this works
```

**Learning:** when a platform library changes a global (here, `fetch`), old
platform-specific idioms found in blog posts/Stack Overflow answers can silently stop
working with a cryptic runtime error instead of a type error, because everything still
typechecks (`FormData.append` accepts `any` in practice). Read the current version's
docs when something that "should just work" doesn't — don't assume the API is unchanged
across SDK majors. There's an escape hatch (`EXPO_PUBLIC_USE_RN_FETCH=1` reverts to
React Native's built-in fetch globally) but building against the new, spec-compliant
API is more future-proof than opting out of it.

### The dev server and the backend are two different processes on two different ports

Running the app for testing means two independent long-lived processes:

- `npm run dev` (project root) — the Express backend, port **3000**
- `npx expo start` (`mobile/`) — the Metro bundler / Expo dev server, port **8081**

Expo Go on the phone connects to port 8081 (to fetch the JS bundle and get live reload),
and *separately*, the JS code running inside the app makes its own HTTP calls to port
3000 (the API). They're independent: killing the Expo dev server doesn't stop the
backend and vice versa. Both need the same LAN reachability from the phone — if the
bundler loads but API calls fail (or the reverse), that's a sign to check which of the
two ports/processes is actually the problem.

### Permissions are requested explicitly, per-feature

Camera and photo library access aren't implicit — [`App.tsx`](mobile/App.tsx) calls
`ImagePicker.requestCameraPermissionsAsync()` / `requestMediaLibraryPermissionsAsync()`
before `launchCameraAsync()` / `launchImageLibraryAsync()`, and checks `.granted` before
proceeding. Skipping this doesn't error at build time — it just fails silently or
prompts unpredictably at runtime, so it's worth treating as a required step rather than
an optional nicety, even in a POC.
