#!/usr/bin/env bash
# Publica InfoStudio Pro en GitHub Pages (rama gh-pages) desde esta carpeta.
# Uso:  ./deploy.sh git@github.com:USUARIO/REPO.git
set -euo pipefail
REMOTE="${1:?Uso: ./deploy.sh <remote-url>}"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
[ -d .git ] || { echo "→ inicializando repositorio"; git init -q; git add -A; git commit -qm "InfoStudio Pro"; }
git add -A
git commit -qm "InfoStudio Pro: build $(date +%F_%H%M)" || true
git branch -M gh-pages
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git push -u origin gh-pages --force
echo "✅ Subido. Activa Pages → rama gh-pages / root si es la primera vez."
