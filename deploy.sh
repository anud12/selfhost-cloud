for file in ./charts/*.tgz; do
  if [ -f "$file" ]; then
    echo "Deleting $file"
    rm -f "$file"
  fi
done
helm dependency build;

HELM_DRIVER=configmap 
helm upgrade selfhost-cloud --create-namespace --install  --cleanup-on-fail .