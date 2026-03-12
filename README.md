# Selfhost Cloud Infrastructure

This repository contains Helm charts, helper scripts and a small app set to run a self-hosted platform on a single Linux host using k3s.

This README documents the full, end-to-end steps to set up the project on a fresh Debian/Ubuntu machine (development / staging style).

Table of Contents

> Note: Use the "1." prefix for all numbered items below. Markdown renders them as an ordered list automatically, so you can reorder sections without renumbering.

1. [Prerequisites](#prerequisites)
1. [System setup](#system-setup)
1. [Quick reference — key files and paths](#quick-reference--key-files-and-paths)
1. [Install k3s (lightweight Kubernetes)](#install-k3s-lightweight-kubernetes)
1. [Install kubectl and Helm](#install-kubectl-and-helm)
1. [Prepare local registry (Artifactory)](#prepare-local-registry-artifactory)
1. [Build application images](#build-application-images)
1. [Install Gateway API and Traefik](#install-gateway-api-and-traefik)
1. [Endpoints (Traefik-proxied)](#endpoints-traefik-proxied)
1. [Deploy infrastructure and apps](#deploy-infrastructure-and-apps)
1. [Helm Deployer (optional)](#helm-deployer-optional)
1. [Troubleshooting](#troubleshooting)
1. [Security & Production notes](#security--production-notes)
1. [Contributing](#contributing)

---

<a name="prerequisites"></a>

## Prerequisites

> Quick summary: minimum OS, a sudo user, internet and required ports.

| Requirement | Suggested value | Notes |
|---|---:|---|
| OS | Debian/Ubuntu | Other distros may work but commands assume apt |
| User | sudo-capable user | Needed for installs and service management |
| Internet | Required | For downloading k3s, Helm, and charts |
| Ports | 80, 443, 30500 (registry) | Ensure firewall allows these if required |

<a name="system-setup"></a>

## System setup

> Summary: update system and install Docker and base tools.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git docker.io ca-certificates gnupg lsb-release
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out and log back in after this
```

Applicability: Docker is used to build and push images to the local registry (Artifactory). If you use podman/containerd only, adapt the build scripts accordingly.

<a name="quick-reference--key-files-and-paths"></a>

## Quick reference — key files and paths

> Summary: common helper scripts and paths used across the repo.

| Path | Purpose |
|---|---|
| ./deploy.sh | Top-level deploy helper (infrastructure then apps) |
| ./install_traefik.sh | Helper to install Traefik with values in ./kubernetes_config |
| ./kubernetes_config/traefik-values.yaml | Traefik values used by install script |
| ./apps/*/build.sh | Per-app image build scripts |
| /home/$USER/volumes/selfhost-cloud | Local storage used by Artifactory in examples |
| infrastructure/apps/helm-deployer | Helm Deployer daemon (Node.js) |

<a name="install-k3s-lightweight-kubernetes"></a>

## Install k3s (lightweight Kubernetes)

> Summary: install k3s and make kubeconfig available to the current user.

```bash
curl -sfL https://get.k3s.io | sh -
# Make kubeconfig available to current user
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

Verify cluster health:

```bash
kubectl get nodes
kubectl get pods -A
```

Applicability: k3s provides a minimal Kubernetes control plane suitable for single-node self-hosting.

<a name="install-kubectl-and-helm"></a>

## Install kubectl and Helm

> Summary: install tools required to interact with the cluster and deploy charts.

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
```

Applicability: Required to install Helm charts (infrastructure + apps).

<a name="prepare-local-registry-artifactory"></a>

## Prepare local registry (Artifactory)

> Summary: create local storage used in examples and set permissions.

```bash
mkdir -p /home/$USER/volumes/selfhost-cloud/artifactory
chown -R $USER:$USER /home/$USER/volumes/selfhost-cloud
```

Registry info used by scripts:

| Item | Value |
|---|---|
| Registry URL | localhost:30500 |
| Push example | docker push localhost:30500/image-name:tag |
| Storage location | /home/$USER/volumes/selfhost-cloud/artifactory |

Applicability: The repo's build scripts assume a local registry at localhost:30500. If you use a remote registry, export ARTIFACTORY_URL accordingly before building.

<a name="build-application-images"></a>

## Build application images

> Summary: per-app build scripts push images to ARTIFACTORY_URL.

```bash
export ARTIFACTORY_URL=localhost:30500
./apps/static_file/build.sh
./apps/in-memory-map/build.sh
```

Applicability: Building images is optional for trying the charts if the images are already available; otherwise build and push are required for local deployments.

<a name="install-gateway-api-and-traefik"></a>

## Install Gateway API and Traefik (ingress)

> Summary: Gateway API for LBs and Traefik as ingress/controller.

Gateway API (used for LB/gateway):

```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.0/experimental-install.yaml --force-conflicts
```

Install Traefik (ingress controller) — repo includes a helper that references the local values file at ./kubernetes_config/traefik-values.yaml:

```bash
./install_traefik.sh
# or manually:
helm repo add traefik https://traefik.github.io/charts
helm repo update
kubectl create namespace traefik || true
helm upgrade --install --version 39.0.0 --namespace traefik traefik traefik/traefik -f ./kubernetes_config/traefik-values.yaml
```

Applicability: Traefik provides ingress and routing for the apps. The repo expects the values file under ./kubernetes_config (singular).

<a name="endpoints-traefik-proxied"></a>

## Endpoints (Traefik-proxied)

> Summary: endpoints exposed by the stack (default Traefik proxy)

| Endpoint | Port | Description |
|---|---:|---|
| /infrastructure/helm-deployer | 80 | Helm Deployer - Deploy and manage infrastructure updates |
| / | 80 | Catch-all - Returns 404 for unmatched routes |

<a name="deploy-infrastructure-and-apps"></a>

## Deploy infrastructure and apps

> Summary: run the top-level deploy script which installs Helm charts.

```bash
./deploy.sh
```

This runs Helm installs for the infrastructure then for the apps. Check releases with:

```bash
helm -n <namespace> list
```

<a name="helm-deployer-optional"></a>

## Helm Deployer (optional)

> Summary: small Node.js HTTP daemon to run deployment scripts remotely.

A small Node.js daemon (infrastructure/apps/helm-deployer) can run deployment scripts via HTTP. Endpoints are proxied by Traefik as listed above.

Run locally:

```bash
node infrastructure/apps/helm-deployer/app.js
# or use the provided start helper:
# infrastructure/apps/helm-deployer/start-daemon.sh
```

Applicability: Useful for automated, webhook-driven deploys. Not strictly required to run the cluster but convenient.

<a name="troubleshooting"></a>

## Troubleshooting

| Problem | Check / Command |
|---|---|
| k3s not starting | sudo journalctl -u k3s -f |
| Pods failing | kubectl get pods -A && kubectl describe pod <pod> -n <ns> |
| Traefik issues | kubectl -n traefik logs deploy/traefik |
| Helm releases | helm -n <ns> list |
| Image pull failures | Ensure registry reachable from nodes; configure k3s containerd registry mirror if needed |

---
