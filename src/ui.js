/**
 * Modern HTML Status Dashboard for Render Keep-Alive Worker.
 *
 * Fully self-contained (zero external CSS/JS dependencies) with modern dark mode,
 * live pulse beacon, live countdown timer to next 10-minute cron check,
 * in-place ping execution with smooth DOM updates, and collapsible JSON inspector.
 *
 * @param {object} state - Contains lastPing, history, isolate
 * @param {object} env - Cloudflare worker environment variables
 * @returns {string} HTML string
 */
export function renderStatusPage(state = {}, env = {}) {
  const targetUrl = env.RENDER_APP_URL || 'https://songless-unlimited.onrender.com';
  const healthEndpoint = env.HEALTH_ENDPOINT || '/healthz';
  const fallbackEndpoint = env.FALLBACK_ENDPOINT || '/';
  const scheduleText = '*/10 * * * * (Every 10 minutes, 24/7)';

  const lastPing = state.lastPing || null;
  const history = state.history || [];
  const isolate = state.isolate || {};

  let statusType = 'pending';
  let statusBadgeText = 'Awaiting First Ping';
  let statusSummaryText = 'No health check executed in this worker isolate yet. Click "Ping Server Now" to test.';

  if (lastPing) {
    if (lastPing.success) {
      if (lastPing.isFallback) {
        statusType = 'warning';
        statusBadgeText = 'Awake via Fallback';
        statusSummaryText = `Primary /healthz failed, but root ping reached Render (HTTP ${lastPing.httpStatus}) and reset the 15-minute sleep timer.`;
      } else {
        statusType = 'healthy';
        statusBadgeText = 'Operational • 24/7 Keep-Alive Active';
        statusSummaryText = `Render service responded healthy in ${lastPing.durationMs}ms (HTTP ${lastPing.httpStatus}).`;
      }
    } else {
      statusType = 'danger';
      statusBadgeText = 'Health Check Failed';
      statusSummaryText = lastPing.error || 'Health check failed across all retry attempts.';
    }
  }

  const metrics = lastPing?.metrics || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Render Ping Worker • 24/7 Keep-Alive</title>
  <style>
    :root {
      --bg: #090d16;
      --bg-card: rgba(17, 24, 39, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #38bdf8;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #ef4444;
      --code-bg: #030712;
      --radius: 12px;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(56, 189, 248, 0.08), transparent 30%),
        radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.06), transparent 35%);
      background-attachment: fixed;
      color: var(--text);
      line-height: 1.5;
      padding: 32px 16px 64px;
      min-height: 100vh;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    }

    .brand-icon svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: #fff;
      stroke-width: 2;
    }

    .brand-text h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-text p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 7px 15px;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .beacon {
      position: relative;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }

    .beacon::after {
      content: "";
      position: absolute;
      top: -3px; left: -3px; right: -3px; bottom: -3px;
      border-radius: 50%;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(2.2); opacity: 0; }
    }

    .status-healthy {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .status-healthy .beacon, .status-healthy .beacon::after { background: #10b981; }

    .status-warning {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .status-warning .beacon, .status-warning .beacon::after { background: #f59e0b; }

    .status-danger {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .status-danger .beacon, .status-danger .beacon::after { background: #ef4444; }

    .status-pending {
      background: rgba(148, 163, 184, 0.12);
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }
    .status-pending .beacon { background: #94a3b8; }
    .status-pending .beacon::after { display: none; }

    .card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-title svg {
      width: 17px;
      height: 17px;
      stroke: var(--primary);
      stroke-width: 2;
      fill: none;
    }

    .countdown-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 18px;
      font-size: 0.88rem;
    }

    .countdown-time {
      font-family: var(--font-mono);
      font-weight: 700;
      color: #38bdf8;
      font-size: 1.05rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }

    .grid-3 {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    .metric-box {
      background: rgba(3, 7, 18, 0.45);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.2s, background 0.2s;
    }

    .metric-box:hover {
      background: rgba(3, 7, 18, 0.7);
      transform: translateY(-2px);
    }

    .metric-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .metric-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .metric-icon {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon svg {
      width: 14px;
      height: 14px;
      stroke: var(--primary);
      stroke-width: 2;
      fill: none;
    }

    .metric-value {
      font-size: 1.45rem;
      font-weight: 700;
      color: #fff;
      font-family: var(--font-mono);
      letter-spacing: -0.02em;
    }

    .metric-sub {
      font-size: 0.74rem;
      color: var(--text-dim);
      margin-top: 4px;
    }

    code {
      font-family: var(--font-mono);
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.83em;
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }

    a { color: var(--primary); text-decoration: none; }
    a:hover { color: #7dd3fc; text-decoration: underline; }

    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 18px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: all 0.2s;
    }

    .btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #0369a1, #075985);
      transform: translateY(-1px);
    }

    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-secondary {
      background: rgba(30, 41, 59, 0.8);
      color: #cbd5e1;
      border: 1px solid var(--border);
      box-shadow: none;
    }

    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.9);
      color: #fff;
    }

    .btn svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }

    .toggle-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-left: auto;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 20px;
    }

    .toggle-switch input { opacity: 0; width: 0; height: 0; }

    .slider {
      position: absolute; cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #334155;
      transition: .3s;
      border-radius: 20px;
    }

    .slider:before {
      position: absolute; content: "";
      height: 14px; width: 14px;
      left: 3px; bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider { background-color: #0284c7; }
    input:checked + .slider:before { transform: translateX(18px); }

    .table-container {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }

    th {
      background: rgba(3, 7, 18, 0.6);
      padding: 10px 14px;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
    }

    .pill-success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .pill-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .pill-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    .latency-bar {
      display: inline-block;
      height: 4px;
      border-radius: 2px;
      background: #10b981;
      margin-left: 6px;
      vertical-align: middle;
    }

    details {
      margin-top: 14px;
      background: rgba(3, 7, 18, 0.5);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
    }

    summary {
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--text-muted);
      font-weight: 600;
      user-select: none;
    }

    summary:hover { color: var(--primary); }

    pre {
      margin-top: 10px;
      background: var(--code-bg);
      padding: 12px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: #7dd3fc;
      overflow-x: auto;
      max-height: 240px;
      border: 1px solid var(--border);
    }

    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid var(--border);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.88rem;
      z-index: 999;
    }

    footer {
      margin-top: 40px;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-dim);
    }

    footer a { color: var(--text-muted); }
    footer a:hover { color: var(--primary); }

    @media (max-width: 640px) {
      body { padding: 16px 12px 48px; }
      header { flex-direction: column; align-items: flex-start; }
      .actions { flex-direction: column; align-items: stretch; }
      .btn { justify-content: center; width: 100%; }
      .toggle-wrap { margin-left: 0; justify-content: space-between; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div class="brand-text">
          <h1>Render Ping Worker</h1>
          <p>Autonomous 24/7 Keep-Alive • Cloudflare Edge</p>
        </div>
      </div>
      <div id="status-badge" class="status-pill status-${statusType}">
        <span class="beacon"></span>
        <span id="status-badge-text">${statusBadgeText}</span>
      </div>
    </header>

    <div class="countdown-bar">
      <div>
        <span style="color: var(--text-muted);">⏱️ Next scheduled ping in:</span>
        <span id="countdown" class="countdown-time">--:--</span>
      </div>
      <div style="font-size: 0.78rem; color: var(--text-dim);">
        Schedule: <code>${scheduleText}</code>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Service Overview
        </div>
        <div style="font-size: 0.78rem; color: var(--text-dim);" id="last-ping-time">
          ${lastPing ? `Last: ${new Date(lastPing.timestamp).toLocaleTimeString()} (${lastPing.durationMs}ms)` : 'Awaiting initial run'}
        </div>
      </div>

      <p id="status-summary" style="margin-bottom: 16px; font-size: 0.92rem; color: #cbd5e1;">${statusSummaryText}</p>

      <div class="grid">
        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Target Service</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg></div>
          </div>
          <div style="font-weight: 600; font-size: 0.95rem; word-break: break-all;">
            <a href="${targetUrl}" target="_blank" rel="noopener">${targetUrl}</a>
          </div>
          <div class="metric-sub">Endpoint: <code>${healthEndpoint}</code> (Fallback: <code>${fallbackEndpoint}</code>)</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Keep-Alive Cadence</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
          </div>
          <div class="metric-value" style="font-size: 1.25rem;">Every 10 mins</div>
          <div class="metric-sub">5m safety buffer against Render's 15m sleep timer</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Cloudflare Edge Usage</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>
          </div>
          <div class="metric-value" style="font-size: 1.25rem;">144 runs/day</div>
          <div class="metric-sub">Consumes 0.14% of Cloudflare 100k daily free tier</div>
        </div>
      </div>

      <div class="actions">
        <button id="ping-btn" class="btn" onclick="triggerPing()">
          <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span id="btn-text">Ping Server Now</span>
        </button>
        <a class="btn btn-secondary" href="${targetUrl}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Render App
        </a>
        <a class="btn btn-secondary" href="/debug" target="_blank">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          JSON Diagnostics
        </a>

        <div class="toggle-wrap">
          <span>Auto-refresh (30s)</span>
          <label class="toggle-switch">
            <input type="checkbox" id="auto-refresh-toggle" onchange="toggleAutoRefresh(this)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="card" id="metrics-card">
      <div class="card-header">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          Live Server Metrics <span style="font-weight: normal; font-size: 0.75rem; color: var(--text-dim);">(from <code>${healthEndpoint}</code>)</span>
        </div>
        <span id="metrics-tag" class="pill pill-success" style="${metrics ? '' : 'display:none;'}">Live Data</span>
      </div>

      <div class="grid grid-3" id="metrics-grid">
        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Server Uptime</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          </div>
          <div class="metric-value" id="metric-uptime">${metrics?.uptimeFormatted || (metrics?.uptimeSeconds ? `${metrics.uptimeSeconds}s` : '-')}</div>
          <div class="metric-sub" id="metric-uptime-sub">${metrics?.uptimeSeconds ? Number(metrics.uptimeSeconds).toLocaleString() + ' seconds' : 'Uptime counter'}</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Connections</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          </div>
          <div class="metric-value" id="metric-connections">${metrics?.connections !== undefined ? metrics.connections : '-'}</div>
          <div class="metric-sub">Live WebSocket / HTTP clients</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Game Rooms</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
          </div>
          <div class="metric-value" id="metric-rooms">${metrics?.rooms !== undefined ? metrics.rooms : '-'}</div>
          <div class="metric-sub" id="metric-rooms-sub">${metrics?.privateRooms !== undefined ? `${metrics.privateRooms} private` : 'Active multiplayer rooms'}</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Active Players</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          </div>
          <div class="metric-value" id="metric-players">${metrics?.players !== undefined ? metrics.players : '-'}</div>
          <div class="metric-sub">Connected users in rooms</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Build Version</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
          </div>
          <div class="metric-value" id="metric-version">${metrics?.version !== undefined ? `v${metrics.version}` : '-'}</div>
          <div class="metric-sub">Application version</div>
        </div>

        <div class="metric-box">
          <div class="metric-top">
            <span class="metric-label">Pending Queue</span>
            <div class="metric-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          </div>
          <div class="metric-value" id="metric-imports">${metrics?.pendingImports !== undefined ? metrics.pendingImports : '-'}</div>
          <div class="metric-sub">Background task queue</div>
        </div>
      </div>

      <details id="json-viewer" ${metrics ? '' : 'style="display:none;"'}>
        <summary>🔍 Inspect Raw Health Check JSON Payload</summary>
        <pre><code id="json-raw">${metrics?.raw ? JSON.stringify(metrics.raw, null, 2) : '// No data'}</code></pre>
      </details>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
          Recent Ping History
        </div>
        <span style="font-size: 0.78rem; color: var(--text-dim);" id="history-count">${history.length} pings tracked</span>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Endpoint</th>
              <th>Outcome</th>
              <th>HTTP Status</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody id="history-tbody">
            ${history.length > 0 ? history.map((item) => {
              const pillClass = item.success
                ? (item.isFallback ? 'pill-warning' : 'pill-success')
                : 'pill-danger';
              const pillText = item.success
                ? (item.isFallback ? 'Fallback Awake' : 'Healthy')
                : 'Failed';
              const timeString = new Date(item.timestamp).toLocaleTimeString();
              const duration = item.durationMs !== null ? `${item.durationMs}ms` : '-';
              const latencyWidth = item.durationMs ? Math.min(80, Math.max(8, Math.round(item.durationMs / 15))) : 0;
              const barColor = (item.durationMs && item.durationMs > 1500) ? '#ef4444' : ((item.durationMs && item.durationMs > 500) ? '#f59e0b' : '#10b981');

              return `<tr>
                <td><code>${timeString}</code></td>
                <td><code>${item.endpoint}</code></td>
                <td><span class="pill ${pillClass}">${pillText}</span></td>
                <td><strong>${item.httpStatus ?? '-'}</strong></td>
                <td>
                  <span>${duration}</span>
                  ${latencyWidth ? `<span class="latency-bar" style="width:${latencyWidth}px; background:${barColor}"></span>` : ''}
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:20px;">No pings recorded in this isolate yet. Click "Ping Server Now" above.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <footer>
      <p>Cloudflare Workers Render Ping • Cron: <code>*/10 * * * *</code> (24/7)</p>
      <p style="margin-top: 6px;">
        <a href="https://github.com/kavinthangavel/cloudflare-render-ping" target="_blank" rel="noopener">GitHub Repository</a> • 
        <a href="${targetUrl}/healthz" target="_blank" rel="noopener">Test /healthz Directly</a>
      </p>
    </footer>
  </div>

  <div id="toast"></div>

  <script>
    function updateCountdown() {
      const now = new Date();
      const currentMinute = now.getUTCMinutes();
      const currentSecond = now.getUTCSeconds();
      
      const nextCronMinute = (Math.floor(currentMinute / 10) + 1) * 10;
      const minutesRemaining = nextCronMinute - currentMinute - 1;
      const secondsRemaining = 60 - currentSecond;
      
      const totalSeconds = (minutesRemaining * 60) + secondsRemaining;
      const displayMinutes = Math.floor(totalSeconds / 60);
      const displaySeconds = totalSeconds % 60;
      
      const pad = (n) => n.toString().padStart(2, '0');
      const el = document.getElementById('countdown');
      if (el) el.innerText = pad(displayMinutes) + ':' + pad(displaySeconds);
    }
    setInterval(updateCountdown, 1000);
    updateCountdown();

    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.innerText = message;
      toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }

    async function triggerPing() {
      const btn = document.getElementById('ping-btn');
      const btnText = document.getElementById('btn-text');
      const origText = btnText.innerText;
      
      btn.disabled = true;
      btnText.innerText = 'Pinging Render...';

      try {
        const res = await fetch('/ping');
        const data = await res.json();

        if (data.success) {
          showToast('✅ Keep-alive ping succeeded in ' + (data.durationMs || 0) + 'ms');
          updateDashboardWithPing(data);
        } else {
          showToast('⚠️ Ping failed: ' + (data.error || 'Server error'), true);
        }
      } catch (err) {
        showToast('❌ Network error: ' + err.message, true);
      } finally {
        btn.disabled = false;
        btnText.innerText = origText;
      }
    }

    function updateDashboardWithPing(data) {
      const badge = document.getElementById('status-badge');
      const badgeText = document.getElementById('status-badge-text');
      const summary = document.getElementById('status-summary');
      const lastTime = document.getElementById('last-ping-time');

      if (badge && badgeText) {
        badge.className = 'status-pill ' + (data.isFallback ? 'status-warning' : 'status-healthy');
        badgeText.innerText = data.isFallback ? 'Awake via Fallback' : 'Operational • 24/7 Keep-Alive Active';
      }
      if (summary) {
        summary.innerText = data.isFallback
          ? 'Root fallback reached Render (HTTP ' + data.httpStatus + ') and reset 15-minute sleep timer.'
          : 'Render service responded healthy in ' + data.durationMs + 'ms (HTTP ' + data.httpStatus + ').';
      }
      if (lastTime) {
        lastTime.innerText = 'Last: ' + new Date().toLocaleTimeString() + ' (' + data.durationMs + 'ms)';
      }

      if (data.metrics) {
        const m = data.metrics;
        const tag = document.getElementById('metrics-tag');
        if (tag) tag.style.display = 'inline-flex';
        
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setVal('metric-uptime', m.uptimeFormatted || (m.uptimeSeconds ? m.uptimeSeconds + 's' : '-'));
        setVal('metric-uptime-sub', m.uptimeSeconds ? Number(m.uptimeSeconds).toLocaleString() + ' seconds' : 'Uptime counter');
        setVal('metric-connections', m.connections !== undefined ? m.connections : '-');
        setVal('metric-rooms', m.rooms !== undefined ? m.rooms : '-');
        setVal('metric-rooms-sub', m.privateRooms !== undefined ? m.privateRooms + ' private' : 'Active multiplayer rooms');
        setVal('metric-players', m.players !== undefined ? m.players : '-');
        setVal('metric-version', m.version !== undefined ? 'v' + m.version : '-');
        setVal('metric-imports', m.pendingImports !== undefined ? m.pendingImports : '-');

        const viewer = document.getElementById('json-viewer');
        const rawCode = document.getElementById('json-raw');
        if (viewer && rawCode && m.raw) {
          viewer.style.display = 'block';
          rawCode.innerText = JSON.stringify(m.raw, null, 2);
        }
      }

      const tbody = document.getElementById('history-tbody');
      if (tbody) {
        const pillClass = data.isFallback ? 'pill-warning' : 'pill-success';
        const pillText = data.isFallback ? 'Fallback Awake' : 'Healthy';
        const duration = data.durationMs ? data.durationMs + 'ms' : '-';
        const latencyWidth = data.durationMs ? Math.min(80, Math.max(8, Math.round(data.durationMs / 15))) : 0;
        const barColor = (data.durationMs && data.durationMs > 1500) ? '#ef4444' : ((data.durationMs && data.durationMs > 500) ? '#f59e0b' : '#10b981');

        const newRow = '<tr>' +
          '<td><code>' + new Date().toLocaleTimeString() + '</code></td>' +
          '<td><code>' + (data.endpoint || '/healthz') + '</code></td>' +
          '<td><span class="pill ' + pillClass + '">' + pillText + '</span></td>' +
          '<td><strong>' + (data.httpStatus || 200) + '</strong></td>' +
          '<td><span>' + duration + '</span>' + (latencyWidth ? '<span class="latency-bar" style="width:' + latencyWidth + 'px; background:' + barColor + '"></span>' : '') + '</td>' +
          '</tr>';

        if (tbody.innerHTML.includes('colspan')) {
          tbody.innerHTML = newRow;
        } else {
          tbody.innerHTML = newRow + tbody.innerHTML;
        }
      }
    }

    let refreshInterval = null;
    function toggleAutoRefresh(checkbox) {
      if (checkbox.checked) {
        showToast('Auto-refresh enabled (every 30s)');
        refreshInterval = setInterval(async () => {
          try {
            const res = await fetch('/debug');
            const data = await res.json();
            if (data.last_ping) {
              updateDashboardWithPing(data.last_ping);
            }
          } catch {}
        }, 30000);
      } else {
        if (refreshInterval) clearInterval(refreshInterval);
        showToast('Auto-refresh disabled');
      }
    }
  </script>
</body>
</html>`;
}
