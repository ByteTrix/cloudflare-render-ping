# 🚀 Cloudflare Worker: Professional Render Server Health Check

A production-ready Cloudflare Worker that automatically pings your Render server every 14 minutes from **7:00 AM to 12:00 PM IST** (1:30 AM–6:30 AM UTC) to prevent it from going to sleep on the free tier.

## ✨ Features

- 🛡️ **Production Ready**: Comprehensive error handling and retry logic
- ⚡ **Smart Retry**: Exponential backoff with configurable retry attempts
- ⏱️ **Timeout Protection**: Configurable request timeouts (default: 30s)
- 📊 **Detailed Logging**: Response times, timestamps, and error tracking
- 🔧 **Flexible Configuration**: Environment variables for easy customization
- 🌐 **Content-Type Aware**: Handles both JSON and plain text responses
- 🎯 **Smart Scheduling**: Only pings during business hours to save resources
- 💰 **Cost Effective**: Uses Cloudflare's generous free tier (100,000 requests/day)

## 🎯 What This Does

- **Prevents Render Free Tier Sleep**: Keeps your app awake during peak hours
- **Smart Scheduling**: Only pings during business hours (7 AM - 12 PM IST)
- **Cost Effective**: Uses Cloudflare's generous free tier (100,000 requests/day)
- **Zero Maintenance**: Set it and forget it
- **Production Monitoring**: Detailed logs for debugging and monitoring

---

## 🚀 Quick Deployment Summary

**Easy 3-Step Process:**
1. **🍴 Fork this repository** on GitHub
2. **☁️ Deploy to Cloudflare** (Workers & Pages → Connect to Git)
3. **⚙️ Set your Render URL** in environment variables

**Total time: ~5 minutes** ⏱️

---

## 🔧 How to Setup Your Render App URL

There are **2 ways** to configure your Render app URL. Choose the method that works best for you:

### 🚀 Method 1: Environment Variables (Recommended - No Code Editing!)

#### **Step 1: Find Your Render App URL**
1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Click on your web service
3. Copy the full URL from the service details
   - Example: `https://myapp-abc123.onrender.com`
   - Example: `https://my-awesome-api.onrender.com`

#### **Step 2: Set the URL in Cloudflare**

