import { recordPingResult } from './state.js';

/**
 * Format uptime in seconds to human-readable string (e.g. "46m 58s", "1d 2h 15m").
 * @param {number} seconds
 * @returns {string|null}
 */
export function formatUptime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return null;
  }
  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Extract rich server metrics from a JSON response payload.
 * Target schema example:
 * {"ok":true,"version":1,"uptimeSeconds":2818,"connections":1,"pendingImports":0,"rooms":2,"privateRooms":0,"players":0}
 *
 * @param {object} data
 * @returns {object|null}
 */
export function extractMetrics(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const metrics = {};

  // Uptime in seconds
  const uptimeVal = data.uptimeSeconds ?? data.uptime_seconds ?? data.uptime;
  if (typeof uptimeVal === 'number' && !isNaN(uptimeVal)) {
    metrics.uptimeSeconds = uptimeVal;
    metrics.uptimeFormatted = formatUptime(uptimeVal);
  }

  // Version
  if (data.version !== undefined && data.version !== null) {
    metrics.version = data.version;
  }

  // Active connections
  const connectionsVal = data.connections ?? data.activeConnections ?? data.connectionCount;
  if (typeof connectionsVal === 'number') {
    metrics.connections = connectionsVal;
  }

  // Pending imports
  if (typeof data.pendingImports === 'number') {
    metrics.pendingImports = data.pendingImports;
  }

  // Rooms and private rooms
  if (typeof data.rooms === 'number') {
    metrics.rooms = data.rooms;
  }
  if (typeof data.privateRooms === 'number') {
    metrics.privateRooms = data.privateRooms;
  }

  // Players
  const playersVal = data.players ?? data.activePlayers ?? data.playerCount;
  if (typeof playersVal === 'number') {
    metrics.players = playersVal;
  }

  // Collect other scalar metrics if present
  const standardKeys = new Set([
    'ok', 'status', 'healthy', 'success',
    'uptimeSeconds', 'uptime_seconds', 'uptime',
    'version', 'connections', 'activeConnections', 'connectionCount',
    'pendingImports', 'rooms', 'privateRooms',
    'players', 'activePlayers', 'playerCount'
  ]);

  const extra = {};
  for (const [key, value] of Object.entries(data)) {
    if (!standardKeys.has(key) && (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean')) {
      extra[key] = value;
    }
  }

  if (Object.keys(extra).length > 0) {
    metrics.extra = extra;
  }

  metrics.raw = data;

  return metrics;
}

/**
 * Evaluates whether an HTTP response represents a healthy service.
 * 
 * Rules:
 * - Any response.ok (HTTP 200-299) is treated as healthy.
 * - Recognizes data.ok === true, data.status in ('ok', 'healthy', 'UP'), data.success === true,
 *   or non-empty 200 OK body.
 * - Extracts rich metrics if response is JSON.
 *
 * @param {Response} response
 * @param {string} bodyText
 * @returns {object}
 */
export function evaluateHealthResponse(response, bodyText) {
  const httpStatus = response.status;
  const isHttpOk = response.ok; // status in 200-299

  let parsedJson = null;
  let isJson = false;

  const rawTrimmed = (bodyText || '').trim();

  if (rawTrimmed.length > 0) {
    try {
      parsedJson = JSON.parse(rawTrimmed);
      isJson = typeof parsedJson === 'object' && parsedJson !== null;
    } catch {
      isJson = false;
    }
  }

  let isHealthy = false;
  let status = 'unknown';

  if (isHttpOk) {
    isHealthy = true;

    if (isJson && parsedJson) {
      if (parsedJson.ok === true) {
        status = 'ok';
      } else if (parsedJson.success === true) {
        status = 'ok';
      } else if (typeof parsedJson.status === 'string') {
        const normalized = parsedJson.status.trim().toLowerCase();
        if (['ok', 'healthy', 'up'].includes(normalized)) {
          status = normalized;
        } else {
          status = parsedJson.status;
        }
      } else if (parsedJson.healthy === true) {
        status = 'healthy';
      } else {
        // Any 200-299 with JSON is healthy
        status = 'ok';
      }
    } else if (rawTrimmed.length > 0) {
      const lower = rawTrimmed.toLowerCase();
      if (['ok', 'healthy', 'up', 'pong'].includes(lower)) {
        status = lower;
      } else if (lower.includes('ok')) {
        status = 'ok';
      } else {
        // Non-empty 200 OK body
        status = 'ok';
      }
    } else {
      // Empty 200/204 body
      status = 'ok';
    }
  } else {
    isHealthy = false;
    status = `http_${httpStatus}`;
  }

  const metrics = isJson ? extractMetrics(parsedJson) : null;

  return {
    isHealthy,
    status,
    httpStatus,
    isJson,
    metrics,
    parsedJson,
    rawBody: rawTrimmed,
  };
}

/**
 * Normalizes a base URL (removes trailing slashes).
 * @param {string} url
 * @param {string} fallback
 * @returns {string}
 */
export function normalizeBaseUrl(url, fallback = 'https://songless-unlimited.onrender.com') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  const trimmed = url.trim();
  // If the old placeholder "https://thekavin.com" or "https://your-app.onrender.com" is set, fallback to default
  if (trimmed === 'https://thekavin.com' || trimmed === 'https://your-app.onrender.com') {
    return fallback;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Normalizes an endpoint path (ensures leading slash).
 * @param {string} endpoint
 * @param {string} defaultEndpoint
 * @returns {string}
 */
export function normalizeEndpoint(endpoint, defaultEndpoint = '/healthz') {
  if (!endpoint || typeof endpoint !== 'string' || !endpoint.trim()) {
    return defaultEndpoint;
  }
  const trimmed = endpoint.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Sleep helper with promise.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single HTTP request with timeout.
 * @param {string} url
 * @param {number} timeoutMs
 * @param {Function} fetchFn
 * @returns {Promise<object>}
 */
export async function executeSingleCheck(url, timeoutMs, fetchFn = fetch) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Cloudflare-Worker-Render-Ping/2.0 (+https://github.com/kavinthangavel/cloudflare-render-ping)',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const bodyText = await response.text().catch(() => '');
    const evaluation = evaluateHealthResponse(response, bodyText);

    return {
      success: evaluation.isHealthy,
      httpStatus: response.status,
      statusText: response.statusText,
      durationMs,
      evaluation,
      headers: {
        rndrId: response.headers.get('rndr-id'),
        renderOrigin: response.headers.get('x-render-origin-server'),
        contentType: response.headers.get('content-type'),
        cfRay: response.headers.get('cf-ray'),
      },
      error: evaluation.isHealthy ? null : new Error(`HTTP ${response.status}: ${response.statusText || 'Error'}`),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    let error = err;
    if (err.name === 'AbortError') {
      error = new Error(`Request timeout after ${timeoutMs}ms`);
    }
    return {
      success: false,
      httpStatus: null,
      statusText: null,
      durationMs,
      evaluation: null,
      headers: {},
      error,
    };
  }
}

/**
 * Main ping orchestration logic with retries, metrics extraction, and fallback.
 * 
 * @param {object} env - Cloudflare worker environment variables
 * @param {Function} fetchFn - Fetch implementation (defaults to global fetch)
 * @param {Function} sleepFn - Sleep implementation (defaults to setTimeout)
 * @returns {Promise<object>}
 */
export async function executePing(env = {}, fetchFn = fetch, sleepFn = defaultSleep) {
  const baseUrl = normalizeBaseUrl(env.RENDER_APP_URL, 'https://songless-unlimited.onrender.com');
  const healthEndpoint = normalizeEndpoint(env.HEALTH_ENDPOINT, '/healthz');
  const fallbackEndpoint = normalizeEndpoint(env.FALLBACK_ENDPOINT, '/');
  const timeoutMs = parseInt(env.TIMEOUT_MS, 10) || 30000;
  const retryAttempts = Math.max(1, parseInt(env.RETRY_ATTEMPTS, 10) || 2);
  const enableFallback = env.ENABLE_FALLBACK !== 'false';

  const primaryUrl = `${baseUrl}${healthEndpoint}`;
  const timestamp = new Date().toISOString();

  console.log(`🚀 [Ping] Starting keep-alive check for ${primaryUrl}`);
  console.log(`⏰ [Ping] Timestamp: ${timestamp} | Retries: ${retryAttempts} | Timeout: ${timeoutMs}ms`);

  let lastPrimaryError = null;
  let lastHttpStatus = null;
  let totalDurationMs = 0;

  // 1. Primary Health Check with retries
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    console.log(`🔄 [Ping] Attempt ${attempt}/${retryAttempts} -> ${primaryUrl}`);
    const check = await executeSingleCheck(primaryUrl, timeoutMs, fetchFn);
    totalDurationMs += check.durationMs;
    lastHttpStatus = check.httpStatus;

    if (check.success && check.evaluation?.isHealthy) {
      console.log(`✅ [Ping] Health check succeeded in ${check.durationMs}ms (HTTP ${check.httpStatus})`);
      if (check.evaluation.metrics) {
        const m = check.evaluation.metrics;
        console.log(`📊 [Metrics] Uptime: ${m.uptimeFormatted || 'N/A'} | Version: ${m.version ?? 'N/A'} | Connections: ${m.connections ?? 'N/A'} | Rooms: ${m.rooms ?? 'N/A'} | Players: ${m.players ?? 'N/A'}`);
      }

      const result = {
        success: true,
        status: check.evaluation.status,
        targetUrl: primaryUrl,
        endpoint: healthEndpoint,
        isFallback: false,
        httpStatus: check.httpStatus,
        durationMs: check.durationMs,
        totalDurationMs,
        timestamp: new Date().toISOString(),
        metrics: check.evaluation.metrics,
        message: `Health check passed (${check.evaluation.status}) in ${check.durationMs}ms`,
        diagnostics: {
          attempt,
          totalAttempts: retryAttempts,
          isJson: check.evaluation.isJson,
          headers: check.headers,
        },
      };

      recordPingResult(result);
      return result;
    }

    lastPrimaryError = check.error || new Error(`Health check returned unexpected status ${check.httpStatus}`);
    console.warn(`⚠️ [Ping] Attempt ${attempt} failed: ${lastPrimaryError.message} (${check.durationMs}ms)`);

    if (attempt < retryAttempts) {
      const backoffMs = 1000 * attempt;
      console.log(`⏳ [Ping] Waiting ${backoffMs}ms before retry...`);
      await sleepFn(backoffMs);
    }
  }

  // 2. Fallback Logic:
  // If primary health endpoint fails (e.g. 404, 500, network error),
  // attempt a fallback ping to root URL "/" because ANY incoming HTTP request
  // resets Render's 15-minute sleep timer.
  if (enableFallback && healthEndpoint !== fallbackEndpoint) {
    const fallbackUrl = `${baseUrl}${fallbackEndpoint}`;
    console.warn(`⚠️ [Ping] Primary endpoint ${primaryUrl} failed after ${retryAttempts} attempts (${lastPrimaryError?.message}). Attempting fallback ping to root: ${fallbackUrl}`);

    const fallbackCheck = await executeSingleCheck(fallbackUrl, timeoutMs, fetchFn);
    totalDurationMs += fallbackCheck.durationMs;

    // Any HTTP response from Render (even 404 from origin or response with Render headers)
    // proves the request reached Render's web service and reset its sleep timer.
    const isRenderAwake = (fallbackCheck.httpStatus !== null && fallbackCheck.httpStatus < 500) ||
                          Boolean(fallbackCheck.headers?.rndrId) ||
                          Boolean(fallbackCheck.headers?.renderOrigin) ||
                          Boolean(fallbackCheck.evaluation?.isHealthy);

    if (isRenderAwake) {
      console.log(`✅ [Ping] Fallback ping to ${fallbackUrl} reached Render (HTTP ${fallbackCheck.httpStatus}, ${fallbackCheck.durationMs}ms). Render sleep timer reset!`);

      const fallbackResult = {
        success: true,
        status: fallbackCheck.evaluation?.isHealthy ? 'ok' : 'awake_via_fallback',
        targetUrl: fallbackUrl,
        endpoint: fallbackEndpoint,
        isFallback: true,
        primaryEndpoint: healthEndpoint,
        primaryError: lastPrimaryError?.message || 'Primary endpoint failed',
        httpStatus: fallbackCheck.httpStatus,
        durationMs: fallbackCheck.durationMs,
        totalDurationMs,
        timestamp: new Date().toISOString(),
        metrics: fallbackCheck.evaluation?.metrics || null,
        message: `Primary endpoint (${healthEndpoint}) failed, but fallback to root (${fallbackEndpoint}) reached Render (HTTP ${fallbackCheck.httpStatus}) and reset sleep timer.`,
        diagnostics: {
          primaryAttempts: retryAttempts,
          fallbackHttpStatus: fallbackCheck.httpStatus,
          fallbackDurationMs: fallbackCheck.durationMs,
          headers: fallbackCheck.headers,
        },
      };

      recordPingResult(fallbackResult);
      return fallbackResult;
    } else {
      console.error(`❌ [Ping] Fallback ping to ${fallbackUrl} also failed: ${fallbackCheck.error?.message || `HTTP ${fallbackCheck.httpStatus}`}`);
    }
  }

  // 3. Complete failure
  console.error(`💔 [Ping] All health check attempts and fallback failed for ${baseUrl}`);
  const finalErrorMsg = lastPrimaryError?.message || 'Unknown network error';

  const failureResult = {
    success: false,
    status: 'failed',
    targetUrl: primaryUrl,
    endpoint: healthEndpoint,
    isFallback: false,
    httpStatus: lastHttpStatus,
    durationMs: totalDurationMs,
    totalDurationMs,
    timestamp: new Date().toISOString(),
    error: `Health check failed after ${retryAttempts} attempts: ${finalErrorMsg}`,
    metrics: null,
    diagnostics: {
      attempts: retryAttempts,
      totalDurationMs,
      lastError: finalErrorMsg,
    },
  };

  recordPingResult(failureResult);
  return failureResult;
}
