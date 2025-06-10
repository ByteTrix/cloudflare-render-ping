# 🚀 Render Keep-Alive Worker

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/cloudflare-render-ping)

A production-ready Cloudflare Worker that automatically pings your Render applications every 14 minutes during business hours (7 AM - 12 PM IST) to prevent them from going to sleep on the free tier.

## 🎯 Problem & Solution

**The Challenge**: Render's free tier puts applications to sleep after 15 minutes of inactivity, resulting in cold starts and slow response times for users.

**The Solution**: This intelligent worker pings your application every 14 minutes during peak business hours, ensuring optimal availability when your users need it most while conserving resources during off-peak times.

## ✨ Features

- 🆓 **Zero Cost** - Runs entirely on Cloudflare's generous free tier
- ⏰ **Smart Scheduling** - Active only during business hours (7 AM - 12 PM IST)
- 🛡️ **Production Ready** - Comprehensive error handling, retry logic, and timeout protection
- 📊 **Detailed Monitoring** - Rich logging and status endpoints for observability
- 🔧 **Zero Maintenance** - Set once, runs automatically
- ⚡ **Quick Deploy** - Ready in under 5 minutes
- 🔄 **Configurable** - Customizable endpoints, timeouts, and schedules

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later)
- [Git](https://git-scm.com/)
- Cloudflare account (free)
- Render application URL

### 1. Clone & Setup
```powershell
# Clone the repository
git clone https://github.com/kavinthangavel/cloudflare-render-ping.git
![Fork Repository](https://docs.github.com/assets/images/help/repository/fork_button.jpg)

cd cloudflare-render-ping

# Install dependencies
npm install

# Install Wrangler CLI (if not already installed)
npm install wrangler --save-dev
```

### 2. Configure Cloudflare
```powershell
# Login to Cloudflare (opens browser for authentication)
npx wrangler login

# Set your Render application URL as a secret
npx wrangler secret put RENDER_APP_URL
# When prompted, enter: https://your-app.onrender.com
```

### 3. Deploy
```powershell
# Deploy the worker to Cloudflare
npx wrangler deploy

# Your worker will be available at:
# https://render-ping-worker.your-subdomain.workers.dev
```

### 4. Verify Deployment
```powershell
# Test the worker manually
curl https://your-worker.workers.dev/ping

# View real-time logs
npx wrangler tail

# Check configuration
curl https://your-worker.workers.dev/debug
```

## 📋 CLI Commands Reference

Here are all the commands used during development and deployment:

### Wrangler Commands
```powershell
# Authentication
npx wrangler login                    # Login to Cloudflare
npx wrangler whoami                   # Check current user

# Secrets Management
npx wrangler secret list              # List all secrets
npx wrangler secret put RENDER_APP_URL # Set application URL
npx wrangler secret delete {SECRET_NAME} # Remove a secret

# Deployment
npx wrangler deploy                   # Deploy to production
npx wrangler deploy --dry-run         # Preview deployment
npx wrangler deploy --name custom-name # Deploy with custom name

# Monitoring & Debugging
npx wrangler tail                     # View real-time logs
npx wrangler tail --format pretty    # Formatted log output
npx wrangler dev                      # Run locally for development

# Configuration
npx wrangler generate --template worker # Generate new worker
npx wrangler init                     # Initialize new project
```

### Testing Commands
```powershell
# Test endpoints
curl https://your-worker.workers.dev/                # Status page
curl https://your-worker.workers.dev/ping           # Manual ping
curl https://your-worker.workers.dev/debug          # Debug info

# Test with PowerShell (Windows alternative)
Invoke-RestMethod -Uri "https://your-worker.workers.dev/ping"
Invoke-WebRequest -Uri "https://your-worker.workers.dev/" | Select-Object Content
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RENDER_APP_URL` | ✅ | - | Your Render application URL |
| `HEALTH_ENDPOINT` | ❌ | `/healthz` | Health check endpoint path |
| `TIMEOUT_MS` | ❌ | `30000` | Request timeout (milliseconds) |
| `RETRY_ATTEMPTS` | ❌ | `2` | Number of retry attempts |

### Setting Environment Variables
```powershell
# Required: Set your Render app URL
npx wrangler secret put RENDER_APP_URL

# Optional: Customize health endpoint
npx wrangler secret put HEALTH_ENDPOINT
# Enter: /api/health (or your preferred endpoint)

# Optional: Increase timeout for slow apps
npx wrangler secret put TIMEOUT_MS
# Enter: 60000 (for 60 seconds)

# Optional: Adjust retry attempts
npx wrangler secret put RETRY_ATTEMPTS
# Enter: 3 (for 3 retry attempts)
```

### Schedule Customization

Edit `wrangler.toml` to modify the ping schedule:

```toml
[triggers]
# Current: Every 14 minutes, 7 AM - 12 PM IST
crons = ["*/14 1-6 * * *"]

# Examples:
# Every 10 minutes, 24/7
crons = ["*/10 * * * *"]

# Every 15 minutes, weekdays only, 9 AM - 5 PM UTC
crons = ["*/15 9-17 * * 1-5"]

# Every 5 minutes, business hours extended
crons = ["*/5 0-8 * * *"]  # 5:30 AM - 1:30 PM IST
```

## 📊 Monitoring & Endpoints

### Available Endpoints

| Endpoint | Method | Description | Example Response |
|----------|--------|-------------|------------------|
| `/` | GET | Status dashboard | HTML page with configuration |
| `/ping` | GET/POST | Manual health check | `{"success": true, "message": "Health check triggered"}` |
| `/debug` | GET | Environment variables | `{"environment_variables": {...}}` |

### Monitoring Commands
```powershell
# Real-time log monitoring
npx wrangler tail --format pretty

# Check worker analytics (in dashboard)
# Visit: https://dash.cloudflare.com/workers

# Test all endpoints
curl https://your-worker.workers.dev/
curl https://your-worker.workers.dev/ping
curl https://your-worker.workers.dev/debug
```

### Log Messages
- `🚀 Starting health check` - Worker initiated
- `✅ Health check successful!` - Successful ping with response time
- `⚠️ Server responded but status unclear` - Response received but unexpected format
- `❌ HTTP Error: XXX` - Server returned error status
- `⏱️ Request timeout` - Request exceeded timeout limit
- `🌐 Network error` - Connection or DNS issues
- `💔 All attempts failed` - All retries exhausted

## 🏥 Health Check Endpoint Setup

### For Your Render Application

Add a health check endpoint to your Render app for optimal monitoring:

#### Node.js/Express
```javascript
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

#### Python/Flask
```python
from datetime import datetime
import psutil

@app.route('/healthz')
def health_check():
    return {
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'uptime': time.time() - psutil.boot_time(),
        'memory': psutil.virtual_memory()._asdict()
    }
```

#### Python/FastAPI
```python
from datetime import datetime
from fastapi import FastAPI

@app.get("/healthz")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "My Render App"
    }
