import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatUptime,
  extractMetrics,
  evaluateHealthResponse,
  normalizeBaseUrl,
  normalizeEndpoint,
  executePing,
} from '../src/pinger.js';
import {
  recordPingResult,
  getLastPingResult,
  getPingHistory,
  resetStateForTesting,
  getIsolateMetadata,
} from '../src/state.js';
import worker from '../src/index.js';

test('formatUptime correctly formats various durations', () => {
  assert.equal(formatUptime(0), '0s');
  assert.equal(formatUptime(45), '45s');
  assert.equal(formatUptime(60), '1m 0s');
  assert.equal(formatUptime(2818), '46m 58s');
  assert.equal(formatUptime(3600), '1h 0m 0s');
  assert.equal(formatUptime(3665), '1h 1m 5s');
  assert.equal(formatUptime(86400), '1d 0h 0m 0s');
  assert.equal(formatUptime(90061), '1d 1h 1m 1s');
  assert.equal(formatUptime(-1), null);
  assert.equal(formatUptime(null), null);
  assert.equal(formatUptime('invalid'), null);
});

test('extractMetrics correctly extracts rich metrics from live Render JSON payload', () => {
  const livePayload = {
    ok: true,
    version: 1,
    uptimeSeconds: 2818,
    connections: 1,
    pendingImports: 0,
    rooms: 2,
    privateRooms: 0,
    players: 0,
  };

  const metrics = extractMetrics(livePayload);
  assert.ok(metrics);
  assert.equal(metrics.uptimeSeconds, 2818);
  assert.equal(metrics.uptimeFormatted, '46m 58s');
  assert.equal(metrics.version, 1);
  assert.equal(metrics.connections, 1);
  assert.equal(metrics.pendingImports, 0);
  assert.equal(metrics.rooms, 2);
  assert.equal(metrics.privateRooms, 0);
  assert.equal(metrics.players, 0);
  assert.deepEqual(metrics.raw, livePayload);
});

test('extractMetrics captures extra metrics and alternate naming conventions', () => {
  const customPayload = {
    uptime: 120,
    activeConnections: 5,
    activePlayers: 4,
    customField: 'extraValue',
    loadAvg: 0.42,
  };

  const metrics = extractMetrics(customPayload);
  assert.equal(metrics.uptimeSeconds, 120);
  assert.equal(metrics.uptimeFormatted, '2m 0s');
  assert.equal(metrics.connections, 5);
  assert.equal(metrics.players, 4);
  assert.equal(metrics.extra.customField, 'extraValue');
  assert.equal(metrics.extra.loadAvg, 0.42);
});

test('evaluateHealthResponse handles live songless-unlimited payload with ok: true', () => {
  const mockResponse = { ok: true, status: 200, statusText: 'OK' };
  const rawBody = JSON.stringify({
    ok: true,
    version: 1,
    uptimeSeconds: 2818,
    connections: 1,
    pendingImports: 0,
    rooms: 2,
    privateRooms: 0,
    players: 0,
  });

  const evaluation = evaluateHealthResponse(mockResponse, rawBody);
  assert.equal(evaluation.isHealthy, true);
  assert.equal(evaluation.status, 'ok');
  assert.equal(evaluation.httpStatus, 200);
  assert.equal(evaluation.isJson, true);
  assert.equal(evaluation.metrics.uptimeSeconds, 2818);
  assert.equal(evaluation.metrics.uptimeFormatted, '46m 58s');
  assert.equal(evaluation.metrics.rooms, 2);
  assert.equal(evaluation.metrics.connections, 1);
});

test('evaluateHealthResponse recognizes various healthy JSON payloads', () => {
  const mockResponse = { ok: true, status: 200, statusText: 'OK' };

  // status: "ok"
  assert.equal(evaluateHealthResponse(mockResponse, '{"status":"ok"}').isHealthy, true);
  assert.equal(evaluateHealthResponse(mockResponse, '{"status":"ok"}').status, 'ok');

  // status: "healthy"
  assert.equal(evaluateHealthResponse(mockResponse, '{"status":"healthy"}').status, 'healthy');

  // status: "UP"
  assert.equal(evaluateHealthResponse(mockResponse, '{"status":"UP"}').status, 'up');

  // success: true
  assert.equal(evaluateHealthResponse(mockResponse, '{"success":true}').status, 'ok');

  // healthy: true
  assert.equal(evaluateHealthResponse(mockResponse, '{"healthy":true}').status, 'healthy');
});

