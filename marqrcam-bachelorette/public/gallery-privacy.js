const DB_NAME = 'marqrcam';
const QUEUE_STORE = 'queue';
let currentLocalId = null;

// Remember which roll item the guest opened before roll-viewer replaces it with a lightbox.
document.addEventListener('click', (event) => {
  const card = event.target.closest?.('.roll-item');
  if (card?.dataset.photoId && !event.target.closest('.roll-select-mark')) currentLocalId = card.dataset.photoId;
}, true);

document.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const card = event.target.closest?.('.roll-item');
  if (card?.dataset.photoId) currentLocalId = card.dataset.photoId;
}, true);

const observer = new MutationObserver(() => enhanceLightbox());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('marqrcam:developed', () => setTimeout(enhanceLightbox, 0));

async function enhanceLightbox() {
  const lightbox = document.querySelector('.photo-lightbox');
  if (!lightbox || lightbox.querySelector('.photo-gallery-permission')) return;
  const item = currentLocalId ? await queueGet(currentLocalId).catch(() => null) : null;
  if (!item?.serverPhotoId || item.status !== 'safe') return;

  const permission = item.galleryPermission === 'just_between_us' ? 'just_between_us' : 'eligible';
  const panel = document.createElement('section');
  panel.className = 'photo-gallery-permission';
  panel.setAttribute('aria-labelledby', 'photo-gallery-permission-title');
  panel.innerHTML = `
    <div class="photo-gallery-permission-copy">
      <span class="privacy-kicker">COURT GALLERY</span>
      <strong id="photo-gallery-permission-title">Who can this one be shown to?</strong>
      <p class="privacy-explainer">Every photo you keep is saved privately for Marlena's Court. Marlena curates the public Court Gallery from the weekend's photos.</p>
    </div>
    <div class="privacy-choices" role="group" aria-label="Court gallery permission">
      <button type="button" data-gallery-permission="eligible">
        <span class="privacy-choice-mark" aria-hidden="true">✦</span>
        <span><strong>Okay for the gallery</strong><small>Marlena may choose it for the public Court Gallery.</small></span>
      </button>
      <button type="button" data-gallery-permission="just_between_us">
        <span class="privacy-choice-mark" aria-hidden="true">♥</span>
        <span><strong>Just between us</strong><small>Marlena's Court still gets it. It can never go public.</small></span>
      </button>
    </div>
    <p class="privacy-status" role="status" aria-live="polite"></p>`;

  const actions = lightbox.querySelector('.photo-lightbox-actions');
  if (actions) actions.before(panel);
  else lightbox.append(panel);

  applySelected(panel, permission);
  panel.querySelectorAll('[data-gallery-permission]').forEach((button) => {
    button.addEventListener('click', () => savePermission(item, panel, button.dataset.galleryPermission));
  });
}

async function savePermission(item, panel, permission) {
  if (!['eligible', 'just_between_us'].includes(permission)) return;
  const status = panel.querySelector('.privacy-status');
  const buttons = [...panel.querySelectorAll('[data-gallery-permission]')];
  buttons.forEach((button) => { button.disabled = true; });
  status.textContent = permission === 'just_between_us' ? 'Keeping this one just between you and Marlena…' : 'Making this one eligible for their gallery…';
  try {
    const session = readSession();
    if (!session?.token) throw new Error('Camera session expired.');
    const response = await fetch(`/api/photos/${encodeURIComponent(item.serverPhotoId)}/privacy`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ galleryPermission: permission }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not update this photo.');
    await queuePatch(item.id, { galleryPermission: permission });
    applySelected(panel, permission);
    updateRollCard(item.id, permission);
    status.textContent = permission === 'just_between_us'
      ? 'Just between us ✓ This photo cannot be added to the public gallery.'
      : 'Gallery eligible ✓ Marlena may choose it for the curated Court Gallery.';
    window.dispatchEvent(new CustomEvent('marqrcam:gallery-permission-changed', { detail: { itemId: item.id, permission } }));
  } catch (error) {
    status.textContent = error.message || 'Could not update this photo.';
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function applySelected(panel, permission) {
  panel.querySelectorAll('[data-gallery-permission]').forEach((button) => {
    const selected = button.dataset.galleryPermission === permission;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateRollCard(id, permission) {
  const card = document.querySelector(`.roll-item[data-photo-id="${cssEscape(id)}"]`);
  if (!card) return;
  let chip = card.querySelector('.privacy-chip');
  if (permission === 'just_between_us') {
    if (!chip) {
      chip = document.createElement('span');
      chip.className = 'privacy-chip';
      card.append(chip);
    }
    chip.textContent = 'JUST BETWEEN US';
  } else chip?.remove();
}

function readSession() {
  try { return JSON.parse(localStorage.getItem('marqrcam.session') || 'null'); } catch { return null; }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueGet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const request = tx.objectStore(QUEUE_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function queuePatch(id, patch) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...patch });
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
