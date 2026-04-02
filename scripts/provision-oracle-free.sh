#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# provision-oracle-free.sh
#
# Provisioning script for Oracle Cloud Always Free instances.
# Optimized for: VM.Standard.A1.Flex — 4 OCPUs / 24 GB RAM / Arm64
#
# Sets up: Swap, Docker, Ollama, Paperclip, firewall, and systemd units.
#
# Usage:
#   curl -fsSL <raw-url> | sudo bash
#   # or
#   sudo bash scripts/provision-oracle-free.sh
#
# Environment variables (optional):
#   SWAP_SIZE_GB        — Swap file size in GB (default: 16)
#   OLLAMA_MODEL        — Default model to pull (default: qwen2.5-coder:7b)
#   PAPERCLIP_PORT      — Paperclip host port (default: 3100)
#   PAPERCLIP_DATA_DIR  — Data directory (default: /opt/paperclip/data)
#   SKIP_OLLAMA         — Set to 1 to skip Ollama installation
#   SKIP_PAPERCLIP      — Set to 1 to skip Paperclip setup
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

SWAP_SIZE_GB="${SWAP_SIZE_GB:-16}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
PAPERCLIP_PORT="${PAPERCLIP_PORT:-3100}"
PAPERCLIP_DATA_DIR="${PAPERCLIP_DATA_DIR:-/opt/paperclip/data}"
SKIP_OLLAMA="${SKIP_OLLAMA:-0}"
SKIP_PAPERCLIP="${SKIP_PAPERCLIP:-0}"

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[x]${NC} $*" >&2; }

# ── Preflight checks ─────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root (use sudo)"
  exit 1
fi

ARCH=$(uname -m)
if [[ "$ARCH" != "aarch64" ]]; then
  warn "This script is optimized for aarch64 (Arm). Detected: $ARCH"
  warn "Continuing anyway..."
fi

log "Oracle Cloud Free Tier provisioning starting..."
log "Architecture: $ARCH"
log "Swap size: ${SWAP_SIZE_GB} GB"

# ── 1. System update ─────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# ── 2. Essential packages ────────────────────────────────────────────
log "Installing essential packages..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl wget git htop iotop tmux \
  ca-certificates gnupg lsb-release \
  unattended-upgrades \
  jq

# ── 3. Swap configuration ────────────────────────────────────────────
SWAPFILE="/swapfile"
if swapon --show | grep -q "$SWAPFILE"; then
  warn "Swap already active at $SWAPFILE — skipping"
else
  log "Creating ${SWAP_SIZE_GB} GB swap file..."
  fallocate -l "${SWAP_SIZE_GB}G" "$SWAPFILE"
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE"
  swapon "$SWAPFILE"

  if ! grep -q "$SWAPFILE" /etc/fstab; then
    echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
  fi

  # Optimize swap behavior for LLM workloads
  sysctl -w vm.swappiness=10
  sysctl -w vm.vfs_cache_pressure=50
  cat >> /etc/sysctl.d/99-swap-optimize.conf <<SYSCTL
vm.swappiness=10
vm.vfs_cache_pressure=50
SYSCTL

  log "Swap configured: $(swapon --show)"
fi

# ── 4. Docker ─────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  warn "Docker already installed — skipping"
else
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker

  # Add ubuntu user to docker group
  if id "ubuntu" &>/dev/null; then
    usermod -aG docker ubuntu
  fi
fi

# Docker Compose plugin
if docker compose version &>/dev/null; then
  warn "Docker Compose already available — skipping"
else
  log "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
fi

# Docker daemon tuning for low-memory
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<DOCKER
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DOCKER
systemctl restart docker

# ── 5. Ollama ─────────────────────────────────────────────────────────
if [[ "$SKIP_OLLAMA" == "1" ]]; then
  warn "Skipping Ollama installation (SKIP_OLLAMA=1)"
else
  if command -v ollama &>/dev/null; then
    warn "Ollama already installed — skipping install"
  else
    log "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
  fi

  # Ollama systemd override for memory optimization
  mkdir -p /etc/systemd/system/ollama.service.d
  cat > /etc/systemd/system/ollama.service.d/override.conf <<OLLAMA_OVERRIDE
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="OLLAMA_KEEP_ALIVE=5m"
Environment="OLLAMA_MAX_QUEUE=4"
OLLAMA_OVERRIDE

  systemctl daemon-reload
  systemctl enable --now ollama

  # Wait for Ollama to be ready
  log "Waiting for Ollama to start..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:11434/api/version &>/dev/null; then
      break
    fi
    sleep 1
  done

  log "Pulling default model: $OLLAMA_MODEL"
  ollama pull "$OLLAMA_MODEL" || warn "Failed to pull model — pull manually later"

  log "Ollama ready at http://0.0.0.0:11434"
fi

# ── 6. Paperclip ──────────────────────────────────────────────────────
if [[ "$SKIP_PAPERCLIP" == "1" ]]; then
  warn "Skipping Paperclip setup (SKIP_PAPERCLIP=1)"
