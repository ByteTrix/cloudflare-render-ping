export default {
  // Handle HTTP requests (when someone visits the worker URL)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Simple status page
    if (url.pathname === '/' || url.pathname === '/status') {
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Render Ping Worker</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>🚀 Render Ping Worker</h1>
    <div class="status success">
        ✅ Worker is running successfully!
    </div>    <div class="status info">
        📋 <strong>Configuration:</strong><br>
        Target URL: <code>${env.RENDER_APP_URL || 'Not configured'}</code><br>
        Health Endpoint: <code>${env.HEALTH_ENDPOINT || '/healthz'}</code><br>
        Schedule: Every 14 minutes, 7 AM - 12 PM IST<br>
        <small><a href="/debug">🔍 View all environment variables</a></small>
    </div>
    <p><strong>How it works:</strong> This worker automatically pings your Render app every 14 minutes during business hours to keep it awake.</p>
    <p><strong>Next steps:</strong> ${env.RENDER_APP_URL ? 'Your worker is configured and ready!' : 'Set the RENDER_APP_URL environment variable in your Cloudflare dashboard.'}</p>
    ${!env.RENDER_APP_URL ? '<div class="status" style="background:#fff3cd;color:#856404;border:1px solid #ffeaa7;">⚠️ <strong>Setup Required:</strong> Go to Cloudflare Dashboard → Your Worker → Settings → Variables → Add RENDER_APP_URL</div>' : ''}
    <hr>
    <p><small>🔗 <a href="https://github.com/kavinthangavel/cloudflare-render-ping">View on GitHub</a></small></p>
</body>
</html>`;
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Handle favicon requests (prevent errors)
    if (url.pathname === '/favicon.ico') {
      return new Response('', { status: 404 });
    }    // API endpoint to manually trigger a health check (GET or POST)
    if (url.pathname === '/ping' && (request.method === 'GET' || request.method === 'POST')) {
      try {
        // Run the health check manually
        await this.scheduled(null, env, ctx);
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Health check triggered successfully',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Debug endpoint to check environment variables
    if (url.pathname === '/debug') {
      return new Response(JSON.stringify({
        environment_variables: {
          RENDER_APP_URL: env.RENDER_APP_URL || 'NOT SET',
          HEALTH_ENDPOINT: env.HEALTH_ENDPOINT || 'NOT SET (default: /healthz)',
          TIMEOUT_MS: env.TIMEOUT_MS || 'NOT SET (default: 30000)',
          RETRY_ATTEMPTS: env.RETRY_ATTEMPTS || 'NOT SET (default: 2)'
        },
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Default response for unknown paths
    return new Response('404 Not Found', { status: 404 });
  },

  // Handle scheduled cron jobs
  async scheduled(event, env, ctx) {
    // Configuration with environment variables and fallbacks
    const renderUrl = env.RENDER_APP_URL || "https://thekavin.com";
    const healthEndpoint = env.HEALTH_ENDPOINT || "/healthz";
    const timeout = parseInt(env.TIMEOUT_MS) || 30000; // 30 seconds default
    const retryAttempts = parseInt(env.RETRY_ATTEMPTS) || 2;
    const fullUrl = `${renderUrl}${healthEndpoint}`;

    // Validation
    if (!renderUrl || renderUrl === "https://thekavin.com") {
      console.error(`❌ Configuration Error: RENDER_APP_URL not set or using default placeholder`);
      return;
    }

    console.log(`🚀 Starting health check for: ${fullUrl}`);
    console.log(`⏰ Scheduled at: ${new Date().toISOString()}`);

    let lastError = null;
    
    // Retry logic
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        
        console.log(`🔄 Attempt ${attempt}/${retryAttempts}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Cloudflare-Worker-Health-Check/1.0",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          // Try to parse JSON response
          let data;
          const contentType = response.headers.get("content-type");
          
          if (contentType && contentType.includes("application/json")) {
            try {
              data = await response.json();
            } catch (parseError) {
              console.log(`⚠️ JSON parse failed: ${parseError.message}`);
              data = { status: 'unknown' };
            }
          } else {
            // Handle non-JSON responses (like plain text "OK")
            const text = await response.text();
            data = { status: text.toLowerCase().includes('ok') ? 'ok' : 'unknown', raw: text };
          }
          
          if (data.status === 'ok' || (typeof data === 'string' && data.toLowerCase().includes('ok'))) {
            console.log(`✅ Health check successful!`);
            console.log(`📊 Response time: ${duration}ms`);
            console.log(`🎯 Status: ${data.status || 'ok'}`);
            console.log(`🔗 URL: ${fullUrl}`);
            console.log(`📅 Timestamp: ${new Date().toISOString()}`);
            
            // Success - exit retry loop
            return;
          } else {
            console.log(`⚠️ Server responded but status unclear: ${JSON.stringify(data)}`);
            lastError = new Error(`Unexpected status: ${data.status || 'unknown'}`);
          }
        } else {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.log(`❌ HTTP Error: ${response.status} ${response.statusText} (${duration}ms)`);
        }
        
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        if (error.name === 'AbortError') {
          console.error(`⏱️ Request timeout after ${timeout}ms`);
        } else if (error.message.includes('fetch')) {
          console.error(`🌐 Network error: ${error.message}`);
        } else {
          console.error(`💥 Unexpected error: ${error.message}`);
        }
        
        console.error(`📊 Failed after: ${duration}ms`);
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < retryAttempts) {
        const waitTime = 1000 * attempt; // Exponential backoff: 1s, 2s, etc.
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // All attempts failed
    console.error(`💔 All ${retryAttempts} attempts failed`);
    console.error(`🔗 Failed URL: ${fullUrl}`);
    console.error(`🚨 Final error: ${lastError?.message || 'Unknown error'}`);
    console.error(`📅 Failed at: ${new Date().toISOString()}`);
    
    // Optionally, you could throw here to mark the scheduled execution as failed
    // throw new Error(`Health check failed after ${retryAttempts} attempts: ${lastError?.message}`);
  },
};
