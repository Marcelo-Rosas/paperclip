---
title: Oracle Cloud Free Tier
summary: Deploy Paperclip + Ollama on Oracle Cloud Always Free
---

# Oracle Cloud Free Tier Deployment

Deploy Paperclip (origin server) + Ollama on Oracle Cloud's Always Free Arm instance,
behind Cloudflare Workers & Pages.

## Architecture

```
  Users (browser)
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Cloudflare Edge (your subdomain)                │
│                                                  │
│  Pages (SPA)              Worker (Edge Proxy)    │
│  React + Vite             paperclip-edge         │
│  ui/dist/*                ├─ CORS / security     │
│     │                     ├─ rate limit           │
│     └── /api/* ──────────▸└─ proxy to origin     │
│                                    │             │
└────────────────────────────────────┼─────────────┘
                                     │ HTTPS
                          ┌──────────▼───────────┐
                          │  Oracle Cloud Free    │
                          │  VM.Standard.A1.Flex  │
                          │  4 OCPUs / 24 GB Arm  │
                          │                       │
                          │  Docker               │
                          │  ├─ Paperclip :3100   │
                          │  └─ PostgreSQL (emb.) │
                          │  Ollama :11434        │
                          └───────────────────────┘
```

The Oracle instance is the **origin server**. Cloudflare Pages serves the frontend (SPA)
and the Worker proxies `/api/*` requests to the Oracle instance via `ORIGIN_URL` in
`worker/wrangler.toml`.

## Instance Specifications

| Resource       | Value                                |
|----------------|--------------------------------------|
| Shape          | VM.Standard.A1.Flex                  |
| Processor      | Ampere Altra (Arm/aarch64)           |
| OCPUs          | 4 (max free)                         |
| RAM            | 24 GB (max free)                     |
| Boot Volume    | 200 GB                               |
| OS             | Ubuntu 24.04 Minimal aarch64         |

## Memory Budget

With 24 GB RAM + 16 GB swap, plan resource usage carefully:

| Service              | RAM (approx) |
|----------------------|-------------|
| OS + system          | ~1 GB       |
| Docker daemon        | ~0.5 GB     |
| Paperclip + Postgres | ~2-4 GB     |
| Ollama (7b model)    | ~5-8 GB     |
| **Available buffer** | **~10-15 GB** |

## Quick Start

### 1. Create the Oracle Cloud Instance

In the Oracle Cloud Console:

1. **Compute → Instances → Create Instance**
2. Image: **Ubuntu 24.04 Minimal aarch64**
3. Shape: **VM.Standard.A1.Flex** → 4 OCPUs, 24 GB RAM
4. Boot volume: **200 GB**
5. Add your SSH key
6. **Security List**: open ports **3100** (TCP) and **443** (TCP)

### 2. Connect from WSL (Windows)

```bash
# Save your Oracle SSH key (once)
mkdir -p ~/.ssh
cp /mnt/c/Users/<your-windows-user>/.ssh/oracle_key ~/.ssh/oracle_key
chmod 600 ~/.ssh/oracle_key

# Connect
ssh -i ~/.ssh/oracle_key ubuntu@<instance-public-ip>
```

Optional — add to `~/.ssh/config` for quick access:

```
Host oracle
    HostName <instance-public-ip>
    User ubuntu
    IdentityFile ~/.ssh/oracle_key
```

Then just: `ssh oracle`

### 3. Run the Provisioning Script

```bash
# On the Oracle instance (via SSH)
git clone https://github.com/marcelo-rosas/paperclip.git /opt/paperclip/repo
cd /opt/paperclip/repo

sudo bash scripts/provision-oracle-free.sh
```

### 4. Configure Secrets

```bash
cd /opt/paperclip
nano .env
```

```env
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
PAPERCLIP_AGENT_JWT_SECRET=<generate with: openssl rand -base64 32>
PAPERCLIP_PUBLIC_URL=https://<your-subdomain>
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Note: `PAPERCLIP_AGENT_JWT_SECRET` is **required** for agent runs. Without it, agents cannot
authenticate with the Paperclip API and all agent tasks will fail with "Agent authentication required".

Note: `PAPERCLIP_PUBLIC_URL` should be your **Cloudflare subdomain** (e.g. `https://app.yourdomain.com`),
not the Oracle IP directly.

### 5. Start Paperclip

```bash
cd /opt/paperclip
docker compose up -d --build
```

