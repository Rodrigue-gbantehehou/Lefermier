# 🔑 GitHub Secrets — Configuration pour le déploiement

Ce fichier documente les secrets à configurer dans GitHub pour activer le déploiement automatique.

**GitHub → Settings → Secrets and variables → Actions → New repository secret**

---

## Secrets obligatoires

| Nom du secret | Valeur | Où trouver |
|---|---|---|
| `O2SWITCH_SSH_HOST` | IP ou hostname du serveur | Email de bienvenue O2Switch |
| `O2SWITCH_SSH_USER` | Nom d'utilisateur cPanel | Email de bienvenue O2Switch |
| `O2SWITCH_SSH_PORT` | `22` (défaut) | Email de bienvenue O2Switch |
| `O2SWITCH_SSH_PRIVATE_KEY` | Clé privée SSH (voir ci-dessous) | Généré par toi |

---

## Générer la clé SSH pour GitHub Actions

Sur ton PC (ou dans Git Bash) :

```bash
# Générer une paire de clés SSH dédiée au déploiement
ssh-keygen -t ed25519 -C "github-actions-poulvia-deploy" -f ~/.ssh/poulvia_deploy

# Afficher la clé PUBLIQUE → à ajouter sur O2Switch
cat ~/.ssh/poulvia_deploy.pub

# Afficher la clé PRIVÉE → à mettre dans GitHub Secrets
cat ~/.ssh/poulvia_deploy
```

### Sur O2Switch (cPanel → "Gestionnaire de clés SSH") :

1. Coller la **clé publique** (`poulvia_deploy.pub`) dans "Importer une clé"
2. L'autoriser via "Gérer les clés" → "Autoriser"

### Dans GitHub Secrets :

Mettre la **clé privée complète** (tout le contenu de `poulvia_deploy`) dans le secret `O2SWITCH_SSH_PRIVATE_KEY`, y compris les lignes :
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

---

## Variables d'environnement (pas des secrets)

Dans **GitHub → Settings → Secrets and variables → Variables** :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.poulvia.com` |

---

## Fichier `.env.local` sur le serveur (à créer manuellement)

Ce fichier contient les **vrais secrets de production** et ne doit **jamais** être committé.

```bash
# Sur O2Switch via SSH :
nano ~/public_html/api/.env.local
```

Contenu :
```env
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=GENERE_AVEC_openssl_rand_-hex_32
APP_SHARE_DIR=var/share

DATABASE_URL="mysql://poulvia_user:TON_MOT_DE_PASSE@127.0.0.1:3306/poulvia_prod?serverVersion=8.0.32&charset=utf8mb4"

DEFAULT_URI=https://api.poulvia.com
CORS_ALLOW_ORIGIN='^https://(poulvia\.com|www\.poulvia\.com|app\.poulvia\.com|admin\.poulvia\.com)$'

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=GENERE_UNE_PASSPHRASE_SECURISEE
```

Générer `APP_SECRET` :
```bash
openssl rand -hex 32
```
