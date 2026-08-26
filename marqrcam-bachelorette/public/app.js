const CAMERAS = [
  { id: 'canon-ae1', name: 'Canon AE-1', note: 'Chrome & black 35mm SLR', personality: 'The timeless classic.', era: '1970s', icon: '/icons/canon-ae1.svg', theme: '#171513' },
  { id: 'olympus-trip-35', name: 'Olympus Trip 35', note: 'Compact chrome travel camera', personality: 'Small, bright, effortless.', era: '1960s', icon: '/icons/olympus-trip-35.svg', theme: '#292623' },
  { id: 'polaroid-sx70', name: 'Polaroid SX-70', note: 'Folding instant camera', personality: 'The design icon.', era: '1970s', icon: '/icons/polaroid-sx70.svg', theme: '#1b1714' },
  { id: 'kodak-instamatic-104', name: 'Kodak Instamatic 104', note: 'Boxy snapshot camera', personality: 'Made for candid moments.', era: '1960s', icon: '/icons/kodak-instamatic-104.svg', theme: '#1d1c1a' },
  { id: 'nikon-f3', name: 'Nikon F3', note: 'Professional black 35mm SLR', personality: 'Quietly serious.', era: '1980s', icon: '/icons/nikon-f3.svg', theme: '#11110f' },
  { id: 'pentax-k1000', name: 'Pentax K1000', note: 'Mechanical chrome 35mm SLR', personality: 'Simple, tactile, enduring.', era: '1970s', icon: '/icons/pentax-k1000.svg', theme: '#1b1917' },
];

const views = {
  checkin: document.querySelector('#checkin-view'),
  cameraChoice: document.querySelector('#camera-choice-view'),
  shoot: document.querySelector('#shoot-view'),
  roll: document.querySelector('#roll-view'),
};
const lookupForm = document.querySelector('#lookup-form');
const guestResults = document.querySelector('#guest-results');
const cameraGrid = document.querySelector('#camera-grid');
const selectedGuestCopy = document.querySelector('#selected-guest-copy');
const photoInput = document.querySelector('#photo-input');
const shutter = document.querySelector('#shutter');
const latestPhoto = document.querySelector('#latest-photo');
const latestPreview = document.querySelector('#latest-preview');
const latestStatus = document.querySelector('#latest-status');
const installButton = document.querySelector('#install-camera');
const iosInstallHelp = document.querySelector('#ios-install-help');
const rollList = document.querySelector('#roll-list');
const installCameraArt = document.querySelector('#install-camera-art');
const eventBanner = document.querySelector('#event-banner');
const eventBannerMessage = document.querySelector('#event-banner-message');
const plusOneCard = document.querySelector('#plus-one-card');
const plusOneForm = document.querySelector('#plus-one-form');
const plusOneStatusCopy = document.querySelector('#plus-one-status');

let selectedGuest = null;
let deferredInstallPrompt = null;
let session = loadSession();
let uploadLoopRunning = false;
let eventState = { captureEnabled: true, galleryEnabled: true, message: '' };

init();

async function init() {
  renderCameraChoices();
  bindEvents();
  registerServiceWorker();
  await refreshEventState();
  if (session?.token && session?.guest && session?.camera) {
    applyManifest(session.camera.id);
    applyCameraTheme(session.camera.id);
    enterCamera();
    processQueue();
  } else {
    showView('checkin');
  }
}