**Option A: Via Cloudflare Dashboard**
1. Deploy this worker first (don't edit any code)
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Navigate to **Workers & Pages** → Your Worker
4. Click **Settings** → **Variables**
5. Add environment variable:
   - **Variable name**: `RENDER_APP_URL`
   - **Value**: `https://your-actual-app.onrender.com`
   - Click **Add variable** → **Save and Deploy**

**Option B: Via Wrangler CLI**
```bash
# Navigate to project folder
cd d:\Kodo\cloudflare-render-ping

# Set your Render URL
wrangler secret put RENDER_APP_URL
# When prompted, enter: https://your-actual-app.onrender.com

# Deploy
wrangler deploy
```

### 🔧 Method 2: Edit Code Directly

If you prefer to hardcode the URL in the source code:

1. **Edit `src/index.js`**
2. **Find this line:**
   ```js
   const renderUrl = env.RENDER_APP_URL || "https://your-app.onrender.com";
   ```
3. **Replace with your actual URL:**
   ```js
   const renderUrl = env.RENDER_APP_URL || "https://myapp-abc123.onrender.com";
   ```
4. **Deploy the worker**

---

## 🚀 Quick Start Guide

### Step 1: Choose Your Setup Method

**🚀 Easy Method (Recommended)**: Use environment variables - no code editing needed!
**🔧 Advanced Method**: Fork the repo and edit the code directly

---

#### 🚀 Easy Method: Environment Variables

1. **Deploy the worker as-is** (don't edit any code)
2. **After deployment**, go to your Cloudflare Workers dashboard
3. **Set environment variables**:
   - Go to your worker → **Settings** → **Variables**
   - Add these variables:
     - `RENDER_APP_URL` = `https://your-app-name.onrender.com` *(Required)*
     - `HEALTH_ENDPOINT` = `/healthz` *(Optional, default: /healthz)*
     - `TIMEOUT_MS` = `30000` *(Optional, default: 30000)*
     - `RETRY_ATTEMPTS` = `2` *(Optional, default: 2)*

**🔍 How to find your Render URL:**
1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Click on your web service  
3. Copy the URL from the service details (e.g., `https://myapp-abc123.onrender.com`)

#### 🔧 Advanced Method: Fork and Edit Code

If you prefer to edit the code directly:

1. **Fork this repository**
2. **Edit `src/index.js`**:
```js
// Replace with your actual Render app URL
const renderUrl = "https://YOUR_APP_NAME.onrender.com";
```

---

### Step 2: Create a Health Check Endpoint (Recommended)

Add this simple endpoint to your Render app:

**For Express.js/Node.js:**
```js
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is alive' 
  });
});
```

**For Python/Flask:**
```python
@app.route('/healthz')
def health_check():
    return {
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'message': 'Server is alive'
    }
```

**For Python/FastAPI:**
```python
@app.get("/healthz")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "message": "Server is alive"
    }
```

**💡 Alternative**: If you don't want to add a new endpoint, you can ping any existing endpoint like your homepage (`/`) or API endpoint.

---

### Step 3: Deploy to Cloudflare

#### Option A: Fork and Deploy via Cloudflare Dashboard (Recommended)

**Step 3.1: Fork this Repository**
1. **Click the "Fork" button** at the top-right of this GitHub repository
2. **Choose your GitHub account** as the destination
3. **Keep the same repository name** or rename it if you prefer
4. **Click "Create fork"**

**Step 3.2: Deploy to Cloudflare Workers**
1. **Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)**
2. **Navigate to "Workers & Pages"** in the left sidebar
3. **Click "Create Application"**
4. **Choose "Pages"** → **"Connect to Git"**
5. **Connect your GitHub account** (if not already connected)
6. **Select your forked repository** (`your-username/cloudflare-render-ping`)
7. **Configure deployment settings:**
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: Leave empty
   - **Build output directory**: Leave empty
8. **Click "Save and Deploy"**
9. **Wait for deployment** (usually takes 1-2 minutes)

**Step 3.3: Set Environment Variables** (if using Environment Variable method)
1. **After successful deployment**, go to your worker in the dashboard
2. **Click "Settings"** → **"Environment variables"**
3. **Add your variables:**
   - **Variable name**: `RENDER_APP_URL`
   - **Value**: `https://your-actual-app.onrender.com`
   - **Click "Add variable"**
4. **Click "Save and deploy"**

#### Option B: Clone and Deploy via Wrangler CLI

If you prefer using the command line:

1. **Fork the repository** (same as Step 3.1 above)

2. **Clone your forked repository:**
   ```powershell
   git clone https://github.com/YOUR_USERNAME/cloudflare-render-ping.git
   cd cloudflare-render-ping
   ```

3. **Install dependencies:**
   ```powershell
   npm install -g wrangler
   ```

4. **Login to Cloudflare:**
   ```powershell
   wrangler login
   ```

5. **Set environment variables:**
   ```powershell
   wrangler secret put RENDER_APP_URL
   # When prompted, enter: https://your-actual-app.onrender.com
   ```

6. **Deploy the worker:**
   ```powershell
   wrangler deploy
   ```

#### Option C: Direct Repository Deployment (Alternative)

If you want to deploy without forking:

1. **Download or clone this repository:**
   ```powershell
   git clone https://github.com/ORIGINAL_AUTHOR/cloudflare-render-ping.git
   cd cloudflare-render-ping
   ```

2. **Create your own GitHub repository:**
   - Go to GitHub.com → **New Repository**
   - Name it `cloudflare-render-ping`
   - Make it public
   - Don't initialize with README

3. **Push to your new repository:**
   ```powershell
   git remote set-url origin https://github.com/YOUR_USERNAME/cloudflare-render-ping.git
   git push -u origin main
   ```

4. **Follow Steps 3.2 and 3.3** from Option A above

---

## ⚙️ Advanced Configuration

### 🔧 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RENDER_APP_URL` | ✅ Yes | - | Your Render app URL (e.g., `https://myapp.onrender.com`) |
| `HEALTH_ENDPOINT` | ❌ No | `/healthz` | Health check endpoint path |
| `TIMEOUT_MS` | ❌ No | `30000` | Request timeout in milliseconds (30 seconds) |
| `RETRY_ATTEMPTS` | ❌ No | `2` | Number of retry attempts on failure |

### 🕐 Change the Schedule

Edit the cron expression in `wrangler.toml`:

```toml
[triggers]
# Current: Every 14 minutes from 1:30-6:30 AM UTC (7 AM-12 PM IST)
crons = ["*/14 1-6 * * *"]

# Examples:
# Every 14 minutes, 24/7: ["*/14 * * * *"]
# Every 15 minutes, 9 AM-5 PM UTC: ["*/15 9-17 * * *"]
# Every 5 minutes, weekdays only: ["*/5 * * * 1-5"]
# Once every hour: ["0 * * * *"]
```

**🌍 Timezone Converter:**
- IST is UTC+5:30
- 7:00 AM IST = 1:30 AM UTC
- 12:00 PM IST = 6:30 AM UTC

### 🎯 Change the Ping Frequency

```toml
# Every 5 minutes (more frequent)
crons = ["*/5 1-6 * * *"]

# Every 30 minutes (less frequent)
crons = ["*/30 1-6 * * *"]

# Every hour
crons = ["0 1-6 * * *"]
```

### 🔧 Change the Worker Name

In `wrangler.toml`:
```toml
name = "my-custom-render-ping-worker"
```

### 📊 Add Better Logging

Update `src/index.js` for more detailed logs:

```js
export default {
  async scheduled(event, env, ctx) {
    const startTime = Date.now();
    
    try {
      const response = await fetch("https://your-app.onrender.com/healthz", {
        method: "GET",
      });
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          console.log(`✅ Ping successful: Server responded with status 'ok' (${duration}ms)`);
          console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
        } else {
          console.log(`⚠️ Ping completed but unexpected status: ${data.status || 'unknown'} (${duration}ms)`);
        }
      } else {
        console.log(`❌ Ping failed: HTTP ${response.status} (${duration}ms)`);
      }
    } catch (error) {
      console.error(`❌ Ping failed: ${error.message}`);
    }
  },
};
```

---

## 🔍 Production Monitoring & Troubleshooting

### 📊 Log Messages Explained

The worker provides detailed logging for monitoring:

- `🚀 Starting health check` - Beginning of check
- `✅ Health check successful!` - Successful ping with response time
- `⚠️ Server responded but status unclear` - Got response but wrong status
- `❌ HTTP Error` - Server returned error status code
- `⏱️ Request timeout` - Request took longer than timeout limit
- `🌐 Network error` - Connection/DNS issues
- `💔 All attempts failed` - All retries exhausted

### ✅ How to Verify It's Working

1. **View Real-time Logs in Cloudflare:**
   - Go to Workers & Pages → Your Worker
   - Click **Logs** tab (or **Real-time Logs**)
   - Look for messages like `✅ Health check successful!`
   - Check response times and timestamps

2. **Monitor Your Render App:**
   - Go to Render Dashboard → Your Service → **Logs**
   - Look for incoming GET requests to your health endpoint
   - Should see requests every 14 minutes during business hours

3. **Check Worker Analytics:**
   - In Cloudflare dashboard, go to **Analytics** tab
   - Monitor request success rates and execution duration

### 🚨 Common Issues & Solutions

**❌ "Configuration Error: RENDER_APP_URL not set"**
- Set the `RENDER_APP_URL` environment variable in Cloudflare dashboard
- Make sure it's your actual Render URL, not the placeholder

**❌ "All attempts failed" / "Network error"**
- Verify your Render app URL is correct and accessible
- Check if your Render app is actually running
- Test the URL manually in a browser

**❌ "Request timeout after 30000ms"**
- Your Render app might be taking too long to respond
- Increase `TIMEOUT_MS` environment variable
- Check if your app is cold-starting (normal for first request)

**❌ "HTTP 404" or "HTTP 500"**
- Verify the health endpoint exists (`/healthz` by default)
- Check your app's logs for internal errors
- Consider using a simpler endpoint like `/` (homepage)

**❌ "Worker not triggering"**
- Verify the cron schedule in `wrangler.toml`
- Check Cloudflare Workers dashboard for deployment errors
- Free tier workers might have slight delays

**❌ "JSON parse failed"**
- Your endpoint might be returning plain text instead of JSON
- The worker handles this automatically, but check your endpoint response
- Free tier workers might have some delay

**❌ "Render app still sleeping"**
- Ensure you're pinging the correct URL
- Check that your Render app responds to the health check endpoint
- Consider pinging more frequently (every 10 minutes instead of 14)

---

## 💰 Cost Breakdown

**Cloudflare Workers (Free Tier):**
- ✅ 100,000 requests/day
- ✅ This worker uses ~103 requests/day (7×24min×5 days ≈ 103)
- ✅ Completely free for this use case

**Render (Free Tier):**
- ✅ Stays awake during business hours
- ✅ Sleeps when not needed (saves resources)

---

## 📁 Repository Structure

```
cloudflare-render-ping/
├── README.md          # This file with instructions
├── wrangler.toml      # Cloudflare Worker configuration
└── src/
    └── index.js       # Main worker code
```

---

## 🤝 Contributing

Feel free to submit issues or pull requests to improve this worker!


