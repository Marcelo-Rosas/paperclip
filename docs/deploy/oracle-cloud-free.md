---
title: Oracle Cloud Free Tier
summary: Deploy Paperclip + Ollama on Oracle Cloud Always Free
---

# Oracle Cloud Free Tier Deployment

Deploy Paperclip with Ollama on Oracle Cloud's Always Free Arm instance.

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
6. **Security List**: open port **3100** (TCP) for Paperclip access

### 2. Run the Provisioning Script

```bash
ssh ubuntu@<instance-ip>

# Clone the repo
git clone https://github.com/marcelo-rosas/paperclip.git /opt/paperclip/repo
cd /opt/paperclip/repo

# Run provisioning
sudo bash scripts/provision-oracle-free.sh
```

### 3. Configure Secrets

```bash
cd /opt/paperclip
nano .env
```

Set at minimum:

```env
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
PAPERCLIP_PUBLIC_URL=http://<your-instance-public-ip>:3100
```

### 4. Start Paperclip

```bash
cd /opt/paperclip
docker compose up -d --build
```

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
