#!/bin/bash
set -e

# # Check for required environment variables
# if [[ -z "$GITHUB_REPO" ]]; then
#   echo "GITHUB_REPO must be set"
#   exit 1
# fi

# echo "Cloning repository"
# # Clone the repo using the PAT
# git init
# git remote add origin https://github.com/$GITHUB_REPO.git
# git fetch 
# git pull origin main

# ls -al;

# # Make deploy.sh executable
# chmod +x deploy.sh


# echo "Running deploy script"

# # Run deploy.sh
# # ./deploy.sh


exec node ./app.js