### 6. Point Cloudflare Worker to Oracle Origin

Update `worker/wrangler.toml` on your local machine (or in the repo):

```toml
[env.production.vars]
ENVIRONMENT = "production"
ORIGIN_URL = "http://<oracle-public-ip>:3100"
```

Then deploy the worker:

```bash
# From WSL or your local machine
./scripts/deploy-cloudflare.sh worker production
```

Now your subdomain routes through Cloudflare → Oracle origin.

## Ollama Configuration

### Recommended Models (Arm-compatible, fits in 24 GB)

| Model               | RAM Usage | Best For          |
|----------------------|-----------|-------------------|
| `qwen2.5-coder:7b`  | ~4.5 GB   | Code generation   |
| `llama3.2:3b`       | ~2 GB     | General tasks     |
| `phi3:mini`          | ~2.3 GB   | Fast responses    |
| `gemma2:2b`          | ~1.5 GB   | Lightweight tasks |
| `deepseek-coder:6.7b`| ~4 GB    | Code tasks        |

### Pull a Model

```bash
ollama pull qwen2.5-coder:7b
```

### Memory Optimization Settings

The provisioning script configures these automatically:

| Setting                      | Value | Purpose                          |
|------------------------------|-------|----------------------------------|
| `OLLAMA_MAX_LOADED_MODELS`   | 1     | Only one model in RAM at a time  |
| `OLLAMA_NUM_PARALLEL`        | 1     | Single concurrent request        |
| `OLLAMA_KEEP_ALIVE`          | 5m    | Unload model after 5 min idle   |
| `OLLAMA_MAX_QUEUE`           | 4     | Limit request queue              |

To change these:

```bash
sudo systemctl edit ollama
# Edit the Environment lines
sudo systemctl restart ollama
```

## Swap Configuration

The script creates a 16 GB swap file with optimized settings:

- **swappiness=10** — prefer RAM, only use swap under pressure
- **vfs_cache_pressure=50** — balanced filesystem cache retention

To adjust swap size:

```bash
SWAP_SIZE_GB=8 sudo bash scripts/provision-oracle-free.sh
```

## Firewall Notes

Oracle Cloud uses **two layers** of firewall:

1. **Instance iptables** — the script handles this automatically
2. **VCN Security List** — you must open ports manually in the Oracle Console:
   - Go to **Networking → Virtual Cloud Networks → your VCN → Security Lists**
   - Add an **Ingress Rule**: Source `0.0.0.0/0`, Protocol TCP, Dest Port `3100`

## Monitoring

### Check Memory Usage

```bash
free -h
htop
```

### Check Ollama Status

```bash
systemctl status ollama
ollama list           # loaded models
ollama ps             # running models
```

### Check Paperclip

```bash
cd /opt/paperclip
docker compose logs -f
docker compose ps
```

### Memory Monitor

A cron job runs every 5 minutes and restarts Ollama if available RAM drops below 2 GB. Logs go to syslog:

```bash
grep memory-monitor /var/log/syslog
```

## Troubleshooting

### Ollama Out of Memory

```bash
# Use a smaller model
ollama pull llama3.2:3b

# Or reduce context window
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-coder:7b",
  "prompt": "hello",
  "options": {"num_ctx": 2048}
}'
```

### Disk Space

```bash
df -h
# Clean Docker images
docker system prune -a
# Clean old Ollama models
ollama rm <model-name>
```

### Paperclip Not Accessible

1. Check the container is running: `docker compose ps`
2. Check iptables: `sudo iptables -L INPUT -n | grep 3100`
3. Check Oracle Security List (Console) has port 3100 open
4. Check Cloudflare Worker `ORIGIN_URL` points to the Oracle IP

### HTTPS / SSL

For production, set up HTTPS on the Oracle instance so the Worker connects securely:

```bash
# Option A: Cloudflare Tunnel (recommended — no open ports needed)
# Install cloudflared on the Oracle instance
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
cloudflared tunnel login
cloudflared tunnel create paperclip
cloudflared tunnel route dns paperclip api.<your-domain>
cloudflared tunnel run paperclip
```

With a Cloudflare Tunnel, you don't need to open port 3100 in the Oracle Security List at all — traffic goes through Cloudflare's network.

```bash
# Option B: Let's Encrypt + Caddy (if exposing port 443 directly)
sudo apt-get install -y caddy
# Caddy auto-provisions HTTPS certificates
```