```

#### Alternative: Use Existing Endpoints
If you don't want to add a dedicated health endpoint:
```powershell
# Use homepage
npx wrangler secret put HEALTH_ENDPOINT
# Enter: /

# Use existing API endpoint
npx wrangler secret put HEALTH_ENDPOINT
# Enter: /api/status
```

## 🔍 Troubleshooting

### Common Issues & Solutions

#### ❌ Environment Variable Not Found
```powershell
# Problem: Worker shows "Not configured"
# Solution: Set the secret properly
npx wrangler secret put RENDER_APP_URL
# Enter your full Render URL: https://your-app.onrender.com

# Verify it was set
npx wrangler secret list
```

#### ❌ Deployment Failures
```powershell
# Problem: "No fetch handler" error
# Solution: Check your main entry point in wrangler.toml
# Ensure: main = "src/index.js"

# Problem: Wrangler login issues
# Solution: Clear auth and re-login
npx wrangler logout
npx wrangler login
```

#### ❌ Health Check Failures
```powershell
# Problem: "All attempts failed"
# Solution: Test your Render URL manually
curl https://your-app.onrender.com/healthz

# If 404, try homepage instead
npx wrangler secret put HEALTH_ENDPOINT
# Enter: /
```

#### ❌ Worker Not Running
```powershell
# Check deployment status
npx wrangler tail

# Verify cron schedule is correct
Get-Content wrangler.toml

# Test manual trigger
curl https://your-worker.workers.dev/ping
```

### Debug Commands
```powershell
# Check worker configuration
curl https://your-worker.workers.dev/debug

# View deployment info
npx wrangler dev --local-protocol https

# Check if secrets are set
npx wrangler secret list

# Test Render app directly
curl https://your-app.onrender.com/healthz -v
```

## 📁 Project Structure

```
cloudflare-render-ping/
├── src/
│   └── index.js          # Main worker logic
├── wrangler.toml         # Cloudflare configuration
├── package.json          # Dependencies and scripts
├── .gitignore           # Git ignore patterns
└── README.md            # This documentation
```

## 💰 Cost Analysis

### Cloudflare Workers (Free Tier)
- ✅ **100,000 requests/day** included
- ✅ **~103 requests/day** used (7×14.7 pings×5 weekdays)
- ✅ **Completely free** for this use case
- ✅ **10ms CPU time** per request (well under 10,000ms limit)

### Render (Free Tier)
- ✅ **750 hours/month** of runtime
- ✅ **Stays awake** during business hours only
- ✅ **Sleeps at night** to conserve hours
- ✅ **No additional costs**

## 🔄 Workflow Overview

1. **Cron Trigger** - Cloudflare's scheduler activates worker every 14 minutes
2. **Environment Check** - Worker validates configuration
3. **Health Request** - GET request sent to your Render app
4. **Response Validation** - Check for successful response
5. **Retry Logic** - Automatic retries on failure
6. **Logging** - Detailed logs for monitoring
7. **Completion** - Process repeats next cycle

## 🛠️ Development

### Local Development
```powershell
# Run worker locally
npx wrangler dev

# Test locally (in another terminal)
curl http://localhost:8787/ping

# Debug mode with logs
npx wrangler dev --local-protocol https --log-level debug
```

### Making Changes
```powershell
# Edit the worker code
code src/index.js

# Update configuration
code wrangler.toml

# Deploy changes
npx wrangler deploy

# View updated logs
npx wrangler tail
```

### Testing New Features
```powershell
# Deploy to a staging environment
npx wrangler deploy --name render-ping-staging

# Test staging
curl https://render-ping-staging.your-subdomain.workers.dev/ping

# Deploy to production when ready
npx wrangler deploy
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/) for the serverless platform
- [Render](https://render.com/) for the hosting platform
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for deployment tools

---

**🎯 Ready to keep your Render app alive? Follow the [Quick Start](#-quick-start) guide above!**
