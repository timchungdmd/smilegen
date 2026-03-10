# SmileGen — Vision Integration + Tauri Packaging Design

**Date:** 2026-03-10
**Status:** Approved
**Scope:** Wire the `apps/vision` MediaPipe service into the desktop app; package the full application (desktop + vision sidecar + mesh sidecar) into unsigned macOS `.dmg` and Windows `.msi` installers.

---

## Decisions

| Question | Decision |
|---|---|
| Service deployment model | Tauri sidecar — fully offline, self-contained |
| Target platforms | macOS + Windows (unsigned builds) |
| Vision trigger | Manual "Auto-detect" button in CaptureView |
| Vision result scope | Overlay guides + mouth mask + draggable commissure markers |
| Code signing | Unsigned for beta |

---

## Part 1: Vision Service Integration

### Overview

The `apps/vision` FastAPI service (MediaPipe 468-point face mesh) is fully built but not called by the desktop. The desktop currently uses a simulated landmark detector (`features/analysis/facialLandmarks.ts`) that guesses positions from image dimensions. This design replaces that with real detection triggered by a manual button, while keeping the simulated path as a dev fallback.

### New file: `apps/desktop/src/services/visionClient.ts`

Mirrors `meshSynthesisClient.ts` in structure. Two exports:

```ts
detectLandmarks(imageBlob: Blob): Promise<VisionLandmarkResult>
getMouthMask(imageBlob: Blob): Promise<Blob>
```

`VisionLandmarkResult` shape:
```ts
interface VisionLandmarkResult {
  midlineX: number           // normalized 0–1
  commissureLeft: { x: number; y: number }
  commissureRight: { x: number; y: number }
  smileArcY: number          // normalized Y of upper lip center
  gingivalLineY: number      // estimated Y above smileArcY
  lipContour: { inner: Point[]; outer: Point[] }
  mouthMaskBbox: { xMin: number; yMin: number; xMax: number; yMax: number }
}
```

Base URL: `import.meta.env.VITE_VISION_API_URL ?? "http://localhost:8003"`.

On HTTP error or fetch failure (service not running), throws with a user-readable message so CaptureView can show a toast and fall back gracefully.

### CaptureView changes

**Stage header** — "Auto-detect" button:
- Disabled until `uploadedPhotos.length > 0`
- Disabled (shows spinner) while detection is in progress
- If `sidecarState !== "ready"` shows "Vision offline" and is non-functional
- On click: calls `detectLandmarks` with the first uploaded photo, then `getMouthMask`

**On success**, writes to stores:
- `useViewportStore`: `setMidlineX`, `setSmileArcY`, `setGingivalLineY`, `setLeftCommissureX`, `setRightCommissureX` (all converted from normalized 0–1 to percent 0–100)
- `useViewportStore`: `clearAlignmentMarkers()` then `addAlignmentMarker()` for left and right commissures (type `"cusp"`, draggable in the overlay)
- `useImportStore`: `setMouthMaskUrl(objectUrl)` — new field, stores `URL.createObjectURL(maskBlob)`

**On failure**: inline error banner in CaptureView (not a modal), manual alignment wizard remains available.

### PhotoOverlay change

When `mouthMaskUrl` is set in import store, the `<PhotoOverlay>` component in SimulateView applies it as a CSS `mask-image` on the photo layer, isolating the smile zone. This suppresses noise from nose/chin in the Simulate overlay.

The mask URL is revoked (via `URL.revokeObjectURL`) when `clearAll()` is called on the import store.

### `useImportStore` additions

```ts
mouthMaskUrl: string | null   // new field
setMouthMaskUrl: (url: string | null) => void
```

`clearAll()` updated to revoke and clear `mouthMaskUrl`.

### Dev fallback

`facialLandmarks.ts` (simulated detector) is kept unchanged. If the vision service fetch throws a network error, `visionClient.ts` re-throws it; `CaptureView` catches it and shows the error banner. The user can still use the manual alignment wizard. No automatic fallback to the simulated detector in production — the distinction should be explicit.

---

## Part 2: Tauri Packaging + Installer

### Overview

The app currently runs as a plain Vite dev server. `src-tauri/` exists with stub Rust code but no `tauri.conf.json`. This design completes the Tauri setup, freezes the two Python services as sidecar binaries, wires lifecycle management in Rust, and establishes a build pipeline for macOS `.dmg` and Windows `.msi`.

### `apps/desktop/src-tauri/tauri.conf.json`

Key fields:
```json
{
  "productName": "SmileGen",
  "version": "0.1.0",
  "identifier": "com.smilegen.desktop",
  "build": {
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "SmileGen",
      "width": 1280,
      "height": 800,
      "minWidth": 1024,
      "minHeight": 680
    }]
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi"],
    "externalBin": ["binaries/vision-server", "binaries/mesh-server"]
  }
}
```

No updater configured. No deeplink. No system tray.

### PyInstaller freeze

Each service gets a `build.spec` file at the service root:

