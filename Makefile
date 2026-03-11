.PHONY: freeze-vision freeze-mesh build-mac build-windows build-all

BINARIES_DIR := apps/desktop/src-tauri/binaries

# Freeze the vision FastAPI service into a self-contained binary.
# Output lands in apps/desktop/src-tauri/binaries/ for Tauri to bundle.
freeze-vision:
	cd apps/vision && pyinstaller vision-server.spec --distpath ../../$(BINARIES_DIR)

# Freeze the mesh synthesis FastAPI service.
freeze-mesh:
	cd apps/mesh && pyinstaller mesh-server.spec --distpath ../../$(BINARIES_DIR)

# Build unsigned macOS universal binary (.dmg).
# Requires: Rust target aarch64-apple-darwin + x86_64-apple-darwin installed.
# Run: rustup target add aarch64-apple-darwin x86_64-apple-darwin
build-mac: freeze-vision freeze-mesh
	cd apps/desktop && pnpm run build:tauri -- --target universal-apple-darwin

# Build unsigned Windows installer (.msi).
# Must be run on Windows or via cross-compilation (not supported without Wine).
build-windows: freeze-vision freeze-mesh
	cd apps/desktop && pnpm run build:tauri -- --target x86_64-pc-windows-msvc

build-all: build-mac build-windows
