const login = document.querySelector('#admin-login');
const app = document.querySelector('#admin-app');
const keyInput = document.querySelector('#admin-key');
const authStatus = document.querySelector('#auth-status');
const counts = document.querySelector('#admin-counts');
const photosGrid = document.querySelector('#admin-photos');
const filter = document.querySelector('#photo-filter');
const captureToggle = document.querySelector('#capture-toggle');
const galleryToggle = document.querySelector('#gallery-toggle');
const ceremonyMessage = document.querySelector('#ceremony-message');
const eventStatus = document.querySelector('#event-status');
const detail = document.querySelector('#admin-detail');
const detailTitle = document.querySelector('#detail-title');
const detailBody = document.querySelector('#detail-body');
const objectUrls = new Map();

const qrGenerateButton = document.querySelector('#generate-qr-links');
const qrPrintButton = document.querySelector('#print-qr-cards');
const qrCopyButton = document.querySelector('#copy-qr-share-list');
const qrStatus = document.querySelector('#qr-status');
const qrCards = document.querySelector('#qr-cards');
const qrShareList = document.querySelector('#qr-share-list');
const qrFallbackUrl = document.querySelector('#qr-fallback-url');
const qrMaxUses = document.querySelector('#qr-max-uses');
const qrExpiresAt = document.querySelector('#qr-expires-at');

let token = sessionStorage.getItem('marqrcam.adminToken') || '';

login.addEventListener('submit', authenticate);
filter.addEventListener('change', loadPhotos);
counts.addEventListener('click', (event) => {
  const button = event.target.closest('.admin-count-card');
  if (!button || !counts.contains(button)) return;
  openMetric(button.dataset.view).catch((error) => showMetricError(error));
});
document.querySelector('#refresh-admin').addEventListener('click', refreshAll);
document.querySelector('#save-event').addEventListener('click', saveEvent);
document.querySelector('#export-csv').addEventListener('click', exportCsv);
document.querySelector('#admin-logout').addEventListener('click', logout);
document.querySelector('#close-detail').addEventListener('click', clearDetail);
qrGenerateButton?.addEventListener('click', generateQrLinks);
qrPrintButton?.addEventListener('click', () => window.print());
qrCopyButton?.addEventListener('click', copyQrList);

if (qrExpiresAt) qrExpiresAt.value = toLocalInputValue(new Date('2026-09-22T12:00:00.000Z'));
if (qrFallbackUrl) qrFallbackUrl.value = new URL('/', window.location.origin).toString();
if (token) verifyExisting();

async function authenticate(event) {
  event?.preventDefault();
  token = keyInput.value.trim();
  authStatus.textContent = 'Checking…';
  try {
    const response = await api('/api/admin/auth', { method: 'POST' });
    if (!response.ok) throw new Error('That admin key was not accepted.');
    sessionStorage.setItem('marqrcam.adminToken', token);
    showApp();
    await refreshAll();
  } catch (error) {
    authStatus.textContent = error.message;
    token = '';
  }
}

async function verifyExisting() {
  try {
    const response = await api('/api/admin/auth', { method: 'POST' });
    if (!response.ok) throw new Error();
    showApp();
    await refreshAll();
  } catch {
    logout();
  }
}

function showApp() { login.hidden = true; app.hidden = false; authStatus.textContent = ''; }
function logout() { sessionStorage.removeItem('marqrcam.adminToken'); token = ''; app.hidden = true; login.hidden = false; keyInput.value = ''; }
async function refreshAll() { await Promise.all([loadOverview(), loadPhotos()]); }

