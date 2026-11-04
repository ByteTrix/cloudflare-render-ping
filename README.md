# 🚀 Render Keep-Alive Worker

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ByteTrix/cloudflare-render-ping)

A production-ready Cloudflare Worker that automatically pings your Render applications every 10 minutes (24/7) to prevent them from going to sleep on the free tier.

## 🎯 Problem & Solution

**The Challenge**: Render's free tier spins down web services after 15 minutes of inactivity, resulting in 30-50 second cold starts and slow response times for users.

**The Solution**: This intelligent Cloudflare Worker pings your application every 10 minutes around the clock. By running every 10 minutes, it provides a crucial 5-minute safety margin against Cloudflare cron execution jitter and network retries, ensuring your service never sleeps.

## ✨ Features

- 🆓 **Zero Cost** - Runs 100% within Cloudflare's generous 100,000 requests/day free tier (only 144 runs/day used)
- ⏰ **24/7 Intelligent Keep-Alive** - Executes every 10 minutes (`*/10 * * * *`) to stay well within Render's 15-minute timeout
- 🩺 **Universal Health Parser** - Correctly validates any HTTP 200-299 response, recognizing `ok: true`, `status: "ok" | "healthy" | "UP"`, `success: true`, and plain text bodies
- 📊 **Rich Metrics Extraction** - Extracts and visualizes server uptime, active connections, rooms, players, and versions
- 🔄 **Automatic Root Fallback** - If `/healthz` fails or returns 404, automatically attempts a fallback ping to `/` to reset Render's sleep timer
- 🛡️ **Production-Grade Reliability** - Built-in retries with exponential backoff, request timeouts, and timing diagnostics
- 📋 **Live Status Dashboard** - Visual web UI with live metrics cards, ping history table, and manual trigger button
- ⚡ **Zero External Dependencies** - Pure modern ES module Cloudflare Worker with native Node.js test suite

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [Git](https://git-scm.com/)
- Cloudflare account (free)
- Render application URL (e.g. `https://songless-unlimited.onrender.com`)

### 1. Clone & Setup

```powershell
# Clone the repository
git clone https://github.com/kavinthangavel/cloudflare-render-ping.git
cd cloudflare-render-ping

# Install dependencies
npm install
```

### 2. Configure Cloudflare
```powershell
# Login to Cloudflare (opens browser for authentication)
npx wrangler login

# Set your Render application URL as a secret (optional, defaults to songless-unlimited.onrender.com)
npx wrangler secret put RENDER_APP_URL
# When prompted, enter your Render URL: https://your-app.onrender.com
```

### 3. Deploy
```powershell
# Deploy the worker to Cloudflare
npx wrangler deploy
```

### 4. Verify Deployment
```powershell
# Test the worker manually via JSON API
curl https://your-worker.workers.dev/ping

# View the visual status dashboard
# Visit in browser: https://your-worker.workers.dev/

# View real-time logs
npx wrangler tail

# Check diagnostics and configuration
curl https://your-worker.workers.dev/debug
```

## 🔧 Configuration

All settings can be configured in `wrangler.toml` under `[vars]` or overridden via Cloudflare Dashboard secrets / environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `RENDER_APP_URL` | `https://songless-unlimited.onrender.com` | Base URL of your Render web service |
| `HEALTH_ENDPOINT` | `/healthz` | Primary health check endpoint |
| `FALLBACK_ENDPOINT` | `/` | Fallback endpoint to ping if `/healthz` fails |
| `TIMEOUT_MS` | `30000` | HTTP request timeout in milliseconds |
| `RETRY_ATTEMPTS` | `2` | Number of attempts before attempting fallback |
| `ENABLE_FALLBACK` | `true` | Whether to attempt fallback ping to root `/` |

### Setting Secrets via Wrangler
```powershell
# Set your target application URL
npx wrangler secret put RENDER_APP_URL

# Customize endpoints (optional)
npx wrangler secret put HEALTH_ENDPOINT
npx wrangler secret put TIMEOUT_MS
```

### Schedule: Why Every 10 Minutes?

In `wrangler.toml`:
```toml
[triggers]
crons = ["*/10 * * * *"]
```
- Render puts inactive free services to sleep after **15 minutes**.
- A 14-minute cron schedule risks sleep when Cloudflare scheduled execution jitter (30-90s) or slow network retries occur.
- **10 minutes** provides a reliable 5-minute safety margin.
- 10 minutes = 6 runs/hour = 144 runs/day, consuming only **0.14%** of Cloudflare's 100,000 daily free requests.

## 📊 Endpoints

| Endpoint | Method | Response | Description |
|----------|--------|----------|-------------|
| `/` or `/status` | GET | HTML | Live status dashboard with metrics cards, ping history, and manual trigger |
| `/ping` | GET / POST | JSON | Manually trigger health check and return rich diagnostics & metrics |
| `/debug` | GET | JSON | Inspect worker isolate uptime, configuration, last ping, metrics, and history |

### Example `/ping` Response
```json
{
  "success": true,
  "message": "Health check completed successfully",
  "timestamp": "2026-11-04T07:22:28.707Z",
  "durationMs": 388,
  "status": "ok",
  "httpStatus": 200,
  "endpoint": "/healthz",
  "isFallback": false,
  "metrics": {
    "uptimeSeconds": 3509,
    "uptimeFormatted": "58m 29s",
    "version": 1,
    "connections": 1,
    "pendingImports": 0,
    "rooms": 2,
    "privateRooms": 0,
    "players": 0
  },
  "result": { ... }
}
```

## 🧪 Testing

Run the automated test suite using Node.js native test runner:

```powershell
npm test
```

## 📁 Project Structure

```
cloudflare-render-ping/
├── src/
│   ├── index.js     # Worker entrypoint (fetch & scheduled cron handlers)
│   ├── pinger.js    # Core ping engine, response parser, metrics extractor & fallback
│   ├── state.js     # In-memory isolate state and ping history management
│   └── ui.js        # HTML status dashboard template
├── test/
│   └── pinger.test.js # Comprehensive unit tests
├── wrangler.toml    # Cloudflare Worker configuration & crons
├── package.json     # Node.js metadata & scripts
└── README.md        # Documentation
```

## 📄 License

MIT License.
