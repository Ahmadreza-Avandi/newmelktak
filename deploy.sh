#!/usr/bin/env bash
# First install on a fresh Ubuntu/Debian VPS:
# sudo DOMAIN=melktak.kdns.fr SSL_EMAIL=you@example.com bash deploy.sh
set -Eeuo pipefail
IFS=$'\n\t'
DOMAIN="${DOMAIN:-melktak.kdns.fr}"
SSL_EMAIL="${SSL_EMAIL:-}"
APP_NAME=melktak APP_PORT=3000 SERVICE_USER=melktak
APP_DIR=/srv/melktak/app DATA_DIR=/var/lib/melktak ENV_FILE=/etc/melktak.env
DB_NAME=amlak_os DB_USER=amlak_app
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
die() { echo "ERROR: $*" >&2; exit 1; }
[[ $EUID == 0 ]] || die 'Run with sudo/root.'
[[ $DOMAIN =~ ^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]] || die 'Invalid DOMAIN.'
[[ -f "$SCRIPT_DIR/package.json" && -f "$SCRIPT_DIR/server.ts" ]] || die 'Run from project directory.'
[[ ! -e "$ENV_FILE" ]] || die "$ENV_FILE already exists. Use update instructions in DEPLOYMENT.fa.md."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg openssl nginx certbot python3-certbot-nginx postgresql postgresql-contrib rsync build-essential
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(`.`)[0]')" != 24 ]]; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  chmod a+r /etc/apt/keyrings/nodesource.gpg
  echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main' > /etc/apt/sources.list.d/nodesource.list
  apt-get update && apt-get install -y nodejs
fi
getent group "$SERVICE_USER" >/dev/null || groupadd --system "$SERVICE_USER"
id -u "$SERVICE_USER" >/dev/null 2>&1 || useradd --system --gid "$SERVICE_USER" --home-dir /srv/melktak --shell /usr/sbin/nologin "$SERVICE_USER"
install -d -o "$SERVICE_USER" -g "$SERVICE_USER" "$APP_DIR" "$DATA_DIR/amlak_postgres" "$DATA_DIR/uploads/properties" "$DATA_DIR/private_documents" "$DATA_DIR/logs"
# Do not copy local databases, uploads, logs or secrets to the VPS; never delete destination files.
rsync -a --exclude='.git/' --exclude='node_modules/' --exclude='dist/' --exclude='data/' --exclude='.env' --exclude='.env.*' "$SCRIPT_DIR/" "$APP_DIR/"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR" "$DATA_DIR"
systemctl enable --now postgresql
DB_PASSWORD="$(openssl rand -hex 32)"
if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then die "Role $DB_USER exists; refusing to alter it."; fi
if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then die "Database $DB_NAME exists; refusing to alter it."; fi
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD'"
runuser -u postgres -- createdb --owner="$DB_USER" --encoding=UTF8 "$DB_NAME"
ADMIN_PASSWORD="$(openssl rand -hex 24)"
PLATFORM_PATH="/platform-$(openssl rand -hex 16)"
ADMIN_USER="${PLATFORM_ADMIN_USERNAME:-platform_owner}"
EMAIL="${SSL_EMAIL:-admin@$DOMAIN}"
umask 077
cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$APP_PORT
DATA_DIR=$DATA_DIR
APP_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN
TRUST_PROXY=loopback
SEED_DEMO_DATA=false
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME
PGSSL=false
PG_POOL_MAX=10
PLATFORM_PATH=$PLATFORM_PATH
PLATFORM_ADMIN_USERNAME=$ADMIN_USER
PLATFORM_ADMIN_PASSWORD=$ADMIN_PASSWORD
PLATFORM_ADMIN_NAME="Platform administrator"
PLATFORM_ADMIN_EMAIL=$EMAIL
LOG_LEVEL=INFO
LOG_DB_LEVEL=INFO
LOG_FILE_ENABLED=true
LOG_RETENTION_DAYS=30
EOF
chown root:root "$ENV_FILE" && chmod 600 "$ENV_FILE"
runuser -u "$SERVICE_USER" -- bash -c "cd '$APP_DIR' && npm ci --include=dev --no-audit --no-fund && npm run build"
[[ -f "$APP_DIR/dist/index.html" ]] || die 'Build failed: dist/index.html not found.'
cat > /etc/systemd/system/melktak.service <<EOF
[Unit]
Description=Melktak web application
After=network-online.target postgresql.service
Wants=network-online.target
[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node --import tsx server.ts
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$DATA_DIR
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now "$APP_NAME"
cat > /etc/nginx/sites-available/melktak <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 20m;
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/melktak /etc/nginx/sites-enabled/melktak
nginx -t && systemctl enable --now nginx && systemctl reload nginx
if [[ -n "$SSL_EMAIL" ]]; then
  certbot --nginx --non-interactive --agree-tos --keep-until-expiring --redirect -m "$SSL_EMAIL" -d "$DOMAIN"
else
  certbot --nginx --non-interactive --agree-tos --keep-until-expiring --redirect --register-unsafely-without-email -d "$DOMAIN"
fi
systemctl enable --now certbot.timer
for _ in {1..30}; do
  if curl -fsS "https://$DOMAIN/api/v1/health" | grep -q '"status":"healthy"'; then
    echo "Healthy: https://$DOMAIN"
    echo "Secrets are in $ENV_FILE; retrieve initial admin details securely on the server."
    exit 0
  fi
  sleep 2
done
journalctl -u "$APP_NAME" -n 60 --no-pager || true
die 'Health check failed. Review service and Nginx logs.'
