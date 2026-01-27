#!/bin/bash

# Image name
IMAGE_NAME="helm-deployer"

# Full image tag
if [ -n "$ARTIFACTORY_URL" ]; then
    FULL_IMAGE="$ARTIFACTORY_URL/$IMAGE_NAME:latest"
else
    FULL_IMAGE="$IMAGE_NAME:latest"
fi

echo "Building Docker image: $FULL_IMAGE"

docker build -t $FULL_IMAGE .

if [ -n "$ARTIFACTORY_URL" ]; then
    echo "Pushing Docker image to $ARTIFACTORY_URL..."
    docker push "$FULL_IMAGE"
else
    echo "No registry set. Image built locally only."
fi