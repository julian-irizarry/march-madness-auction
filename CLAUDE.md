# CLAUDE.md

## Project Overview

March Madness Auction -- a real-time auction game where players bid on NCAA tournament teams via WebSockets. Frontend is React/Vite, backend is Python/FastAPI (planned migration to Rust).

## Architecture

- **Frontend:** React 18 + TypeScript + Vite + Material UI. SPA with react-router-dom. Communicates with backend via REST and WebSockets.
- **Backend:** FastAPI with WebSocket connections for real-time bidding. State is stored in-memory with pickle file persistence. No database.
- **Infrastructure:** AWS CDK (Python) deploying to ECS (EC2 launch type) behind an ALB. GitHub Actions CI/CD with OIDC authentication.
- **Build system:** Nix flakes for dev environment, run targets, and Docker image builds (no Dockerfiles).

## Key Patterns

- `nix develop` provides all dev tooling (Python, Node, AWS CLI, CDK)
- `nix run .#dev` starts frontend + backend locally via process-compose
- `nix build .#frontend-image` / `nix build .#backend-image` produce Docker images
- Deployment is triggered by pushing a git tag (`v*.*.*`)
- CORS is environment-aware: production allows `https://mmauctiongame.com`, development allows `localhost:3000`

## Important Files

- `flake.nix` -- Central build configuration. Dev shell, run targets, Docker image builds.
- `backend/app/api.py` -- All API endpoints and WebSocket handlers. This is the main backend file.
- `backend/app/game_tracker.py` -- Game state management and bracket logic.
- `frontend/src/Utils.tsx` -- Backend URL construction, shared types, bracket generation.
- `frontend/src/GamePage.tsx` -- Main game UI with bidding interface.
- `deployment/stacks/infra_stack.py` -- AWS infrastructure definition.

## Commands

```bash
nix develop              # Enter dev shell
nix run .#dev            # Start frontend + backend locally
nix run .#frontend       # Start frontend only
nix run .#backend        # Start backend only
nix build .#backend-image   # Build backend Docker image
nix build .#frontend-image  # Build frontend Docker image
nix fmt                     # Format all code (treefmt)
cd deployment && npx cdk synth   # Synthesize CloudFormation
cd deployment && npx cdk deploy MarchMadnessInfra -c image-tag=v1.0.0  # Deploy
```

## Things to Know

- The backend uses pickle files for persistence (`game_state.pkl`, `session_state.pkl`). These are gitignored.
- WebSocket connections are managed per-game in `game_connections` dict in `api.py`.
- The frontend bakes `VITE_BACKEND_HOST` and `VITE_BACKEND_PORT` at build time (Vite env vars). In production these are `mmauctiongame.com` and `443`.
- The `npmDepsHash` in `flake.nix` must be updated whenever `package-lock.json` changes.
- The backend is planned to migrate to Rust. When that happens, swap `pythonEnv` / `dockerTools.buildImage` in `flake.nix` to use `crane` or `buildRustPackage`.
- ECS uses bridge networking with `minHealthyPercent=0` (brief downtime during deploys is acceptable).
- Domain is `mmauctiongame.com` managed via Route 53.
- Formatting uses treefmt-nix (black, isort, mypy, prettier, nixfmt). Pre-commit hooks install automatically via `nix develop`.