function bindEvents() {
  lookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const lastName = new FormData(lookupForm).get('lastName')?.toString().trim() || '';
    guestResults.innerHTML = '<p class="empty">Looking through the guest list…</p>';
    try {
      const response = await fetch(`/api/guests?lastName=${encodeURIComponent(lastName)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not search the guest list.');
      renderGuests(data.guests);
    } catch (error) {
      guestResults.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
    }
  });

  shutter.addEventListener('click', async () => {
    await refreshEventState();
    if (!eventState.captureEnabled) {
      showCeremonyState();
      return;
    }
    photoInput.click();
  });
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    photoInput.value = '';
    if (!file) return;
    await captureFile(file);
  });

  document.querySelector('#open-roll').addEventListener('click', openRoll);
  document.querySelector('#back-to-camera').addEventListener('click', () => showView('shoot'));
  document.querySelector('#change-person').addEventListener('click', () => {
    selectedGuest = null;
    showView('checkin');
  });

  plusOneForm?.addEventListener('submit', registerPlusOne);
  window.addEventListener('online', () => { refreshEventState(); processQueue(); });
  window.addEventListener('focus', refreshEventState);
  window.addEventListener('marqrcam:photo-deleted', updateQueueCounts);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });
  installButton?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') localStorage.setItem('marqrcam.installComplete', '1');
      deferredInstallPrompt = null;
    }
  });
}

function renderGuests(guests) {
  guestResults.innerHTML = '';
  if (!guests?.length) {
    guestResults.innerHTML = '<p class="empty">No invited guests found under that name. Check the spelling.</p>';
    return;
  }
  for (const guest of guests) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guest-result';
    button.textContent = guest.firstName;
    button.addEventListener('click', () => {
      selectedGuest = guest;
      selectedGuestCopy.textContent = `Hello, ${guest.firstName}. Pick the camera you want to carry tonight.`;
      showView('cameraChoice');
    });
    guestResults.append(button);
  }
}

function renderCameraChoices() {
  cameraGrid.innerHTML = '';
  for (const camera of CAMERAS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'camera-card';
    button.dataset.camera = camera.id;
    button.setAttribute('aria-label', `Choose ${camera.name}`);
    button.innerHTML = `
      <div class="camera-card-art">
        <span class="camera-era">${escapeHtml(camera.era)}</span>
        <img src="${camera.icon}" alt="${escapeHtml(camera.name)} inspired vintage camera illustration">
      </div>
      <div class="camera-card-copy">
        <strong>${escapeHtml(camera.name)}</strong>
        <span>${escapeHtml(camera.note)}</span>
        <span class="camera-personality">${escapeHtml(camera.personality)}</span>
      </div>`;
    button.addEventListener('click', () => claimCamera(camera));
    cameraGrid.append(button);
  }
}

async function claimCamera(camera) {
  if (!selectedGuest) return;
  selectedGuestCopy.textContent = 'Issuing your camera…';
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guestId: selectedGuest.id, cameraModel: camera.id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not issue this camera.');
    session = { ...data, roll: 1, nextExposure: 1 };
    localStorage.setItem('marqrcam.session', JSON.stringify(session));
    sessionStorage.removeItem('marqrcam.installSnoozedThisVisit');
    applyManifest(camera.id);
    applyCameraTheme(camera.id);
    enterCamera();
  } catch (error) {
    selectedGuestCopy.textContent = error.message;
  }
}

function cameraFor(id) {
  return CAMERAS.find((camera) => camera.id === id) || CAMERAS[0];
}

function applyCameraTheme(cameraId) {
  const camera = cameraFor(cameraId);
  views.shoot.dataset.camera = camera.id;
  document.querySelector('#camera-body')?.setAttribute('data-camera', camera.id);
  if (installCameraArt) {
    installCameraArt.src = camera.icon;
    installCameraArt.alt = `${camera.name} vintage camera`;
  }
  document.documentElement.style.setProperty('--selected-camera-theme', camera.theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', camera.theme);
}

function enterCamera() {
  const camera = cameraFor(session.camera.id);
  applyCameraTheme(camera.id);
  document.querySelector('#camera-owner').textContent = `Issued to ${session.guest.firstName}`;
  document.querySelector('#camera-name').textContent = session.camera.name;
  document.querySelector('#camera-brand').textContent = session.camera.name.toUpperCase();
  updateExposureCounter();
  showView('shoot');
  updateQueueCounts();
  refreshEventState();
  refreshPlusOneStatus();
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isiOS && !window.matchMedia('(display-mode: standalone)').matches && iosInstallHelp) iosInstallHelp.hidden = true;
}

async function refreshEventState() {
  try {
    const response = await fetch('/api/event-state', { cache: 'no-store' });
    if (!response.ok) return eventState;
    eventState = await response.json();
    showCeremonyState();
  } catch {}
  return eventState;
}

function showCeremonyState() {
  if (!eventBanner || !shutter) return;
  const paused = !eventState.captureEnabled;
  eventBanner.hidden = !paused;
  if (eventBannerMessage) eventBannerMessage.textContent = eventState.message || 'The cameras are resting during the ceremony.';
  shutter.disabled = paused;
  shutter.setAttribute('aria-disabled', String(paused));
}

async function refreshPlusOneStatus() {
  if (!plusOneCard || !session?.token) return;
  try {
    const response = await fetch('/api/plus-one', { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok || !data.totalSlots) {
      plusOneCard.hidden = true;
      return;
    }
    plusOneCard.hidden = false;
    const names = (data.guests || []).map((g) => `${g.firstName} ${g.lastName}`);
    plusOneStatusCopy.textContent = data.remainingSlots > 0
      ? `${data.remainingSlots} guest slot${data.remainingSlots === 1 ? '' : 's'} still available on this invitation.${names.length ? ` Registered: ${names.join(', ')}.` : ''}`
      : `All guest slots are registered${names.length ? `: ${names.join(', ')}` : ''}.`;
    plusOneForm.hidden = data.remainingSlots < 1;
  } catch {
    plusOneCard.hidden = true;
  }
}

async function registerPlusOne(event) {
  event.preventDefault();
  if (!session?.token) return;
  const form = new FormData(plusOneForm);
  const submit = plusOneForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  plusOneStatusCopy.textContent = 'Adding your guest…';
  try {
    const response = await fetch('/api/plus-one', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: form.get('firstName'), lastName: form.get('lastName') }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not register your guest.');
    plusOneForm.reset();
    plusOneStatusCopy.textContent = `${data.guest.firstName} is on the list. They can scan the QR code and check in under ${data.guest.lastName}.`;
    setTimeout(refreshPlusOneStatus, 1400);
  } catch (error) {
    plusOneStatusCopy.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function captureFile(file) {
  if (!session?.token) return;
  const position = nextExposurePosition();
  const item = {
    id: crypto.randomUUID(),
    blob: file,
    mimeType: file.type || 'image/jpeg',
    capturedAt: new Date().toISOString(),
    roll: position.roll,
    exposure: position.exposure,
    frame: frameNumber(position.roll, position.exposure),
    status: 'waiting',
  };

  await queuePut(item);
  commitExposure(position);
  latestPreview.src = URL.createObjectURL(file);
  latestPhoto.hidden = false;
  latestStatus.textContent = navigator.onLine ? 'Saving it now…' : 'Waiting for signal — it is safe on this phone.';
  await updateQueueCounts();
  processQueue();
}

async function processQueue() {
  if (uploadLoopRunning || !session?.token || !navigator.onLine) return;
  uploadLoopRunning = true;
  try {
    const waiting = await queueAll();
    for (const item of waiting.filter((row) => row.status !== 'safe')) {
      try {
        await queuePatch(item.id, { status: 'uploading' });
        await updateQueueCounts();
        const params = new URLSearchParams({ roll: String(item.roll), exposure: String(item.exposure), capturedAt: item.capturedAt });
        const response = await fetch(`/api/photos?${params}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${session.token}`, 'content-type': item.mimeType },
          body: item.blob,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 423) {
            eventState.captureEnabled = false;
            eventState.message = data.error || eventState.message;
            showCeremonyState();
          }
          throw new Error(data.error || 'Upload failed');
        }
        await queuePatch(item.id, { status: 'safe', serverPhotoId: data.id, uploadedAt: data.uploadedAt, frame: data.exposure || item.frame });
        latestStatus.textContent = 'Safe ✓';
      } catch (error) {
        await queuePatch(item.id, { status: 'waiting', lastError: error.message });
        latestStatus.textContent = error.message || 'Still on this phone — we’ll retry automatically.';
        break;
      }
      await updateQueueCounts();
    }
  } finally {
    uploadLoopRunning = false;
  }
}

function nextExposurePosition() {
  return { roll: Number(session.roll || 1), exposure: Number(session.nextExposure || 1) };
}

function commitExposure(position) {
  if (position.exposure >= 36) {
    session.roll = position.roll + 1;
    session.nextExposure = 1;
  } else {
    session.roll = position.roll;
    session.nextExposure = position.exposure + 1;
  }
  localStorage.setItem('marqrcam.session', JSON.stringify(session));
  updateExposureCounter();
}

function frameNumber(roll, exposure) {
  return ((Number(roll || 1) - 1) * 36) + Number(exposure || 1);
}

function updateExposureCounter() {
  const frame = frameNumber(session?.roll || 1, session?.nextExposure || 1);
  document.querySelector('#exposure-counter').textContent = `FRAME ${String(frame).padStart(2, '0')}`;
}

async function updateQueueCounts() {
  const items = await queueAll();
  const safe = items.filter((item) => item.status === 'safe').length;
  const waiting = items.filter((item) => item.status !== 'safe').length;
  document.querySelector('#safe-count').textContent = String(safe);
  document.querySelector('#waiting-count').textContent = String(waiting);
  document.querySelector('#total-count').textContent = String(items.length);
}

async function openRoll() {
  showView('roll');
  rollList.innerHTML = '<p class="empty">Loading your photos…</p>';
  const local = await queueAll();
  local.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  if (!local.length) {
    rollList.innerHTML = '<p class="empty">Your first picture is waiting for you.</p>';
    return;
  }
  rollList.innerHTML = '';
  for (const item of local) {
    const frame = item.frame || frameNumber(item.roll, item.exposure);
    const row = document.createElement('div');
    row.className = 'roll-item';
    row.innerHTML = `<div class="roll-num">${String(frame).padStart(2, '0')}</div><div><strong>Frame ${String(frame).padStart(2, '0')}</strong><p>${new Date(item.capturedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></div><span class="badge">${item.status === 'safe' ? (item.editStatus === 'edited' ? 'DEVELOPED' : 'SAFE ✓') : 'WAITING'}</span>`;
    rollList.append(row);
  }
}

function applyManifest(cameraId) {
  document.querySelector('#manifest-link').href = `/manifest.webmanifest?camera=${encodeURIComponent(cameraId)}`;
}

function showView(name) {
  for (const [key, node] of Object.entries(views)) node.hidden = key !== name;
  if (name === 'shoot' && session?.camera?.id) applyCameraTheme(session.camera.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem('marqrcam.session') || 'null'); } catch { return null; }
}

function authHeaders() {
  return session?.token ? { authorization: `Bearer ${session.token}` } : {};
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => null);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('marqrcam', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queuePut(item) {
  const db = await openDb();
  await txPromise(db, 'readwrite', (store) => store.put(item));
}
async function queuePatch(id, patch) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const get = store.get(id);
    get.onsuccess = () => store.put({ ...get.result, ...patch });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function queueAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const request = tx.objectStore('queue').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
function txPromise(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', mode);
    action(tx.objectStore('queue'));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