async function loadOverview() {
  const response = await api('/api/admin/overview');
  if (!response.ok) return handleUnauthorized(response);
  const data = await response.json();
  const cards = [
    ['photos', 'Photos', data.counts.photos || 0],
    ['guests', 'Guests active', data.counts.guests || 0],
    ['sessions', 'Cameras issued', data.counts.sessions || 0],
    ['developed', 'Developed', data.counts.edited || 0],
    ['gallery', 'In gallery', data.counts.approved || 0],
  ];
  counts.innerHTML = '';
  for (const [view, label, value] of cards) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-count-card';
    button.dataset.view = view;
    button.setAttribute('aria-controls', 'admin-detail');
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<strong>${value}</strong><span>${label}</span><em>View details →</em>`;
    counts.append(button);
  }
  if (Number(data.counts.justBetweenUs || 0) > 0) {
    const note = document.createElement('p');
    note.className = 'admin-privacy-summary';
    note.textContent = `${Number(data.counts.justBetweenUs)} photo${Number(data.counts.justBetweenUs) === 1 ? '' : 's'} marked “Just between us” by guests. These can never be added to the public gallery.`;
    counts.append(note);
  }
  captureToggle.checked = Boolean(data.state.captureEnabled);
  galleryToggle.checked = Boolean(data.state.galleryEnabled);
  ceremonyMessage.value = data.state.message || '';
  eventStatus.textContent = data.state.captureEnabled ? 'Cameras are live.' : 'Cameras are paused.';
}

function setActiveMetric(view) {
  for (const button of counts.querySelectorAll('.admin-count-card')) {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function clearDetail() {
  setActiveMetric('');
  detailTitle.textContent = 'Dashboard details';
  detailBody.innerHTML = '<p class="admin-empty">Select a dashboard card above to view its details.</p>';
}

function showMetricError(error) {
  detailTitle.textContent = 'Could not load details';
  detailBody.innerHTML = `<p class="admin-error">${escapeHtml(error?.message || 'Something went wrong loading this view.')}</p>`;
}

async function openMetric(view) {
  setActiveMetric(view);
  detailTitle.textContent = 'Loading…';
  detailBody.innerHTML = '<p class="admin-empty">Loading details…</p>';
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (view === 'photos') {
    detailTitle.textContent = 'All photos';
    detailBody.innerHTML = '<p class="metric-summary">The photo desk below is now showing every uploaded photo.</p>';
    filter.value = 'all';
    await loadPhotos();
    return;
  }
  if (view === 'developed') {
    detailTitle.textContent = 'Developed photos';
    detailBody.innerHTML = '<p class="metric-summary">The photo desk below is filtered to photos with a developed copy.</p>';
    filter.value = 'developed';
    await loadPhotos();
    return;
  }
  if (view === 'gallery') {
    detailTitle.textContent = 'Gallery photos';
    detailBody.innerHTML = '<p class="metric-summary">The photo desk below is filtered to photos currently approved for the Court Gallery.</p>';
    filter.value = 'approved';
    await loadPhotos();
    return;
  }
  if (view === 'guests') {
    await loadGuestsDetail();
    return;
  }
  if (view === 'sessions') {
    await loadSessionsDetail();
    return;
  }
  clearDetail();
}

async function loadGuestsDetail() {
  detailTitle.textContent = 'Active guests';
  const response = await api('/api/admin/guests');
  if (!response.ok) {
    if (response.status === 401) return handleUnauthorized(response);
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not load active guests.');
  }
  const data = await response.json();
  if (!data.guests.length) { detailBody.innerHTML = '<p class="admin-empty">No active guest sessions yet.</p>'; return; }
  detailBody.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Guest</th><th>Camera</th><th>Photos</th><th>Sessions</th><th>Last activity</th></tr></thead><tbody>${data.guests.map((g) => `<tr><td><strong>${escapeHtml(g.firstName)} ${escapeHtml(g.lastName)}</strong><small>${escapeHtml(g.guestType || '')}</small></td><td>${escapeHtml(formatCamera(g.latestCamera))}</td><td>${Number(g.photoCount || 0)}</td><td>${Number(g.sessionCount || 0)}</td><td>${formatTime(g.lastSeenAt)}</td></tr>`).join('')}</tbody></table></div>`;
}

