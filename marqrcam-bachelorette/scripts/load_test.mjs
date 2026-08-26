#!/usr/bin/env node

const BASE_URL = (process.env.LOAD_TEST_BASE_URL || 'https://marqrcam-crown-vow-bach-2026.kstehlar.workers.dev').replace(/\/$/, '');
const MODE = (process.env.LOAD_TEST_MODE || 'read').toLowerCase();
const USERS = clamp(process.env.LOAD_TEST_USERS, 1, 500, 125);
const PHOTOS_PER_USER = clamp(process.env.LOAD_TEST_PHOTOS_PER_USER, 1, 10, 1);
const LAST_NAME = String(process.env.LOAD_TEST_LAST_NAME || '').trim();
const ALLOW_PRODUCTION_WRITES = process.env.ALLOW_PRODUCTION_WRITES === 'YES_I_UNDERSTAND';
const ADMIN_TOKEN = String(process.env.LOAD_TEST_ADMIN_TOKEN || '').trim();

const CAMERAS = ['canon-ae1','olympus-trip-35','polaroid-sx70','kodak-instamatic-104','nikon-f3','pentax-k1000'];
const metrics = new Map();
const createdPhotoIds = [];
const createdSessionIds = [];

main().catch((error) => {
  console.error('\nLOAD TEST FAILED');
  console.error(error?.stack || error);
  process.exitCode = 1;
});

async function main() {
  console.log(`MarQrCam load test`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Mode: ${MODE}`);
  console.log(`Virtual guests: ${USERS}`);

  if (!['read', 'write'].includes(MODE)) throw new Error('LOAD_TEST_MODE must be read or write.');
  if (MODE === 'write' && isProductionTarget() && !ALLOW_PRODUCTION_WRITES) {
    throw new Error('Production writes are blocked. Use a staging/local target, or explicitly set ALLOW_PRODUCTION_WRITES=YES_I_UNDERSTAND.');
  }

  await measured('health', () => request('/api/health'));
  await measured('event-state', () => request('/api/event-state'));

  let guest = null;
  if (LAST_NAME) {
    console.log(`\n1) ${USERS} concurrent guest-list lookups`);
    const lookupResults = await burst(USERS, async () => measured('guest-lookup', () => request(`/api/guests?lastName=${encodeURIComponent(LAST_NAME)}`)));
    const valid = lookupResults.find((x) => x?.guests?.length);
    guest = valid?.guests?.[0] || null;
    if (!guest) throw new Error(`No guest found for LOAD_TEST_LAST_NAME=${LAST_NAME}`);
    console.log(`Using invited guest record: ${guest.firstName} ${guest.lastName}`);
  } else {
    console.log('\nGuest lookup burst skipped because LOAD_TEST_LAST_NAME is not set.');
  }

  console.log(`\n2) ${USERS} concurrent public event/gallery reads`);
  await Promise.all([
    burst(USERS, () => measured('event-state-burst', () => request('/api/event-state'))),
    burst(USERS, () => measured('gallery-list', () => request('/api/gallery'))),
  ]);

  if (MODE === 'write') {
    if (!guest) throw new Error('Write mode requires LOAD_TEST_LAST_NAME so the harness can resolve an invited guest.');
    console.log(`\n3) Creating ${USERS} concurrent camera sessions`);
    const sessions = await burst(USERS, (i) => measured('session-create', () => request('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guestId: guest.id, cameraModel: CAMERAS[i % CAMERAS.length] }),
    })));
    for (const s of sessions) if (s?.sessionId) createdSessionIds.push(s.sessionId);

    console.log(`\n4) Uploading ${USERS * PHOTOS_PER_USER} synthetic photos in a burst`);
    const uploadJobs = [];
    sessions.forEach((session, i) => {
      for (let p = 0; p < PHOTOS_PER_USER; p += 1) {
        uploadJobs.push(() => uploadSyntheticPhoto(session, i, p));
      }
    });
    await burstFunctions(uploadJobs);

    console.log('\n5) Retry/idempotency probe');
    const probeSessions = sessions.slice(0, Math.min(10, sessions.length));
    const duplicateResults = await Promise.all(probeSessions.map((session, i) => retryProbe(session, i)));
    const duplicateCreates = duplicateResults.filter((x) => x.duplicateCreated).length;
    recordCustom('idempotency-probe', duplicateResults.map((x) => x.durationMs), duplicateCreates === 0 ? 0 : duplicateCreates, duplicateResults.length);
    if (duplicateCreates) {
      console.warn(`WARNING: ${duplicateCreates}/${duplicateResults.length} retry probes produced a second server photo. Retry idempotency still needs hardening.`);
    } else {
      console.log('Retry probes reused the same server photo IDs.');
    }

    if (ADMIN_TOKEN && createdPhotoIds.length) await cleanupPhotos();
    else if (createdPhotoIds.length) console.warn(`\nCleanup skipped. ${createdPhotoIds.length} synthetic photo records remain because LOAD_TEST_ADMIN_TOKEN was not supplied.`);

    if (createdSessionIds.length) {
      console.warn(`${createdSessionIds.length} test session records were created. Run write mode only against staging/local until session cleanup is automated.`);
    }
  }

  printReport();
  evaluate();
}

async function uploadSyntheticPhoto(session, userIndex, photoIndex) {
  const clientCaptureId = crypto.randomUUID();
  const frame = photoIndex + 1;
  const capturedAt = new Date().toISOString();
  const payload = tinyJpeg();
  const result = await measured('photo-upload', () => request(`/api/photos?roll=1&exposure=${frame}&capturedAt=${encodeURIComponent(capturedAt)}&clientCaptureId=${encodeURIComponent(clientCaptureId)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${session.token}`,
      'content-type': 'image/jpeg',
      'x-client-capture-id': clientCaptureId,
      'x-load-test': `guest-${userIndex}-photo-${photoIndex}`,
    },
    body: payload,
  }, 20000));
  if (result?.id) createdPhotoIds.push(result.id);
  return result;
}

async function retryProbe(session, index) {
  const clientCaptureId = crypto.randomUUID();
  const capturedAt = new Date().toISOString();
  const payload = tinyJpeg();
  const path = `/api/photos?roll=999&exposure=${index + 1}&capturedAt=${encodeURIComponent(capturedAt)}&clientCaptureId=${encodeURIComponent(clientCaptureId)}`;
  const options = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${session.token}`,
      'content-type': 'image/jpeg',
      'x-client-capture-id': clientCaptureId,
      'x-load-test': 'idempotency-probe',
    },
    body: payload,
  };
  const started = performance.now();
  const first = await request(path, options, 20000);
  const second = await request(path, options, 20000);
  if (first?.id) createdPhotoIds.push(first.id);
  if (second?.id && second.id !== first?.id) createdPhotoIds.push(second.id);
  return { durationMs: performance.now() - started, duplicateCreated: Boolean(first?.id && second?.id && first.id !== second.id) };
}

