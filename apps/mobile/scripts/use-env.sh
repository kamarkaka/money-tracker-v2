#!/bin/bash
# Usage: ./scripts/use-env.sh dev|prod
# Symlinks .env to the specified environment file

ENV=${1:-dev}
cd "$(dirname "$0")/.."

if [ ! -f ".env.${ENV}" ]; then
  echo "Error: .env.${ENV} not found"
  exit 1
fi

ln -sf ".env.${ENV}" .env
echo "Switched to .env.${ENV}"