async function loadSessionsDetail() {
  detailTitle.textContent = 'Cameras issued';
  const response = await api('/api/admin/sessions');
  if (!response.ok) {
    if (response.status === 401) return handleUnauthorized(response);
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not load issued cameras.');
  }
  const data = await response.json();
  if (!data.sessions.length) { detailBody.innerHTML = '<p class="admin-empty">No cameras have been issued yet.</p>'; return; }
  detailBody.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Guest</th><th>Camera</th><th>Photos</th><th>Issued</th><th>Last activity</th></tr></thead><tbody>${data.sessions.map((s) => `<tr><td><strong>${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}</strong></td><td>${escapeHtml(formatCamera(s.cameraModel))}</td><td>${Number(s.photoCount || 0)}</td><td>${formatTime(s.createdAt)}</td><td>${formatTime(s.lastSeenAt)}</td></tr>`).join('')}</tbody></table></div>`;
}

async function loadPhotos() {
  photosGrid.innerHTML = '<p class="admin-empty">Loading photos…</p>';
  const value = filter.value;
  const status = ['private', 'approved', 'hidden'].includes(value) ? value : null;
  const response = await api(`/api/admin/photos${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  if (!response.ok) return handleUnauthorized(response);
  const data = await response.json();
  let photos = data.photos;
  if (value === 'developed') photos = photos.filter((photo) => photo.editStatus === 'edited' || photo.hasDeveloped);
  photosGrid.innerHTML = '';
  if (!photos.length) { photosGrid.innerHTML = '<p class="admin-empty">No photos in this view.</p>'; return; }
  for (const photo of photos.slice(0, 120)) photosGrid.append(await photoCard(photo));
}

async function photoCard(photo) {
  const card = document.createElement('article');
  card.className = 'admin-photo';
  if (photo.galleryPermission === 'just_between_us') card.classList.add('admin-photo-private-only');
  const img = document.createElement('img');
  img.alt = `${photo.firstName} ${photo.lastName}, frame ${photo.exposure}`;
  img.loading = 'lazy';
  card.append(img);
  loadThumb(photo, img);
  const body = document.createElement('div');
  body.className = 'admin-photo-body';
  const privacyLine = photo.galleryPermission === 'just_between_us'
    ? '<span class="admin-private-only">♥ JUST BETWEEN US · Guest says never public</span>'
    : '<span>Gallery eligible · Only appears publicly if you choose it</span>';
  body.innerHTML = `<strong>${escapeHtml(photo.firstName)} ${escapeHtml(photo.lastName)}</strong><span>Frame ${photo.exposure} · ${formatCamera(photo.cameraModel)}</span><span>${photo.editStatus === 'edited' ? 'Developed copy available' : 'Original only'}</span>${privacyLine}`;
  const controls = document.createElement('div');
  controls.className = 'admin-photo-controls';
  for (const [status, label] of [['approved', 'Gallery'], ['private', 'Private'], ['hidden', 'Hide']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.classList.toggle('active', photo.galleryStatus === status);
    if (status === 'approved' && photo.galleryPermission === 'just_between_us') {
      button.disabled = true;
      button.title = 'Guest marked this photo Just between us. It cannot be made public.';
      button.setAttribute('aria-label', 'Gallery unavailable: guest marked this photo Just between us');
    } else button.addEventListener('click', () => setStatus(photo.id, status));
    controls.append(button);
  }
  const original = document.createElement('button');
  original.type = 'button';
  original.textContent = 'Original';
  original.addEventListener('click', () => downloadPhoto(photo, 'original'));
  controls.append(original);
  if (photo.hasDeveloped) {
    const developed = document.createElement('button');
    developed.type = 'button';
    developed.textContent = 'Developed';
    developed.addEventListener('click', () => downloadPhoto(photo, 'developed'));
    controls.append(developed);
  }
  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'Delete';
  del.className = 'danger';
  del.addEventListener('click', () => deletePhoto(photo));
  controls.append(del);
  body.append(controls);
  card.append(body);
  return card;
}

async function loadThumb(photo, img) {
  try {
    const variant = photo.hasDeveloped ? 'developed' : 'original';
    const response = await api(`/api/admin/download/${encodeURIComponent(photo.id)}?variant=${variant}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    objectUrls.set(photo.id, url);
    img.src = url;
  } catch {}
}

async function setStatus(id, galleryStatus) {
  const response = await api(`/api/admin/photos/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ galleryStatus }) });
  if (!response.ok) {
    if (response.status === 401) return handleUnauthorized(response);
    const data = await response.json().catch(() => ({}));
    alert(data.error || 'Could not update this photo.');
    return;
  }
  await refreshAll();
}

async function deletePhoto(photo) {
  if (!confirm(`Permanently delete frame ${photo.exposure} from ${photo.firstName} ${photo.lastName}?`)) return;
  const response = await api(`/api/admin/photos/${encodeURIComponent(photo.id)}`, { method: 'DELETE' });
  if (!response.ok) return handleUnauthorized(response);
  await refreshAll();
}

async function saveEvent() {
  eventStatus.textContent = 'Saving…';
  const response = await api('/api/admin/event', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ captureEnabled: captureToggle.checked, galleryEnabled: galleryToggle.checked, message: ceremonyMessage.value }) });
  if (!response.ok) return handleUnauthorized(response);
  const data = await response.json();
  eventStatus.textContent = data.captureEnabled ? 'Cameras are live.' : 'Cameras are paused.';
}

async function exportCsv() {
  const response = await api('/api/admin/export.csv');
  if (!response.ok) return handleUnauthorized(response);
  const blob = await response.blob();
  triggerDownload(blob, 'last-knight-out-photo-manifest.csv');
}

async function downloadPhoto(photo, variant) {
  const response = await api(`/api/admin/download/${encodeURIComponent(photo.id)}?variant=${variant}`);
  if (!response.ok) return handleUnauthorized(response);
  const blob = await response.blob();
  triggerDownload(blob, `${photo.firstName}-${photo.lastName}-frame-${photo.exposure}-${variant}.jpg`);
}

