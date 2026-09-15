const TITLE_MAX = 50;
const SUBTITLE_MAX = 80;
let overlay = null;
let active = null;

window.addEventListener('marqrcam:open-darkroom', (event) => openDarkroom(event.detail));

function renderer() {
  if (!window.MarQrDarkroom) throw new Error('Darkroom renderer did not load.');
  return window.MarQrDarkroom;
}

function openDarkroom(detail) {
  closeDarkroom();
  const { normalizeRecipe } = renderer();
  const recipe = normalizeRecipe(detail.item?.editRecipe || {});
  active = { ...detail, ...recipe };

  overlay = document.createElement('div');
  overlay.className = 'darkroom';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Darkroom for frame ${detail.frame}`);
  overlay.innerHTML = `
    <div class="darkroom-topbar">
      <div>
        <span>DARKROOM · FRAME ${String(detail.frame).padStart(2, '0')}</span>
        <strong>Curate a finished copy. Your original stays untouched.</strong>
      </div>
      <button class="darkroom-close" type="button" aria-label="Close darkroom">×</button>
    </div>
    <div class="darkroom-layout">
      <div class="darkroom-preview-wrap">
        <div class="darkroom-preview-frame" data-frame="${active.frame}" data-filter="${active.filter}">
          <div class="darkroom-frame-depth" aria-hidden="true"></div>
          <div class="darkroom-ornaments" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <img class="darkroom-preview" src="${detail.url}" alt="Darkroom preview">
          <div class="darkroom-caption" hidden>
            <strong class="darkroom-caption-title"></strong>
            <span class="darkroom-caption-subtitle"></span>
          </div>
        </div>
      </div>
      <div class="darkroom-controls">
        <section>
          <div class="darkroom-section-heading"><p class="darkroom-label">LOOK</p><span>Choose the photographic finish.</span></div>
          <div class="darkroom-options darkroom-look-options" aria-label="Choose a photo look"></div>
        </section>
        <section>
          <div class="darkroom-section-heading"><p class="darkroom-label">FRAME</p><span>Choose how the photograph is presented.</span></div>
          <div class="darkroom-options darkroom-frame-options" aria-label="Choose a frame"></div>
        </section>
        <section class="darkroom-text-fields">
          <div class="darkroom-section-heading"><p class="darkroom-label">CAPTION · OPTIONAL</p><span>Make it sentimental, documentary, or funny.</span></div>
          <label for="darkroom-title">Title</label>
          <input id="darkroom-title" maxlength="${TITLE_MAX}" placeholder="First Dance" value="${escapeHtml(active.title)}">
          <label for="darkroom-subtitle">Subtitle</label>
          <input id="darkroom-subtitle" maxlength="${SUBTITLE_MAX}" placeholder="Highland Lakes Manor · September 2026" value="${escapeHtml(active.subtitle)}">
        </section>
        <p class="darkroom-note">Edits create a separate finished image. The SAFE original is never overwritten.</p>
        <div class="darkroom-actions">
          <button class="darkroom-save" type="button">Save edited copy</button>
          <button class="darkroom-cancel" type="button">Cancel</button>
        </div>
        <p class="darkroom-status" aria-live="polite"></p>
      </div>
    </div>`;

  document.body.append(overlay);
  document.body.classList.add('darkroom-open');
  renderOptions();
  updatePreview();
  overlay.querySelector('.darkroom-close').focus();
  overlay.querySelector('.darkroom-close').addEventListener('click', closeDarkroom);
  overlay.querySelector('.darkroom-cancel').addEventListener('click', closeDarkroom);
  overlay.querySelector('#darkroom-title').addEventListener('input', debounce((event) => {
    active.title = event.target.value.slice(0, TITLE_MAX);
    updatePreview();
  }, 80));
  overlay.querySelector('#darkroom-subtitle').addEventListener('input', debounce((event) => {
    active.subtitle = event.target.value.slice(0, SUBTITLE_MAX);
    updatePreview();
  }, 80));
  overlay.querySelector('.darkroom-save').addEventListener('click', saveDeveloped);
}

function renderOptions() {
  const { LOOKS, FRAMES } = renderer();
  const lookWrap = overlay.querySelector('.darkroom-look-options');
  const frameWrap = overlay.querySelector('.darkroom-frame-options');
  lookWrap.innerHTML = '';
  frameWrap.innerHTML = '';

  for (const [id, option] of Object.entries(LOOKS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'darkroom-choice darkroom-look-choice';
    button.classList.toggle('active', active.filter === id);
    button.setAttribute('aria-pressed', String(active.filter === id));
    button.setAttribute('aria-label', `${option.label}. ${option.description}`);
    button.innerHTML = `<span class="darkroom-choice-preview look-preview"><img src="${active.url}" alt="" style="filter:${option.css}"></span><span class="darkroom-choice-copy"><strong>${option.label}</strong><small>${option.description}</small></span>`;
    button.addEventListener('click', () => {
      active.filter = id;
      renderOptions();
      updatePreview();
    });
    lookWrap.append(button);
  }

  for (const [id, option] of Object.entries(FRAMES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'darkroom-choice darkroom-frame-choice';
    button.classList.toggle('active', active.frame === id);
    button.setAttribute('aria-pressed', String(active.frame === id));
    button.setAttribute('aria-label', `${option.label}. ${option.description}`);
    button.innerHTML = `<span class="darkroom-choice-preview frame-preview" data-frame="${id}"><span><img src="${active.url}" alt=""></span></span><span class="darkroom-choice-copy"><strong>${option.label}</strong><small>${option.description}</small></span>`;
    button.addEventListener('click', () => {
      active.frame = id;
      renderOptions();
      updatePreview();
    });
    frameWrap.append(button);
  }
}

function updatePreview() {
  const { LOOKS } = renderer();
  const image = overlay?.querySelector('.darkroom-preview');
  const frame = overlay?.querySelector('.darkroom-preview-frame');
  const caption = overlay?.querySelector('.darkroom-caption');
  const title = overlay?.querySelector('.darkroom-caption-title');
  const subtitle = overlay?.querySelector('.darkroom-caption-subtitle');
  if (!image || !frame || !caption || !title || !subtitle) return;

  image.style.filter = LOOKS[active.filter]?.css || 'none';
  frame.dataset.frame = active.frame;
  frame.dataset.filter = active.filter;
  title.textContent = active.title.trim();
  subtitle.textContent = active.subtitle.trim();
  const supportsCaption = ['museum-mat', 'gallery-label', 'modern-gallery', 'illuminated', 'renaissance'].includes(active.frame);
  caption.hidden = !supportsCaption || (!active.title.trim() && !active.subtitle.trim());
  title.hidden = !active.title.trim();
  subtitle.hidden = !active.subtitle.trim();
}

async function saveDeveloped() {
  const button = overlay.querySelector('.darkroom-save');
  const status = overlay.querySelector('.darkroom-status');
  button.disabled = true;
  status.textContent = 'Finishing your photo…';
  try {
    const recipe = {
      filter: active.filter,
      frame: active.frame,
      title: active.title.trim().slice(0, TITLE_MAX),
      subtitle: active.subtitle.trim().slice(0, SUBTITLE_MAX),
    };
    const blob = await renderer().renderBlob(active.url, recipe, 2800);
    const session = JSON.parse(localStorage.getItem('marqrcam.session') || 'null');
    if (!session?.token || !active.item?.serverPhotoId) throw new Error('This photo is not ready to edit yet.');
    const response = await fetch(`/api/photos/${encodeURIComponent(active.item.serverPhotoId)}/developed`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.token}`,
        'content-type': blob.type,
        'x-edit-recipe': encodeURIComponent(JSON.stringify(recipe)),
      },
      body: blob,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not save the edited copy.');
    await queuePatch(active.item.id, { editStatus: 'edited', editRecipe: recipe, developedAt: new Date().toISOString() });
    status.textContent = 'Edited copy saved ✓';
    window.dispatchEvent(new Event('marqrcam:developed'));
    setTimeout(() => { closeDarkroom(); document.querySelector('#open-roll')?.click(); }, 650);
  } catch (error) {
    status.textContent = error.message || 'Could not save the edited copy.';
    button.disabled = false;
  }
}

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function closeDarkroom() {
  overlay?.remove();
  overlay = null;
  active = null;
  document.body.classList.remove('darkroom-open');
}

async function queuePatch(id, patch) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const get = store.get(id);
    get.onsuccess = () => store.put({ ...get.result, ...patch });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}
