#!/bin/bash
# ============================================================
# Script de premier déploiement sur O2Switch
# À exécuter UNE SEULE FOIS en SSH pour initialiser le serveur
#
# Usage : bash scripts/setup-server.sh
# ============================================================

set -e

REPO_URL="https://github.com/TON_USERNAME/Poulvia.git"
DOMAIN="poulvia.com"

echo "🚀 Initialisation du serveur O2Switch pour $DOMAIN"
echo "=================================================="

# ── 1. API Symfony ──────────────────────────────────────────
echo ""
echo "📦 [1/4] Initialisation API Symfony..."

mkdir -p ~/public_html/api
cd ~/public_html/api

git init
git remote add origin $REPO_URL
git fetch origin main
git checkout main

# Dépendances PHP
composer install --no-dev --optimize-autoloader --no-interaction

# Clés JWT (à faire UNE SEULE FOIS)
mkdir -p config/jwt
echo "🔑 Génération des clés JWT RSA 4096..."
openssl genrsa -out config/jwt/private.pem -aes256 4096
openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem
chmod 600 config/jwt/private.pem

# Cache
php bin/console cache:clear --env=prod --no-debug
php bin/console cache:warmup --env=prod --no-debug

echo "✅ API initialisée (pense à créer .env.local !)"

# ── 2. Landing (statique) ───────────────────────────────────
echo ""
echo "🌍 [2/4] La landing sera déployée via rsync depuis la CI"
echo "   → Pas d'initialisation nécessaire sur le serveur"

# ── 3. Web App ──────────────────────────────────────────────
echo ""
echo "🖥️  [3/4] Initialisation Web App éleveurs..."

mkdir -p ~/public_html/app
cd ~/public_html/app

git init
git remote add origin $REPO_URL
git fetch origin main

# Checkout uniquement le dossier web/
git config core.sparseCheckout true
echo "web/" > .git/info/sparse-checkout
git checkout main

# Copier les fichiers web/ à la racine du dossier app/
cp -r web/* .
cp web/.* . 2>/dev/null || true

npm ci --omit=dev
NEXT_PUBLIC_API_URL=https://api.poulvia.com npm run build

# Fichier de démarrage Passenger pour O2Switch
cat > server.js << 'EOF'
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`> Web App démarrée sur port ${port}`)
  })
})
EOF

echo "✅ Web App initialisée"

# ── 4. Admin ────────────────────────────────────────────────
echo ""
echo "🛡️  [4/4] Initialisation Admin Console..."

mkdir -p ~/public_html/admin
cd ~/public_html/admin

git init
git remote add origin $REPO_URL
git fetch origin main

git config core.sparseCheckout true
echo "admin/" > .git/info/sparse-checkout
git checkout main

cp -r admin/* .
cp admin/.* . 2>/dev/null || true

npm ci --omit=dev
NEXT_PUBLIC_API_URL=https://api.poulvia.com npm run build

cp ../app/server.js server.js
sed -i 's/port 3000/port 3001/' server.js
sed -i 's/Web App/Admin Console/' server.js

echo "✅ Admin Console initialisée"

echo ""
echo "=================================================="
echo "✅ Initialisation terminée !"
echo ""
echo "⚠️  ACTIONS MANUELLES RESTANTES :"
echo "   1. Créer ~/public_html/api/.env.local avec tes secrets"
echo "   2. Lancer les migrations : cd ~/public_html/api && php bin/console doctrine:migrations:migrate"
echo "   3. Dans cPanel → 'Setup Node.js App' : configurer app/ et admin/"
echo "   4. Dans cPanel → 'Sous-domaines' : pointer api/ vers public_html/api/public"
echo "   5. Ajouter les secrets GitHub (voir docs/GITHUB_SECRETS.md)"
echo "=================================================="
