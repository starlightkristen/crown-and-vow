const rollList = document.querySelector('#roll-list');
const saveTools = document.querySelector('#roll-save-tools');
const selectToggle = document.querySelector('#roll-select-toggle');
const selectionTools = document.querySelector('#roll-selection-tools');
const selectAllButton = document.querySelector('#roll-select-all');
const clearSelectionButton = document.querySelector('#roll-clear-selection');
const selectedCount = document.querySelector('#roll-selected-count');
const saveSelectedButton = document.querySelector('#roll-save-selected');
const saveStatus = document.querySelector('#roll-save-status');

function frameNumber(item) {
  return Number(item.frame || (((Number(item.roll || 1) - 1) * 36) + Number(item.exposure || 1)));
}

if (rollList) {
  const objectUrls = new Map();
  const selectedIds = new Set();
  let lightbox = null;
  let selectionMode = false;
  const observer = new MutationObserver(() => enrichRoll());
  observer.observe(rollList, { childList: true, subtree: false });
  rollList.addEventListener('click', handleRollClick);
  rollList.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.roll-item') && !event.target.closest('.roll-select-mark')) {
      event.preventDefault();
      event.target.closest('.roll-item').click();
    }
  });

  selectToggle?.addEventListener('click', () => setSelectionMode(!selectionMode));
  selectAllButton?.addEventListener('click', selectAll);
  clearSelectionButton?.addEventListener('click', clearSelection);
  saveSelectedButton?.addEventListener('click', saveSelectedToPhone);

  async function enrichRoll() {
    const cards = [...rollList.querySelectorAll('.roll-item')];
    const items = await queueAll();
    items.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    if (saveTools) saveTools.hidden = !items.length;
    if (!cards.length) {
      clearSelection();
      return;
    }

    cards.forEach((card, index) => {
      const item = items[index];
      if (!item?.blob) return;
      const frame = frameNumber(item);
      card.dataset.photoId = item.id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', selectionMode ? selectionLabel(item) : `View frame ${frame}`);

      let url = objectUrls.get(item.id);
      if (!url) {
        url = URL.createObjectURL(item.blob);
        objectUrls.set(item.id, url);
      }

      let thumb = card.querySelector('.roll-thumb');
      if (!thumb) {
        thumb = document.createElement('img');
        thumb.className = 'roll-thumb';
        card.insertBefore(thumb, card.firstChild);
      }
      thumb.src = url;
      thumb.alt = `Frame ${frame}`;

      let mark = card.querySelector('.roll-select-mark');
      if (!mark) {
        mark = document.createElement('button');
        mark.type = 'button';
        mark.className = 'roll-select-mark';
        mark.addEventListener('click', (event) => {
          event.stopPropagation();
          const currentId = event.currentTarget.closest('.roll-item')?.dataset.photoId;
          if (currentId) toggleSelected(currentId);
        });
        card.append(mark);
      }
      mark.setAttribute('aria-label', `${selectedIds.has(item.id) ? 'Deselect' : 'Select'} frame ${frame}`);
      mark.setAttribute('aria-pressed', String(selectedIds.has(item.id)));
      mark.textContent = selectedIds.has(item.id) ? '✓' : '';
      card.classList.toggle('is-selected', selectedIds.has(item.id));
      card.classList.toggle('selection-mode', selectionMode);
      card.classList.add('has-photo');
    });
    updateSelectionUi(items.length);
  }

  async function handleRollClick(event) {
    if (event.target.closest('.roll-select-mark')) return;
    const card = event.target.closest('.roll-item');
    if (!card?.dataset.photoId) return;
    if (selectionMode) {
      toggleSelected(card.dataset.photoId);
      return;
    }
    const items = await queueAll();
    const item = items.find((row) => row.id === card.dataset.photoId);
    if (!item?.blob) return;
    openLightbox(item);
  }

  function setSelectionMode(enabled) {
    selectionMode = enabled;
    if (!enabled) selectedIds.clear();
    if (selectionTools) selectionTools.hidden = !enabled;
    if (selectToggle) {
      selectToggle.textContent = enabled ? 'Done selecting' : 'Select to save';
      selectToggle.setAttribute('aria-pressed', String(enabled));
    }
    if (saveStatus) saveStatus.textContent = '';
    enrichRoll();
  }

  function toggleSelected(id) {
    if (!selectionMode) selectionMode = true;
    if (selectionTools) selectionTools.hidden = false;
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    if (selectToggle) {
      selectToggle.textContent = 'Done selecting';
      selectToggle.setAttribute('aria-pressed', 'true');
    }
    enrichRoll();
  }

  async function selectAll() {
    const items = await queueAll();
    items.forEach((item) => selectedIds.add(item.id));
    enrichRoll();
  }

  function clearSelection() {
    selectedIds.clear();
    updateSelectionUi();
    rollList.querySelectorAll('.roll-item').forEach((card) => {
      card.classList.remove('is-selected');
      const mark = card.querySelector('.roll-select-mark');
      if (mark) {
        mark.textContent = '';
        mark.setAttribute('aria-pressed', 'false');
      }
    });
  }

  function updateSelectionUi(total = null) {
    const count = selectedIds.size;
    if (selectedCount) selectedCount.textContent = `${count} selected`;
    if (saveSelectedButton) {
      saveSelectedButton.disabled = count < 1;
      saveSelectedButton.textContent = count > 1 ? `Save ${count} photos to phone` : 'Save selected to phone';
    }
    if (selectAllButton && Number.isFinite(total)) {
      selectAllButton.textContent = count === total && total > 0 ? 'All selected' : 'Select all';
      selectAllButton.disabled = count === total && total > 0;
    }
  }

  function selectionLabel(item) {
    const frame = frameNumber(item);
    return `${selectedIds.has(item.id) ? 'Selected' : 'Not selected'}, frame ${frame}. Tap to ${selectedIds.has(item.id) ? 'deselect' : 'select'}.`;
  }

  async function saveSelectedToPhone() {
    if (!selectedIds.size) return;
    const items = (await queueAll())
      .filter((item) => selectedIds.has(item.id))
      .sort((a, b) => frameNumber(a) - frameNumber(b));
    if (!items.length) return;

    const version = document.querySelector('input[name="roll-save-version"]:checked')?.value || 'developed';
    saveSelectedButton.disabled = true;
    if (saveStatus) saveStatus.textContent = `Preparing ${items.length} photo${items.length === 1 ? '' : 's'}…`;

    try {
      const files = [];
      for (const item of items) files.push(await exportFile(item, version));
      if (navigator.share && navigator.canShare?.({ files })) {
        if (saveStatus) saveStatus.textContent = isAppleMobile()
          ? 'Choose “Save Images” in the Share sheet to add them to Photos.'
          : 'Choose where you want to save your photos.';
        await navigator.share({ files, title: 'Crown & Vow — My Roll', text: 'Photos from Crown & Vow · Sept 18–21, 2026' });
        if (saveStatus) saveStatus.textContent = `${files.length} photo${files.length === 1 ? '' : 's'} ready on your phone ✓`;
      } else {
        files.forEach((file, index) => setTimeout(() => downloadFile(file), index * 220));
        if (saveStatus) saveStatus.textContent = `${files.length} photo${files.length === 1 ? '' : 's'} saved as downloads ✓`;
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        if (saveStatus) saveStatus.textContent = 'Save canceled. Your photos are still here.';
      } else if (saveStatus) saveStatus.textContent = error?.message || 'Could not save these photos. Try a smaller selection.';
    } finally {
      saveSelectedButton.disabled = selectedIds.size < 1;
    }
  }

  async function exportFile(item, version) {
    const frame = String(frameNumber(item)).padStart(2, '0');
    const wantsEdited = version === 'developed' && item.editStatus === 'edited' && item.editRecipe;
    if (wantsEdited) {
      if (!window.MarQrDarkroom) throw new Error('The edited-photo renderer is unavailable.');
      const src = objectUrls.get(item.id) || URL.createObjectURL(item.blob);
      objectUrls.set(item.id, src);
      const blob = await window.MarQrDarkroom.renderBlob(src, item.editRecipe, 2800);
      return new File([blob], `AM-frame-${frame}-edited.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    }
    const ext = extensionForMime(item.mimeType || item.blob?.type);
    return new File([item.blob], `AM-frame-${frame}-original.${ext}`, {
      type: item.mimeType || item.blob?.type || 'image/jpeg',
      lastModified: Date.parse(item.capturedAt) || Date.now(),
    });
  }

  function openLightbox(item) {
    closeLightbox();
    const frame = frameNumber(item);
    const url = objectUrls.get(item.id) || URL.createObjectURL(item.blob);
    objectUrls.set(item.id, url);
    const safe = item.status === 'safe';
    lightbox = document.createElement('div');
    lightbox.className = 'photo-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', `Frame ${frame}`);
    lightbox.innerHTML = `
      <div class="photo-lightbox-bar">
        <div><span>YOUR ROLL · FRAME ${String(frame).padStart(2, '0')}</span><strong>${safe ? (item.editStatus === 'edited' ? 'EDITED' : 'SAFE ✓') : 'WAITING'}</strong></div>
        <button class="photo-close" type="button" aria-label="Close photo">×</button>
      </div>
      <div class="photo-lightbox-stage"><img src="${url}" alt="Frame ${frame}"></div>
      <div class="photo-lightbox-actions">
        <button class="photo-save-one" type="button">Save to phone</button>
        ${safe ? '<button class="photo-edit" type="button">Open darkroom</button>' : ''}
        <button class="photo-delete" type="button">Remove photo</button>
      </div>`;
    document.body.append(lightbox);
    document.body.classList.add('photo-open');
    lightbox.querySelector('.photo-close').focus();
    lightbox.querySelector('.photo-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.photo-delete').addEventListener('click', () => removePhoto(item));
    lightbox.querySelector('.photo-save-one').addEventListener('click', () => saveOnePhoto(item));
    lightbox.querySelector('.photo-edit')?.addEventListener('click', () => {
      closeLightbox();
      window.dispatchEvent(new CustomEvent('marqrcam:open-darkroom', { detail: { item, url, frame } }));
    });
    lightbox.addEventListener('click', (event) => { if (event.target.classList.contains('photo-lightbox-stage')) closeLightbox(); });
  }

  async function saveOnePhoto(item) {
    const version = item.editStatus === 'edited' && item.editRecipe ? 'developed' : 'original';
    const file = await exportFile(item, version);
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `A&M Frame ${String(frameNumber(item)).padStart(2, '0')}` });
      else downloadFile(file);
    } catch (error) {
      if (error?.name !== 'AbortError') alert(error?.message || 'Could not save this photo.');
    }
  }

  async function removePhoto(item) {
    if (!confirm('Remove this photo from your roll? This permanently deletes it from the Crown & Vow camera.')) return;
    const button = lightbox?.querySelector('.photo-delete');
    if (button) { button.disabled = true; button.textContent = 'Removing…'; }
    try {
      if (item.status === 'safe' && item.serverPhotoId) {
        const session = JSON.parse(localStorage.getItem('marqrcam.session') || 'null');
        const response = await fetch(`/api/photos/${encodeURIComponent(item.serverPhotoId)}`, { method: 'DELETE', headers: { authorization: `Bearer ${session?.token || ''}` } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not delete photo.');
      }
      await queueDelete(item.id);
      selectedIds.delete(item.id);
      const url = objectUrls.get(item.id);
      if (url) URL.revokeObjectURL(url);
      objectUrls.delete(item.id);
      closeLightbox();
      document.querySelector('#open-roll')?.click();
      window.dispatchEvent(new Event('marqrcam:photo-deleted'));
    } catch (error) {
      alert(error.message || 'Could not delete photo.');
      if (button) { button.disabled = false; button.textContent = 'Remove photo'; }
    }
  }

  function closeLightbox() {
    lightbox?.remove();
    lightbox = null;
    document.body.classList.remove('photo-open');
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function extensionForMime(type) {
    return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' })[String(type || '').toLowerCase()] || 'jpg';
  }

  function isAppleMobile() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLightbox(); });

  async function queueAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readonly');
      const request = tx.objectStore('queue').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function queueDelete(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      tx.objectStore('queue').delete(id);
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
}
