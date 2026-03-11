# Copilot instructions — selfhost-cloud

Purpose: concise, repo-specific notes for GitHub Copilot sessions (build/run/deploy, high-level architecture, and local conventions).

---

## Quick commands (build / deploy / run)

- Build app Docker images (per-app build scripts):
  - ./apps/in-memory-map/build.sh
  - ./apps/static_file/build.sh
  - Example (push to local Artifactory):
    - export ARTIFACTORY_URL=localhost:30500
    - ./apps/static_file/build.sh

- Deploy / update Helm charts (root):
  - From repo root: ./deploy.sh
  - What deploy.sh does (manual equivalent):
    - HELM_DRIVER=configmap
    - helm dependency build ./infrastructure && helm dependency update ./infrastructure
    - helm upgrade --install --create-namespace --rollback-on-failure --cleanup-on-fail --reuse-values selfhost-cloud-infrastucture ./infrastructure
    - helm dependency build ./helm && helm dependency update ./helm
    - helm upgrade --install --create-namespace --rollback-on-failure --cleanup-on-fail --reuse-values selfhost-cloud ./helm

- Install Traefik (helper):
  - ./install_traefik.sh  (runs helm upgrade --install traefik ... -f ./kubernetes_config/traefik-values.yaml)

- Run Helm Deployer (infrastructure/apps/helm-deployer):
  - Run directly: node infrastructure/apps/helm-deployer/app.js
  - Run helper to install as systemd service: infrastructure/apps/helm-deployer/start-daemon.sh
  - The daemon listens for a GET and streams the output of the root `deploy.sh` script.

- Local k3s quick setup (from infrastructure/README.md):
  - curl -sfL https://get.k3s.io | sh -
  - sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown $(id -u):$(id -g) ~/.kube/config

- CI/webhook note:
  - .github/workflows/push-notification.yml invokes: curl http://<host>/infrastructure/helm-deployer (on push to main). The helm-deployer endpoint triggers a deploy.

- Tests / Lint:
  - No test or lint scripts were detected in this repository at the time of analysis.

---

## High-level architecture

- Purpose: infrastructure-as-code for a self-hosted k3s-based cluster (helm charts + small example apps).

- Top-level components:
  - infrastructure/  — Helm charts for cluster-level things (load-balancer, artifactory) and the helm-deployer app.
  - helm/            — application-level charts for the services in `apps/`.
  - apps/            — source for runnable example apps; each app includes a Dockerfile, a small build.sh, and an app-local Helm chart (apps/*/helm).
  - deploy.sh        — orchestrates building helm dependencies and running helm upgrade --install for infrastructure and app charts.
  - infrastructure/apps/helm-deployer — Node.js daemon that clones the repo and executes deploy.sh when triggered.

- Runtime flows:
  - Developers push to main → GitHub Action (push-notification) triggers the helm-deployer endpoint → helm-deployer clones and runs deploy.sh → Helm upgrades charts in cluster.
  - Images are built with per-app build.sh and pushed only when ARTIFACTORY_URL is set (default: local build only).

---

## Key repository conventions and patterns

- ARTIFACTORY_URL env var controls image publishing:
  - If set, ./apps/*/build.sh pushes built images to $ARTIFACTORY_URL/<image>:latest.
  - Default local registry (documented in infrastructure/README.md): localhost:30500

- deploy.sh expectations:
  - Assumes Helm and kubectl are installed and configured (kubeconfig available).
  - Uses HELM_DRIVER=configmap and --reuse-values when performing helm upgrades.
  - Builds helm dependencies before upgrade.

- Helm Deployer behavior:
  - The daemon (infrastructure/apps/helm-deployer) streams stdout of the deploy script to the requester and cleans up the temporary clone after running.
  - It expects a deploy.sh at the repo root and sufficient permissions on the host to run Helm/kubectl.

- App runtime conventions:
  - apps/in-memory-map reads a `store` env var (JSON string) to pre-seed data; values can be `env:VAR_NAME` or `request:<url>` to resolve dynamically.
  - apps/in-memory-map logs structured JSON to stdout for easy ingestion by log collectors.

- Service startup helpers assume Linux/systemd when using start-daemon.sh.

- DNS updater scripts expect Cloudflare environment variables (CF_API_TOKEN, CF_ZONE_ID, CF_RECORD_ID, CF_RECORD_NAME) but do not include secrets in the repo-specific notes.

---

## Files / locations to inspect (fast shortcuts)

- deploy.sh — root orchestrator for helm operations
- infrastructure/README.md — cluster and artifactory notes
- infrastructure/apps/helm-deployer/* — daemon implementation and start script
- apps/*/build.sh and apps/*/Dockerfile — per-app image build and Helm charts under apps/*/helm
- .github/workflows/push-notification.yml — CI trigger that notifies helm-deployer

---

## AI assistant / tooling notes

- No special AI-assistant config files (CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, CONVENTIONS.md, etc.) were found during analysis.

---

If you want this file tuned (for example: add explicit command snippets for developing inside each app, CI triggers, or recommended tests/linting commands), say which area to expand and Copilot can update it.
