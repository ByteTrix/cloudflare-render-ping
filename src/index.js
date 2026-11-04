import { executePing } from './pinger.js';
import { getLastPingResult, getPingHistory, getIsolateMetadata } from './state.js';
import { renderStatusPage } from './ui.js';

export default {
  /**
   * Handle incoming HTTP requests
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // HTML Status Dashboard
    if (url.pathname === '/' || url.pathname === '/status') {
      const state = {
        lastPing: getLastPingResult(),
        history: getPingHistory(),
        isolate: getIsolateMetadata(),
      };
      const html = renderStatusPage(state, env);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Favicon handler
    if (url.pathname === '/favicon.ico') {
      return new Response('', { status: 404 });
    }

    // Manual health check trigger (/ping via GET or POST)
    if (url.pathname === '/ping' && (request.method === 'GET' || request.method === 'POST')) {
      try {
        const pingResult = await executePing(env);
        const statusCode = pingResult.success ? 200 : 502;

        return new Response(JSON.stringify({
          success: pingResult.success,
          message: pingResult.success
            ? (pingResult.isFallback
                ? 'Health check reached Render via root fallback (sleep timer reset)'
                : 'Health check completed successfully')
            : 'Health check failed',
          timestamp: new Date().toISOString(),
          durationMs: pingResult.durationMs,
          status: pingResult.status,
          httpStatus: pingResult.httpStatus,
          endpoint: pingResult.endpoint,
          isFallback: pingResult.isFallback,
          metrics: pingResult.metrics,
          result: pingResult,
        }, null, 2), {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }, null, 2), {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });
      }
    }

    // Debug / diagnostics endpoint
    if (url.pathname === '/debug') {
      const lastPing = getLastPingResult();
      return new Response(JSON.stringify({
        worker: {
          name: 'render-ping-worker',
          version: '2.0.0',
          isolate: getIsolateMetadata(),
          timestamp: new Date().toISOString(),
        },
        configuration: {
          RENDER_APP_URL: env.RENDER_APP_URL || 'https://songless-unlimited.onrender.com (default)',
          HEALTH_ENDPOINT: env.HEALTH_ENDPOINT || '/healthz (default)',
          FALLBACK_ENDPOINT: env.FALLBACK_ENDPOINT || '/ (default)',
          TIMEOUT_MS: parseInt(env.TIMEOUT_MS, 10) || 30000,
          RETRY_ATTEMPTS: parseInt(env.RETRY_ATTEMPTS, 10) || 2,
          ENABLE_FALLBACK: env.ENABLE_FALLBACK !== 'false',
          CRON_SCHEDULE: '*/10 * * * * (Every 10 minutes, 24/7)',
        },
        last_ping: lastPing,
        metrics: lastPing?.metrics || null,
        history: getPingHistory(),
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Unknown route
    return new Response('404 Not Found', { status: 404 });
  },

  /**
   * Handle scheduled cron trigger
   */
  async scheduled(event, env, ctx) {
    console.log(`⏰ Scheduled keep-alive cron triggered at ${new Date().toISOString()}`);
    if (event?.cron) {
      console.log(`⏱️ Cron schedule pattern: ${event.cron}`);
    }
    const result = await executePing(env);
    return result;
  },
};
