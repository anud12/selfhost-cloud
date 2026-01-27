# helm uninstall selfhost-cloud

for file in ./charts/*.tgz; do
  if [ -f "$file" ]; then
    echo "Deleting $file"
    rm -f "$file"
  fi
done
helm dependency build
helm template selfhost-cloud . | kubectl apply -f -