async function cleanupPhotos() {
  console.log(`\nCleaning up ${createdPhotoIds.length} synthetic photos…`);
  const unique = [...new Set(createdPhotoIds)];
  await burstFunctions(unique.map((photoId) => async () => {
    try {
      await request(`/api/admin/photos/${encodeURIComponent(photoId)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': ADMIN_TOKEN },
      });
    } catch (error) {
      console.warn(`Cleanup failed for ${photoId}: ${error.message}`);
    }
  }), 20);
}

async function request(path, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE_URL}${path}`, { ...options, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.error || text.slice(0, 160)}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function measured(name, fn) {
  const started = performance.now();
  try {
    const value = await fn();
    pushMetric(name, performance.now() - started, true);
    return value;
  } catch (error) {
    pushMetric(name, performance.now() - started, false, error.message);
    throw error;
  }
}

async function burst(count, fn, concurrency = count) {
  return burstFunctions(Array.from({ length: count }, (_, i) => () => fn(i)), concurrency);
}

async function burstFunctions(functions, concurrency = functions.length) {
  const results = new Array(functions.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, functions.length)) }, async () => {
    while (true) {
      const index = next++;
      if (index >= functions.length) return;
      results[index] = await functions[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

function pushMetric(name, durationMs, ok, error = '') {
  if (!metrics.has(name)) metrics.set(name, { durations: [], success: 0, failed: 0, errors: new Map() });
  const metric = metrics.get(name);
  metric.durations.push(durationMs);
  if (ok) metric.success += 1;
  else {
    metric.failed += 1;
    metric.errors.set(error, (metric.errors.get(error) || 0) + 1);
  }
}

function recordCustom(name, durations, failed, total) {
  metrics.set(name, { durations, success: total - failed, failed, errors: new Map() });
}

function printReport() {
  console.log('\n=== MarQrCam load-test report ===');
  console.log('operation                 requests   ok   fail   p50ms   p95ms   p99ms');
  for (const [name, metric] of metrics) {
    const d = [...metric.durations].sort((a,b) => a-b);
    const total = metric.success + metric.failed;
    console.log(`${name.padEnd(25)} ${String(total).padStart(7)} ${String(metric.success).padStart(4)} ${String(metric.failed).padStart(6)} ${fmt(percentile(d,.50)).padStart(7)} ${fmt(percentile(d,.95)).padStart(7)} ${fmt(percentile(d,.99)).padStart(7)}`);
    for (const [error, count] of [...metric.errors.entries()].slice(0, 3)) console.log(`  ↳ ${count}× ${error}`);
  }
}

function evaluate() {
  const all = [...metrics.values()];
  const total = all.reduce((sum,m) => sum + m.success + m.failed, 0);
  const failed = all.reduce((sum,m) => sum + m.failed, 0);
  const errorRate = total ? failed / total : 0;
  const upload = metrics.get('photo-upload');
  const lookup = metrics.get('guest-lookup');
  const read = metrics.get('gallery-list');

  const failures = [];
  if (errorRate > 0.01) failures.push(`overall error rate ${(errorRate*100).toFixed(2)}% exceeds 1%`);
  if (lookup && percentile(lookup.durations,.95) > 2000) failures.push('guest lookup p95 exceeds 2 seconds');
  if (read && percentile(read.durations,.95) > 2000) failures.push('gallery read p95 exceeds 2 seconds');
  if (upload && percentile(upload.durations,.95) > 15000) failures.push('photo upload p95 exceeds 15 seconds');

  console.log(`\nOverall error rate: ${(errorRate*100).toFixed(2)}%`);
  if (failures.length) {
    console.error('RESULT: NEEDS WORK');
    failures.forEach((f) => console.error(`- ${f}`));
    process.exitCode = 2;
  } else {
    console.log('RESULT: PASS for configured thresholds');
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * p) - 1));
  return values[index];
}

function fmt(value) { return Math.round(value || 0).toString(); }
function clamp(value, min, max, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function isProductionTarget() {
  try {
    const host = new URL(BASE_URL).hostname;
    return host === 'marqrcam-crown-vow-bach-2026.kstehlar.workers.dev' || host.endsWith('.workers.dev');
  } catch { return false; }
}
function tinyJpeg() {
  // 1x1 valid JPEG; enough to exercise Worker -> R2 -> D1 without wasting storage/bandwidth.
  return Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EF//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EF//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EF//2Q==', 'base64');
}