**`apps/vision/vision-server.spec`**
- Entry: `apps/vision/src/main.py` (uvicorn ASGI entry)
- Data: bundles `face_landmarker.task` model file
- Output name: platform-suffixed per Tauri convention
  - macOS: `vision-server-x86_64-apple-darwin` (Intel) + `vision-server-aarch64-apple-darwin` (Apple Silicon)
  - Windows: `vision-server-x86_64-pc-windows-msvc.exe`

**`apps/mesh/mesh-server.spec`**
- Entry: `apps/mesh/src/main.py`
- No data files needed
- Same platform-suffixed naming

Frozen binaries land in `apps/desktop/src-tauri/binaries/` which is Tauri's expected sidecar binary directory.

### Rust sidecar management (`src-tauri/src/`)

**`Cargo.toml` additions:**
```toml
tauri-plugin-shell = "2"
```

**`main.rs`:**
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
        commands::start_sidecars(app.handle())?;
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![commands::generate_variants])
    .run(tauri::generate_context!())
    .expect("failed to run tauri app");
```

**`commands.rs` — `start_sidecars()`:**
1. Spawns `vision-server` on port `8003` via `tauri_plugin_shell::process::Command`
2. Spawns `mesh-server` on port `8002`
3. Health-check loop: polls `http://localhost:8003/health` and `http://localhost:8002/health` up to 10 times with 500 ms delay
4. On both healthy: emits `"sidecars-ready"` event to all windows
5. On timeout: emits `"sidecars-unavailable"` event
6. Stores process handles in `AppState` (wrapped in `Mutex`) for cleanup

**Cleanup:** `app.on_window_event` — on `WindowEvent::Destroyed`, kills both child processes from `AppState`.

### Frontend sidecar state — `useSidecarStore`

New Zustand store (no persist):
```ts
type SidecarState = "starting" | "ready" | "unavailable"

useSidecarStore:
  state: SidecarState   // default: "starting"
```

Listens for `"sidecars-ready"` and `"sidecars-unavailable"` Tauri events via `@tauri-apps/api/event`. Falls back to `"ready"` after 30 s timeout in non-Tauri environments (plain Vite dev mode) so the button still works against a locally running service.

CaptureView consumes `useSidecarStore` to gate the "Auto-detect" button:
- `"starting"` → button text "Services loading…", disabled
- `"ready"` → button active
- `"unavailable"` → button text "Vision offline", disabled, tooltip explains

### `package.json` additions

```json
"scripts": {
  "tauri": "tauri",
  "build:tauri": "tauri build"
},
"devDependencies": {
  "@tauri-apps/cli": "^2",
  "@tauri-apps/api": "^2"
}
```

### Build pipeline — `Makefile`

```makefile
freeze-vision:
    cd apps/vision && pyinstaller vision-server.spec --distpath ../../apps/desktop/src-tauri/binaries

freeze-mesh:
    cd apps/mesh && pyinstaller mesh-server.spec --distpath ../../apps/desktop/src-tauri/binaries

build-mac: freeze-vision freeze-mesh
    cd apps/desktop && npm run build:tauri -- --target universal-apple-darwin

build-windows: freeze-vision freeze-mesh
    cd apps/desktop && npm run build:tauri -- --target x86_64-pc-windows-msvc

build-all: build-mac build-windows
```

### GitHub Actions CI

Two jobs in `.github/workflows/release.yml`:

**`build-mac`** (runs on `macos-latest`):
1. Install Python deps + PyInstaller
2. `make freeze-vision freeze-mesh`
3. Install Rust + `@tauri-apps/cli`
4. `make build-mac`
5. Upload `*.dmg` as release artifact

**`build-windows`** (runs on `windows-latest`):
1. Same freeze steps (Windows PyInstaller outputs `.exe`)
2. `make build-windows`
3. Upload `*.msi` as release artifact

Both jobs triggered on `push` to `main` or on manual `workflow_dispatch`.

---

## File Change Summary

### New files
| File | Purpose |
|---|---|
| `apps/desktop/src/services/visionClient.ts` | HTTP client for vision service |
| `apps/desktop/src/store/useSidecarStore.ts` | Sidecar lifecycle state |
| `apps/desktop/src-tauri/tauri.conf.json` | Tauri app configuration |
| `apps/vision/vision-server.spec` | PyInstaller spec for vision sidecar |
| `apps/mesh/mesh-server.spec` | PyInstaller spec for mesh sidecar |
| `Makefile` | Freeze + build pipeline |
| `.github/workflows/release.yml` | CI/CD for macOS + Windows builds |

### Modified files
| File | Change |
|---|---|
| `apps/desktop/src/features/views/CaptureView.tsx` | Auto-detect button, sidecar state gating |
| `apps/desktop/src/features/overlay/PhotoOverlay.tsx` | Mouth mask CSS masking |
| `apps/desktop/src/store/useImportStore.ts` | `mouthMaskUrl` field |
| `apps/desktop/src-tauri/src/main.rs` | Plugin + setup hook |
| `apps/desktop/src-tauri/src/commands.rs` | `start_sidecars()`, `AppState` |
| `apps/desktop/src-tauri/Cargo.toml` | `tauri-plugin-shell` dependency |
| `apps/desktop/package.json` | Tauri CLI/API deps + scripts |
