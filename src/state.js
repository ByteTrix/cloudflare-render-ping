// In-memory state tracking for the Cloudflare Worker isolate
let isolateStartedAt = null;
let lastPingResult = null;
const pingHistory = [];
const MAX_HISTORY = 25;

/**
 * Record a ping result in memory and prepend to recent history.
 * @param {object} result
 */
export function recordPingResult(result) {
  if (!result || typeof result !== 'object') return;
  
  lastPingResult = result;
  
  pingHistory.unshift({
    timestamp: result.timestamp || new Date().toISOString(),
    success: Boolean(result.success),
    status: result.status || (result.success ? 'ok' : 'failed'),
    httpStatus: result.httpStatus ?? null,
    durationMs: result.durationMs ?? null,
    endpoint: result.endpoint || '/healthz',
    isFallback: Boolean(result.isFallback),
    error: result.error || null,
  });

  if (pingHistory.length > MAX_HISTORY) {
    pingHistory.pop();
  }
}

/**
 * Get the most recent ping result.
 * @returns {object|null}
 */
export function getLastPingResult() {
  return lastPingResult;
}

/**
 * Get recent ping history.
 * @returns {Array<object>}
 */
export function getPingHistory() {
  return [...pingHistory];
}

/**
 * Get metadata about the current worker isolate.
 * @returns {object}
 */
export function getIsolateMetadata() {
  if (!isolateStartedAt) {
    isolateStartedAt = new Date().toISOString();
  }
  const uptimeSeconds = Math.max(0, Math.floor((Date.now() - new Date(isolateStartedAt).getTime()) / 1000));
  return {
    isolateStartedAt,
    uptimeSeconds,
    totalPingsRecorded: pingHistory.length,
  };
}

/**
 * Reset state (useful for unit tests).
 */
export function resetStateForTesting() {
  lastPingResult = null;
  pingHistory.length = 0;
}
