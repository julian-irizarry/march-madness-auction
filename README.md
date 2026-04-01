# March Madness Auction

A real-time auction game for March Madness brackets. Players join a game, bid on NCAA tournament teams, and track their portfolio's performance as the tournament progresses.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Material UI
- **Backend:** Python, FastAPI, WebSockets, Uvicorn
- **Infrastructure:** AWS CDK (Python), ECS, ALB, Route 53, ACM
- **CI/CD:** GitHub Actions with OIDC authentication
- **Build:** Nix flakes for reproducible builds and Docker images

## Prerequisites

- [Nix](https://nixos.org/download/) with flakes enabled

That's it. Nix provides Python, Node, AWS CLI, CDK, and all other tooling.

## Local Development

Enter the dev shell:

```bash
nix develop
```

Start both frontend and backend:

```bash
nix run .#dev
```

This launches [process-compose](https://github.com/F1bonacc1/process-compose), which runs the Vite dev server (port 3000) and Uvicorn (port 8000) together with a TUI for log output.

To run services individually:

```bash
nix run .#frontend   # Vite dev server on port 3000
nix run .#backend    # Uvicorn on port 8000
```

### First time setup

Install frontend dependencies (only needed once, or when `package.json` changes):

```bash
cd frontend && npm install
```

### Pre-commit hooks

```bash
pip install -r requirements-dev.txt
pre-commit install
```

Pre-commit runs against staged files on `git commit`. To run manually:

```bash
pre-commit run --all-files
```

## Building Docker Images

Images are built with Nix (no Dockerfiles):

```bash
nix build .#backend-image    # Backend: Python/FastAPI with Uvicorn
nix build .#frontend-image   # Frontend: Vite build served by Nginx
```

Load into Docker:

```bash
docker load < result
```

## Deployment

The app is deployed to AWS (ECS behind an ALB) at `mmauctiongame.com`.

### How it works

1. Push a git tag: `git tag v1.2.3 && git push origin v1.2.3`
2. GitHub Actions builds Docker images with Nix
3. Images are pushed to ECR
4. CDK deploys the updated ECS services

Authentication uses OIDC -- no AWS credentials stored in GitHub.

### First deploy

See [FIRST_DEPLOY.md](FIRST_DEPLOY.md) for initial setup steps.

### Infrastructure

The CDK stacks live in `deployment/`:

- `stacks/oidc_stack.py` -- GitHub OIDC provider + IAM deploy role (deployed once)
- `stacks/infra_stack.py` -- VPC, ALB, ECS, Route 53, ACM, ECR (deployed per release)

## Project Structure

```
flake.nix                  # Nix: dev shell, run targets, Docker image builds
process-compose.yaml       # Local dev: runs frontend + backend together
frontend/                  # React/TypeScript/Vite
backend/                   # Python/FastAPI
deployment/                # AWS CDK (Python)
  app.py                   # CDK app entry point
  stacks/
    oidc_stack.py           # GitHub OIDC + IAM role
    infra_stack.py          # ECS, ALB, Route 53, ACM, ECR
.github/workflows/
  deploy.yml               # CI/CD: build, push, deploy on tag
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | `production` or `development` -- controls CORS origins |
| `VITE_BACKEND_HOST` | `127.0.0.1` | Backend host for API calls |
| `VITE_BACKEND_PORT` | `8000` | Backend port for API calls |
