docker run --rm \
  -v /usr/local/bin/kubectl:/usr/local/bin/kubectl:ro \
  -v /usr/local/bin/helm:/usr/local/bin/helm:ro \
  -v $HOME/.kube:/home/user/.kube:ro \
  -e GITHUB_REPO=anud12/selfhost-cloud \
  --network host \
  -p 3000:3000 \
  helm-deployer