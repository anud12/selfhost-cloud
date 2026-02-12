# Selfhost Cloud Infrastructure

## Artifactory
- **Registry URL**: `localhost:30500`
- **Push Images**: `docker push localhost:30500/image-name:tag`
- **Storage Location**: `/home/acriha/volumes/selfhost-cloud/artifactory`

## Load Balancer
| Endpoint | Port | Description |
|---|---|---|
| `/infrastructure/helm-deployer` | 80 | Helm Deployer - Deploy and manage infrastructure updates |
| `/` | 80 | Catch-all - Returns 404 for unmatched routes |

## Helm Deployer
- **Daemon**: Runs as a background Node.js HTTP server continuously listening for deployment requests
- **Purpose**: Executes deployment scripts and manages Kubernetes cluster updates