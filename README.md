# 🚀 Cloudflare Worker: Keep Your Render App Awake

A simple, reliable Cloudflare Worker that automatically pings your Render server every 14 minutes during business hours (7 AM - 12 PM IST) to prevent it from going to sleep on the free tier.

## 🎯 What Problem Does This Solve?

**The Problem**: Render's free tier puts apps to sleep after 15 minutes of inactivity, causing slow response times for the first user.

**The Solution**: This worker pings your app every 14 minutes during peak hours, keeping it awake when you need it most.

## ✨ Key Features

- 🆓 **Completely Free** - Uses Cloudflare's generous free tier
- ⏰ **Smart Scheduling** - Only pings during business hours to save resources
- 🛡️ **Production Ready** - Comprehensive error handling and retry logic
- 🔧 **Zero Maintenance** - Set it once and forget it
- 📊 **Detailed Logging** - Monitor performance and troubleshoot issues
- ⚡ **Fast Setup** - 5 minutes from start to finish

---

## 🚀 Complete Setup Guide

### Step 1: Fork This Repository

1. **Click the "Fork" button** at the top-right of this GitHub page
2. **Select your GitHub account** as the destination
3. **Click "Create fork"**

![Fork Repository](https://docs.github.com/assets/images/help/repository/fork_button.jpg)

---

### Step 2: Get Your Render App URL

1. **Go to your [Render Dashboard](https://dashboard.render.com/)**
2. **Click on your web service**
3. **Copy the complete URL** from the service overview
   - It looks like: `https://myapp-abc123.onrender.com`
   - Or: `https://my-awesome-api.onrender.com`

📝 **Save this URL** - you'll need it in Step 4!

---

### Step 3: Deploy to Cloudflare

#### 3.1 Create Cloudflare Account (if needed)
- **Go to [Cloudflare](https://cloudflare.com)** and sign up for free
- **No domain required** - we're just using Workers

#### 3.2 Deploy the Worker
1. **Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)**
2. **Click "Workers & Pages"** in the left sidebar
3. **Click "Create Application"**
4. **Select "Workers"** → **"Create Worker"**
5. **Name your worker**: `render-ping-worker` (or any name you like)
6. **Click "Deploy"** (this creates a basic worker)
7. **Click "Edit code"**
8. **Copy the entire contents** of your `src/index.js` file
9. **Paste it into the worker editor** (replace all existing code)
10. **Click "Save and Deploy"**

**Alternative: Deploy from GitHub (Recommended)**
1. **Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)**
2. **Click "Workers & Pages"** in the left sidebar  
3. **Click "Create Application"**
4. **Select "Workers"** → **"Deploy from GitHub"**
5. **Connect your GitHub account** (authorize if prompted)
6. **Select your forked repository**: `your-username/cloudflare-render-ping`
7. **Click "Deploy"**

⏳ **Wait 1-2 minutes** for the deployment to complete.

---

### Step 4: Configure Your Render URL

After deployment is successful:

1. **In your Cloudflare dashboard**, click on your newly created worker
2. **Go to "Settings"** → **"Environment variables"**
3. **Click "Add variable"**
4. **Add your Render URL**:
   - **Variable name**: `RENDER_APP_URL`
   - **Value**: Your Render URL from Step 2 (e.g., `https://myapp-abc123.onrender.com`)
   - **Environment**: Production
5. **Click "Save"**
6. **Click "Deploy"** to apply the changes

---

### Step 5: Test & Verify

#### 5.1 Check Worker Logs
1. **In Cloudflare dashboard**, go to your worker
2. **Click "Logs"** or **"Real-time Logs"**
3. **You should see logs** like:
   ```
   ✅ Health check successful!
   📊 Response time: 250ms
   🔗 URL: https://your-app.onrender.com/healthz
   ```

#### 5.2 Check Your Render App
1. **Go to your Render dashboard** → Your service → **Logs**
2. **Look for incoming requests** every 14 minutes
3. **You should see GET requests** to `/healthz` endpoint

---

## 🏥 Add a Health Check Endpoint (Recommended)

For best results, add a simple health check endpoint to your Render app:

### Express.js/Node.js
```javascript
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is alive' 
  });
});
```

### Python/Flask
```python
@app.route('/healthz')
def health_check():
    return {
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'message': 'Server is alive'
    }
```

### Python/FastAPI
```python
@app.get("/healthz")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "message": "Server is alive"
    }
```

### Don't want to add an endpoint?
**No problem!** You can ping any existing endpoint:
- **Homepage**: Set `HEALTH_ENDPOINT` to `/`
- **API endpoint**: Set `HEALTH_ENDPOINT` to `/api/status`
- **Any route**: Set `HEALTH_ENDPOINT` to your preferred path

---

## ⚙️ Customization Options

### Change the Health Check Endpoint

By default, the worker pings `/healthz`. To change this:

1. **In Cloudflare dashboard** → Your worker → **Settings** → **Environment variables**
2. **Add variable**:
   - **Name**: `HEALTH_ENDPOINT`
   - **Value**: `/` (for homepage) or `/api/health` (for custom endpoint)

### Change the Schedule

The worker runs every 14 minutes from 7 AM to 12 PM IST. To modify:

1. **Edit `wrangler.toml`** in your forked repository
2. **Update the cron expression**:
   ```toml
   [triggers]
   # Current: Every 14 minutes, 7 AM-12 PM IST
   crons = ["*/14 1-6 * * *"]
   
   # Examples:
   # Every 10 minutes, 24/7: ["*/10 * * * *"]
   # Every 15 minutes, 9 AM-5 PM UTC: ["*/15 9-17 * * *"]
   # Every 5 minutes, weekdays only: ["*/5 * * * 1-5"]
   ```
3. **Commit and push** the changes - Cloudflare will auto-deploy

### Advanced Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RENDER_APP_URL` | *(required)* | Your complete Render app URL |
| `HEALTH_ENDPOINT` | `/healthz` | Endpoint to ping |
| `TIMEOUT_MS` | `30000` | Request timeout (30 seconds) |
| `RETRY_ATTEMPTS` | `2` | Number of retry attempts on failure |

---

## 🔍 Troubleshooting

### ❌ "No fetch handler!" Error
**Problem**: You deployed this as a Cloudflare Page instead of a Worker.
**Solution**: 
1. **Delete the Pages deployment** in Cloudflare dashboard
2. **Deploy as a Worker instead** (see Step 3.2 above)
3. **Choose "Workers" → "Create Worker"** NOT "Pages"

### ❌ "Configuration Error: RENDER_APP_URL not set"
**Solution**: Set the `RENDER_APP_URL` environment variable in Cloudflare dashboard.

### ❌ "All attempts failed" / "Network error"
**Possible causes**:
- ✅ Check your Render URL is correct
- ✅ Ensure your Render app is running
- ✅ Test the URL manually in a browser

### ❌ "HTTP 404" error
**Possible causes**:
- ✅ Health endpoint doesn't exist - try setting `HEALTH_ENDPOINT` to `/`
- ✅ Check your app's routes are working

### ❌ "Request timeout"
**Possible causes**:
- ✅ Your app might be cold-starting (normal for first request)
- ✅ Increase `TIMEOUT_MS` to `60000` (60 seconds)

### ❌ Worker not running
**Check**:
- ✅ Deployment was successful in Cloudflare dashboard
- ✅ No errors in the deployment logs
- ✅ Environment variable is set correctly

### ❌ App still goes to sleep
**Try**:
- ✅ Reduce ping interval to every 10 minutes: `["*/10 1-6 * * *"]`
- ✅ Extend the time window: `["*/14 0-8 * * *"]` (6:30 AM - 1:30 PM IST)

---

## 📊 Understanding the Logs

### Success Messages
- `🚀 Starting health check` - Worker is starting
- `✅ Health check successful!` - Ping was successful
- `📊 Response time: XXXms` - How fast your app responded

### Warning Messages
- `⚠️ Server responded but status unclear` - Got response but wrong format
- `⚠️ JSON parse failed` - Response wasn't valid JSON (usually fine)

### Error Messages
- `❌ HTTP Error: 404` - Endpoint not found
- `❌ HTTP Error: 500` - Server error in your app
- `⏱️ Request timeout` - App took too long to respond
- `🌐 Network error` - Connection problem

---

## 💰 Cost Analysis

### Cloudflare (Free Tier)
- ✅ **100,000 requests/day included**
- ✅ **This worker uses ~75 requests/day**
- ✅ **Completely free for this use case**

### Render (Free Tier)
- ✅ **Stays awake during business hours**
- ✅ **Still sleeps at night to save resources**
- ✅ **No additional costs**

---

## 🔄 How It Works

1. **Cloudflare's cron scheduler** triggers the worker every 14 minutes
2. **Worker sends a GET request** to your Render app's health endpoint
3. **Your app responds**, resetting Render's 15-minute sleep timer
4. **Worker logs the result** for monitoring
5. **If the ping fails**, worker retries automatically
6. **Process repeats** during business hours only

---

## 📁 Project Structure

```
cloudflare-render-ping/
├── src/
│   └── index.js          # Main worker code
├── wrangler.toml         # Cloudflare configuration
├── package.json          # Dependencies
├── .gitignore           # Git ignore rules
└── README.md            # This guide
```

---

## 🤝 Need Help?

1. **Check the troubleshooting section** above
2. **Review your Cloudflare worker logs** for error messages
3. **Test your Render URL manually** in a browser
4. **Open an issue** in this repository if you're still stuck

---

## 🎉 You're All Set!

Your Render app will now stay awake during business hours automatically. No more slow cold starts for your users! 

**Want to check if it's working?** Look for regular GET requests in your Render app logs every 14 minutes.

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