async function generateQrLinks() {
  if (!qrStatus) return;
  qrStatus.textContent = 'Generating QR handout links…';
  const payload = {
    maxUses: Number(qrMaxUses?.value || 1),
    expiresAt: localInputToIso(qrExpiresAt?.value),
  };
  const response = await api('/api/admin/claim-links', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) {
    if (response.status === 401) return handleUnauthorized(response);
    const data = await response.json().catch(() => ({}));
    qrStatus.textContent = data.error || 'Could not generate QR links.';
    return;
  }
  const data = await response.json();
  renderQrCards(data.links || [], data.fallbackUrl || '/');
  qrStatus.textContent = `Generated ${Number(data.generated || 0)} QR links. Previous active links were revoked.`;
}

function renderQrCards(links, fallbackPath) {
  if (!qrCards || !qrShareList) return;
  qrCards.innerHTML = '';
  const fallbackUrl = new URL(fallbackPath || '/', window.location.origin).toString();
  if (qrFallbackUrl) qrFallbackUrl.value = fallbackUrl;

  const fallbackCard = document.createElement('article');
  fallbackCard.className = 'admin-photo';
  fallbackCard.innerHTML = `<img alt="Fallback check-in QR" src="${qrImage(fallbackUrl)}"><div class="admin-photo-body"><strong>Fallback check-in QR</strong><span>Use if a personal QR is lost or expired.</span><span>${escapeHtml(fallbackUrl)}</span></div>`;
  qrCards.append(fallbackCard);

  const lines = [`Fallback check-in: ${fallbackUrl}`];
  for (const link of links) {
    const fullUrl = new URL(link.claimPath, window.location.origin).toString();
    const card = document.createElement('article');
    card.className = 'admin-photo';
    card.innerHTML = `<img alt="QR for ${escapeHtml(link.firstName)} ${escapeHtml(link.lastName)}" src="${qrImage(fullUrl)}"><div class="admin-photo-body"><strong>${escapeHtml(link.firstName)} ${escapeHtml(link.lastName)}</strong><span>${escapeHtml(formatCamera(link.cameraModel))}</span><span>Max scans: ${Number(link.maxUses || 1)} · Expires: ${formatTime(link.expiresAt)}</span><span>${escapeHtml(fullUrl)}</span></div>`;
    const controls = document.createElement('div');
    controls.className = 'admin-photo-controls';
    const reissue = document.createElement('button');
    reissue.type = 'button';
    reissue.textContent = 'Reissue';
    reissue.addEventListener('click', () => reissueGuestLink(link.guestId, link.cameraModel));
    controls.append(reissue);
    card.querySelector('.admin-photo-body').append(controls);
    qrCards.append(card);
    lines.push(`${link.firstName} ${link.lastName}: ${fullUrl}`);
  }
  qrShareList.value = lines.join('\n');
}

async function reissueGuestLink(guestId, cameraModel) {
  qrStatus.textContent = 'Reissuing guest QR…';
  const response = await api('/api/admin/claim-links/reissue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      guestId,
      cameraModel,
      maxUses: Number(qrMaxUses?.value || 1),
      expiresAt: localInputToIso(qrExpiresAt?.value),
    }),
  });
  if (!response.ok) {
    if (response.status === 401) return handleUnauthorized(response);
    const data = await response.json().catch(() => ({}));
    qrStatus.textContent = data.error || 'Could not reissue that link.';
    return;
  }
  qrStatus.textContent = 'Guest QR link reissued. Regenerate if you need a full refreshed sheet.';
}

async function copyQrList() {
  if (!qrShareList?.value) return;
  try {
    await navigator.clipboard.writeText(qrShareList.value);
    qrStatus.textContent = 'Copied phone-share list.';
  } catch {
    qrShareList.select();
    document.execCommand('copy');
    qrStatus.textContent = 'Copied phone-share list.';
  }
}

function qrImage(value) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(value)}`;
}

function localInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalInputValue(date) {
  const safe = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(safe.getTime())) return '';
  const adjusted = new Date(safe.getTime() - (safe.getTimezoneOffset() * 60000));
  return adjusted.toISOString().slice(0, 16);
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-admin-token', token);
  return fetch(path, { ...options, headers, cache: 'no-store' });
}

function handleUnauthorized(response) { if (response.status === 401) logout(); }

const CAMERA_NAMES = {
  'canon-ae1': 'The Minstrel',
  'olympus-trip-35': 'The Wanderer',
  'polaroid-sx70': 'The Alchemist',
  'kodak-instamatic-104': 'The Jester',
  'nikon-f3': 'The Archivist',
  'pentax-k1000': 'The Courtier',
};

function formatCamera(id) { return CAMERA_NAMES[id] || String(id || '').replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value.includes?.('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
