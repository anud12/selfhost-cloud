
for file in ./infrastructure/charts/*.tgz; do
  if [ -f "$file" ]; then
    echo "Deleting $file"
    rm -f "$file"
  fi
done

HELM_DRIVER=configmap 
helm dependency update ./infrastructure
helm dependency build ./infrastructure

helm upgrade --install \
  --create-namespace \
  --rollback-on-failure \
  --cleanup-on-fail \
  --reuse-values \
  selfhost-cloud-infrastucture ./infrastructure


helm dependency update ./helm
helm dependency build ./helm

helm upgrade --install \
  --create-namespace \
  --rollback-on-failure \
  --cleanup-on-fail \
  --reuse-values \
  selfhost-cloud ./helm