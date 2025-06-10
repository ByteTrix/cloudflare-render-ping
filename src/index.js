export default {
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
