const BASE_URL = 'http://localhost:5000';

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  fetchStats: () => request('/api/stats'),
  fetchFraudCycles: () => request('/api/fraud/cycles'),
  fetchFraudLogs: () => request('/api/fraud/logs'),
  fetchTraders: () => request('/api/traders'),
  fetchTrades: (page = 1, limit = 50) => request(`/api/trades?page=${page}&limit=${limit}`),
};

export function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.cycles)) return payload.cycles;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export function parseMaybeArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}

    if (value.startsWith('{') && value.endsWith('}')) {
      return value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }

    if (value.includes('->')) {
      return value
        .split('->')
        .map((v) => v.trim())
        .filter(Boolean);
    }

    if (value.includes(',')) {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function normalizeTrades(trades, logs) {
  if (!Array.isArray(trades)) return [];

  const riskByTrade = new Map();
  if (Array.isArray(logs)) {
    logs.forEach((log) => {
      const tradeId = Number(log?.trade_id);
      if (!tradeId) return;

      const existing = riskByTrade.get(tradeId);
      if (!existing || Number(log?.risk_score || 0) > Number(existing?.risk_score || 0)) {
        riskByTrade.set(tradeId, log);
      }
    });
  }

  const uniqueTrades = new Map();
  trades.forEach((trade) => {
    const tradeId = Number(trade?.trade_id);
    if (!tradeId) return;

    const merged = {
      ...trade,
      ...(riskByTrade.get(tradeId) || {}),
    };

    uniqueTrades.set(tradeId, merged);
  });

  return Array.from(uniqueTrades.values()).sort(
    (a, b) => Number(b.trade_id || 0) - Number(a.trade_id || 0)
  );
}

export function normalizeCycles(cycles) {
  if (!Array.isArray(cycles)) return [];

  const seen = new Set();
  const cleaned = [];

  for (const item of cycles) {
    const cycle = parseMaybeArray(item?.cycle);
    const tradePath = parseMaybeArray(item?.trade_path);
    const culprits = parseMaybeArray(item?.culprits);

    const normalizedCycle = cycle.length ? cycle : culprits;
    const key = JSON.stringify({
      stock: item?.stock_id ?? item?.symbol ?? '',
      cycle: normalizedCycle,
      tradePath,
    });

    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      ...item,
      cycle: normalizedCycle,
      trade_path: tradePath,
      culprits,
    });
  }

  return cleaned.sort((a, b) => {
    const occDiff = Number(b?.occurrences || 0) - Number(a?.occurrences || 0);
    if (occDiff !== 0) return occDiff;

    const confDiff = Number(b?.confidence || 0) - Number(a?.confidence || 0);
    if (confDiff !== 0) return confDiff;

    return Number(b?.trade_id || 0) - Number(a?.trade_id || 0);
  });
}

export function badgeClass(score) {
  const s = Number(score || 0);
  if (s >= 70) return 'badge badge-high';
  if (s >= 40) return 'badge badge-medium';
  return 'badge badge-low';
}