else
  log "Setting up Paperclip..."

  PAPERCLIP_DIR="/opt/paperclip"
  mkdir -p "$PAPERCLIP_DIR" "$PAPERCLIP_DATA_DIR"

  # Create optimized docker-compose for Oracle Free Tier
  cat > "$PAPERCLIP_DIR/docker-compose.yml" <<COMPOSE
services:
  paperclip:
    build:
      context: /opt/paperclip/repo
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "${PAPERCLIP_PORT}:3100"
    environment:
      HOST: "0.0.0.0"
      PAPERCLIP_HOME: "/paperclip"
      PAPERCLIP_DEPLOYMENT_MODE: "authenticated"
      PAPERCLIP_DEPLOYMENT_EXPOSURE: "private"
      PAPERCLIP_PUBLIC_URL: "\${PAPERCLIP_PUBLIC_URL:-http://localhost:${PAPERCLIP_PORT}}"
      BETTER_AUTH_SECRET: "\${BETTER_AUTH_SECRET:?Set BETTER_AUTH_SECRET in .env}"
      ANTHROPIC_API_KEY: "\${ANTHROPIC_API_KEY:-}"
      OPENAI_API_KEY: "\${OPENAI_API_KEY:-}"
    volumes:
      - "${PAPERCLIP_DATA_DIR}:/paperclip"
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
COMPOSE

  # Create .env template
  if [[ ! -f "$PAPERCLIP_DIR/.env" ]]; then
    cat > "$PAPERCLIP_DIR/.env" <<ENV
# Required — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=

# Optional — LLM provider keys
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Public URL (set to your Oracle instance public IP or domain)
PAPERCLIP_PUBLIC_URL=http://localhost:${PAPERCLIP_PORT}
ENV
    warn "Edit /opt/paperclip/.env with your secrets before starting"
  fi

  log "Paperclip config created at $PAPERCLIP_DIR/"
fi

# ── 7. Firewall (iptables — Oracle Cloud uses iptables, not ufw) ─────
log "Configuring firewall rules..."

# Oracle Cloud Ubuntu images use iptables by default
# Open Paperclip port
if ! iptables -L INPUT -n | grep -q "dpt:${PAPERCLIP_PORT}"; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport "${PAPERCLIP_PORT}" -j ACCEPT
  log "Opened port ${PAPERCLIP_PORT} (Paperclip)"
fi

# Open Ollama port (localhost only by default, open if you need remote access)
# Uncomment below to expose Ollama externally:
# iptables -I INPUT 6 -m state --state NEW -p tcp --dport 11434 -j ACCEPT

# Save iptables rules
if command -v netfilter-persistent &>/dev/null; then
  netfilter-persistent save
else
  apt-get install -y -qq iptables-persistent
  netfilter-persistent save
fi

# ── 8. Memory monitoring cron ────────────────────────────────────────
log "Setting up memory monitoring..."
cat > /usr/local/bin/check-memory.sh <<'MEMCHECK'
#!/bin/bash
# Kill Ollama idle processes if free RAM drops below 2 GB
FREE_MB=$(free -m | awk '/^Mem:/{print $7}')
if [[ $FREE_MB -lt 2048 ]]; then
  logger -t memory-monitor "Low memory: ${FREE_MB}MB available — restarting Ollama"
  systemctl restart ollama
fi
MEMCHECK
chmod +x /usr/local/bin/check-memory.sh

# Run every 5 minutes
echo "*/5 * * * * root /usr/local/bin/check-memory.sh" > /etc/cron.d/memory-monitor

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Oracle Cloud Free Tier — Provisioning Complete${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Swap:       ${GREEN}${SWAP_SIZE_GB} GB${NC} (swappiness=10)"
echo -e "  Docker:     ${GREEN}$(docker --version 2>/dev/null || echo 'not installed')${NC}"
if [[ "$SKIP_OLLAMA" != "1" ]]; then
echo -e "  Ollama:     ${GREEN}http://0.0.0.0:11434${NC}"
echo -e "  Model:      ${GREEN}${OLLAMA_MODEL}${NC}"
fi
if [[ "$SKIP_PAPERCLIP" != "1" ]]; then
echo -e "  Paperclip:  ${GREEN}http://0.0.0.0:${PAPERCLIP_PORT}${NC}"
echo -e "  Data dir:   ${GREEN}${PAPERCLIP_DATA_DIR}${NC}"
fi
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
if [[ "$SKIP_PAPERCLIP" != "1" ]]; then
echo -e "  1. Edit ${CYAN}/opt/paperclip/.env${NC} with your secrets"
echo -e "  2. Clone repo: ${CYAN}git clone <repo-url> /opt/paperclip/repo${NC}"
echo -e "  3. Start: ${CYAN}cd /opt/paperclip && docker compose up -d --build${NC}"
fi
echo -e "  4. Oracle Cloud Console: open port ${PAPERCLIP_PORT} in Security List"
echo -e "  5. Test Ollama: ${CYAN}curl http://localhost:11434/api/generate -d '{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"hello\"}'${NC}"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