test('evaluateHealthResponse treats any 200-299 response as healthy, including plain text', () => {
  const mockResponse = { ok: true, status: 200, statusText: 'OK' };

  // Plain text "OK"
  const okText = evaluateHealthResponse(mockResponse, 'OK');
  assert.equal(okText.isHealthy, true);
  assert.equal(okText.status, 'ok');

  // Plain text "pong"
  const pongText = evaluateHealthResponse(mockResponse, 'pong');
  assert.equal(pongText.isHealthy, true);
  assert.equal(pongText.status, 'pong');

  // Non-empty arbitrary body
  const arbText = evaluateHealthResponse(mockResponse, 'Multiplayer server. WebSocket at /mp');
  assert.equal(arbText.isHealthy, true);
  assert.equal(arbText.status, 'ok');

  // Empty 200 or 204
  const emptyRes = evaluateHealthResponse({ ok: true, status: 204, statusText: 'No Content' }, '');
  assert.equal(emptyRes.isHealthy, true);
  assert.equal(emptyRes.status, 'ok');
});

test('evaluateHealthResponse correctly flags HTTP errors as unhealthy', () => {
  const error404 = evaluateHealthResponse({ ok: false, status: 404, statusText: 'Not Found' }, 'Not Found');
  assert.equal(error404.isHealthy, false);
  assert.equal(error404.status, 'http_404');

  const error500 = evaluateHealthResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }, '{"error":"boom"}');
  assert.equal(error500.isHealthy, false);
  assert.equal(error500.status, 'http_500');
});

test('normalizeBaseUrl and normalizeEndpoint ensure clean URLs', () => {
  assert.equal(normalizeBaseUrl('https://my-app.onrender.com/'), 'https://my-app.onrender.com');
  assert.equal(normalizeBaseUrl('https://my-app.onrender.com///'), 'https://my-app.onrender.com');
  assert.equal(normalizeBaseUrl(null), 'https://songless-unlimited.onrender.com');
  assert.equal(normalizeBaseUrl(''), 'https://songless-unlimited.onrender.com');
  assert.equal(normalizeBaseUrl('https://thekavin.com'), 'https://songless-unlimited.onrender.com');

  assert.equal(normalizeEndpoint('healthz'), '/healthz');
  assert.equal(normalizeEndpoint('/healthz'), '/healthz');
  assert.equal(normalizeEndpoint(''), '/healthz');
  assert.equal(normalizeEndpoint(null), '/healthz');
  assert.equal(normalizeEndpoint('/', '/'), '/');
});

test('executePing happy path succeeds on primary endpoint and extracts metrics', async () => {
  resetStateForTesting();

  const mockPayload = {
    ok: true,
    version: 1,
    uptimeSeconds: 2818,
    connections: 1,
    pendingImports: 0,
    rooms: 2,
    privateRooms: 0,
    players: 0,
  };

  const mockFetch = async (url) => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json',
        'rndr-id': 'mock-render-123',
      }),
      text: async () => JSON.stringify(mockPayload),
    };
  };

  const result = await executePing({
    RENDER_APP_URL: 'https://songless-unlimited.onrender.com',
    HEALTH_ENDPOINT: '/healthz',
    RETRY_ATTEMPTS: '2',
  }, mockFetch, () => Promise.resolve());

  assert.equal(result.success, true);
  assert.equal(result.isFallback, false);
  assert.equal(result.endpoint, '/healthz');
  assert.equal(result.metrics.uptimeSeconds, 2818);
  assert.equal(result.metrics.rooms, 2);

  // Check state tracking
  const lastState = getLastPingResult();
  assert.equal(lastState.success, true);
  assert.equal(lastState.metrics.uptimeSeconds, 2818);
  assert.equal(getPingHistory().length, 1);
});

