# Selfhost Cloud Infrastructure
running on k3s
```
curl -sfL https://get.k3s.io | sh -
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

## Artifactory
- **Registry URL**: `localhost:30500`
- **Push Images**: `docker push localhost:30500/image-name:tag`
- **Storage Location**: `/home/acriha/volumes/selfhost-cloud/artifactory`

## Load Balancer
Done using gateway kubernetes api

```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.0/experimental-install.yaml --force-conflicts
```
```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
kubectl create namespace traefik
helm upgrade --install --version 39.0.0 --namespace traefik traefik traefik/traefik -f ./kubernetes_configs/traefik-values.yaml
```
| Endpoint | Port | Description |
|---|---|---|
| `/infrastructure/helm-deployer` | 80 | Helm Deployer - Deploy and manage infrastructure updates |
| `/` | 80 | Catch-all - Returns 404 for unmatched routes |

## Helm Deployer
- **Daemon**: Runs as a background Node.js HTTP server continuously listening for deployment requests
- **Purpose**: Executes deployment scripts and manages Kubernetes cluster updates


##