# Azora — Server Deployment Guide
**Domain:** azora.aasanhai.pk

---

## 1 — Server prerequisites (run once)

```bash
# Update system
apt update && apt upgrade -y

# Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git

# Allow your user to run docker without sudo (re-login after)
usermod -aG docker $USER
```

---

## 2 — Clone the repo on the server

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/staking-platform.git
```

---

## 3 — Create the production env file

```bash
cp /var/www/staking-platform/frontend/.env.production \
   /var/www/staking-platform/frontend/.env

# Edit and fill in real values:
nano /var/www/staking-platform/frontend/.env
```

Required changes:
| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | Strong random password |
| `DATABASE_URL` | Update with the same password |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `NEXT_PUBLIC_CHAIN_ID` | `97` (testnet) or `56` (mainnet) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Already filled (`aad5b218b8ad1a4f0d2688cec9941fd3`) |

---

## 4 — Point DNS

Add an **A record** in your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A    | azora | `<your server IP>` |

Wait for propagation (usually 5–30 min).

---

## 5 — First deploy (HTTP only — needed for SSL cert)

Edit `nginx.conf` and **comment out the HTTPS server block** temporarily so nginx starts on port 80 only:

```bash
cd /var/www/staking-platform/frontend
```

Wrap the entire `server { listen 443 ... }` block in `nginx.conf` with `# ` or delete temporarily, then:

```bash
docker compose up -d db nginx certbot
```

Verify nginx is running:
```bash
curl http://azora.aasanhai.pk/.well-known/acme-challenge/test
```

---

## 6 — Get SSL certificate

```bash
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email hassanali5120@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d azora.aasanhai.pk
```

---

## 7 — Enable HTTPS + start all services

Restore the HTTPS block in `nginx.conf` (git checkout it), then:

```bash
docker compose up -d --build
```

Visit https://azora.aasanhai.pk — you should see the Azora landing page.

---

## 8 — Add GitHub Actions secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `DEPLOY_HOST` | Your server IP or hostname |
| `DEPLOY_USER` | SSH username (e.g., `root` or `ubuntu`) |
| `DEPLOY_PASSWORD` | SSH password |
| `DEPLOY_PORT` | SSH port (leave empty for default `22`) |

After this, every `git push` to `main` that touches `frontend/` will automatically deploy.

---

## Manual deploy (without GitHub Actions)

```bash
ssh user@your-server
cd /var/www/staking-platform
git pull origin main
cd frontend
docker compose up -d --build
docker image prune -f
```

---

## Useful commands

```bash
# View live logs
docker compose logs -f app

# Restart only the app (fast, no rebuild)
docker compose restart app

# Rebuild and restart (after code changes)
docker compose up -d --build app

# Open a shell inside the app container
docker compose exec app sh

# Run a database migration manually
docker compose exec app npx prisma migrate deploy

# Check container health
docker compose ps
```

---

## Database backups

```bash
# Dump
docker compose exec db pg_dump -U azora azora > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U azora azora < backup_20250101.sql
```
