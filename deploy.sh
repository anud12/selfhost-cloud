
for file in ./charts/*.tgz; do
  if [ -f "$file" ]; then
    echo "Deleting $file"
    rm -f "$file"
  fi
done

HELM_DRIVER=configmap 
helm dependency build
helm upgrade --install --create-namespace --cleanup-on-fail --kube-as-user acriha selfhost-cloud .