test('executePing falls back to root / when /healthz returns 404', async () => {
  resetStateForTesting();

  const mockFetch = async (url) => {
    if (url.endsWith('/healthz')) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'rndr-id': 'mock-id' }),
        text: async () => '404 Not Found',
      };
    }
    if (url.endsWith('/')) {
      // Live Render behavior: root responds 404 with origin banner
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({
          'rndr-id': 'render-root-id',
          'x-render-origin-server': 'Render',
        }),
        text: async () => 'Multiplayer server. WebSocket at /mp',
      };
    }
    throw new Error('Unknown URL: ' + url);
  };

  const result = await executePing({
    RENDER_APP_URL: 'https://songless-unlimited.onrender.com',
    HEALTH_ENDPOINT: '/healthz',
    FALLBACK_ENDPOINT: '/',
    RETRY_ATTEMPTS: '1',
    ENABLE_FALLBACK: 'true',
  }, mockFetch, () => Promise.resolve());

  assert.equal(result.success, true);
  assert.equal(result.isFallback, true);
  assert.equal(result.endpoint, '/');
  assert.equal(result.status, 'awake_via_fallback');
  assert.equal(result.httpStatus, 404);
  assert.match(result.message, /fallback to root/i);
});

test('executePing retries on first attempt failure then succeeds on second', async () => {
  resetStateForTesting();

  let callCount = 0;
  const mockFetch = async (url) => {
    callCount++;
    if (callCount === 1) {
      throw new Error('Transient network error');
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ ok: true, version: 1 }),
    };
  };

  let sleepCalled = false;
  const mockSleep = async () => { sleepCalled = true; };

  const result = await executePing({
    RENDER_APP_URL: 'https://songless-unlimited.onrender.com',
    RETRY_ATTEMPTS: '2',
  }, mockFetch, mockSleep);

  assert.equal(result.success, true);
  assert.equal(callCount, 2);
  assert.equal(sleepCalled, true);
  assert.equal(result.diagnostics.attempt, 2);
});

test('executePing records failure when both primary and fallback fail', async () => {
  resetStateForTesting();

  const mockFetch = async () => {
    throw new Error('Host unreachable');
  };

  const result = await executePing({
    RENDER_APP_URL: 'https://songless-unlimited.onrender.com',
    RETRY_ATTEMPTS: '1',
    ENABLE_FALLBACK: 'true',
  }, mockFetch, () => Promise.resolve());

  assert.equal(result.success, false);
  assert.equal(result.status, 'failed');
  assert.match(result.error, /Health check failed/);
});

test('state history limits to MAX_HISTORY entries', () => {
  resetStateForTesting();

  for (let i = 1; i <= 35; i++) {
    recordPingResult({
      success: true,
      status: 'ok',
      durationMs: i * 10,
      endpoint: '/healthz',
    });
  }

  const history = getPingHistory();
  assert.equal(history.length, 25);
  assert.equal(history[0].durationMs, 350); // Most recent first
});

test('Worker fetch handlers serve UI, ping, and debug routes', async () => {
  resetStateForTesting();

  const mockPayload = {
    ok: true,
    version: 1,
    uptimeSeconds: 2818,
    connections: 1,
    rooms: 2,
    players: 0,
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json',
        'rndr-id': 'mock-render-123',
      }),
      text: async () => JSON.stringify(mockPayload),
    };
  };

  try {
    const env = {
      RENDER_APP_URL: 'https://songless-unlimited.onrender.com',
      HEALTH_ENDPOINT: '/healthz',
    };

    // 1. GET / (Status UI)
    const homeReq = new Request('https://worker.test/');
    const homeRes = await worker.fetch(homeReq, env);
    assert.equal(homeRes.status, 200);
    assert.equal(homeRes.headers.get('content-type'), 'text/html; charset=utf-8');
    const homeHtml = await homeRes.text();
    assert.match(homeHtml, /Render Ping Worker/);
    assert.match(homeHtml, /songless-unlimited\.onrender\.com/);

    // 2. GET /debug
    const debugReq = new Request('https://worker.test/debug');
    const debugRes = await worker.fetch(debugReq, env);
    assert.equal(debugRes.status, 200);
    const debugData = await debugRes.json();
    assert.equal(debugData.worker.name, 'render-ping-worker');
    assert.equal(debugData.configuration.HEALTH_ENDPOINT, '/healthz');

    // 3. GET /ping (Manual trigger)
    const pingReq = new Request('https://worker.test/ping');
    const pingRes = await worker.fetch(pingReq, env);
    assert.equal(pingRes.status, 200);
    const pingData = await pingRes.json();
    assert.equal(pingData.success, true);
    assert.equal(pingData.status, 'ok');
    assert.equal(pingData.metrics.uptimeSeconds, 2818);
    assert.equal(pingData.metrics.rooms, 2);

    // 4. GET /favicon.ico
    const favReq = new Request('https://worker.test/favicon.ico');
    const favRes = await worker.fetch(favReq, env);
    assert.equal(favRes.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
