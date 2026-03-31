# SmileGen Project

## Overview
Monorepo for dental smile design software with:
- `apps/desktop` - Tauri/React desktop app (TypeScript)
- `apps/api` - Python FastAPI backend
- `apps/vision` - Python vision service (face landmark detection)

## Tech Stack
- **Desktop**: Tauri 2, React 19, TypeScript, Zustand, React Three Fiber
- **API**: Python FastAPI, Prisma, PostgreSQL
- **Vision**: Python, MediaPipe, FastAPI

## Commands
- `pnpm install` - Install all dependencies
- `pnpm --filter @smilegen/desktop dev` - Run desktop app
- `pnpm --filter @smilegen/api dev` - Run API (requires PostgreSQL)
- `pnpm --filter @smilegen/vision dev` - Run vision service

## Testing
- Desktop: `pnpm --filter @smilegen/desktop test`
- API: `cd apps/api && .venv/bin/pytest`
- Vision: `cd apps/vision && .venv/bin/pytest`

## Environment
- PostgreSQL required for API (see docker-compose.yml)
- Node.js 18+, Python 3.11+
