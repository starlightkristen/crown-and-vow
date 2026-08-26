const grid = document.querySelector('#gallery-grid');
const status = document.querySelector('#gallery-status');
const refresh = document.querySelector('#gallery-refresh');
let lightbox = null;

loadGallery();
refresh?.addEventListener('click', loadGallery);

async function loadGallery() {
  status.textContent = 'Loading the gallery…';
  grid.innerHTML = '';
  try {
    const response = await fetch('/api/gallery', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not open the gallery.');
    if (!data.enabled) { status.textContent = 'The gallery is not open yet.'; return; }
    if (!data.photos?.length) { status.textContent = 'The first pictures will appear here once they are selected for the gallery.'; return; }
    status.textContent = `${data.photos.length} picture${data.photos.length === 1 ? '' : 's'} from the night.`;
    for (const photo of data.photos) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-card';
      card.innerHTML = `<img loading="lazy" src="${photo.imageUrl}" alt="Bachelorette photo by ${escapeHtml(photo.firstName)}"><span><strong>${escapeHtml(photo.firstName)}</strong><small>${formatCamera(photo.cameraModel)}</small></span>`;
      card.addEventListener('click', () => openPhoto(photo));
      grid.append(card);
    }
  } catch (error) {
    status.textContent = error.message || 'Could not open the gallery.';
  }
}

function openPhoto(photo) {
  closePhoto();
  lightbox = document.createElement('div');
  lightbox.className = 'gallery-lightbox';
  lightbox.innerHTML = `<div class="gallery-lightbox-bar"><div><span>LAST KNIGHT OUT · SEPT 18–21, 2026</span><strong>${escapeHtml(photo.firstName)} · ${formatCamera(photo.cameraModel)}</strong></div><button type="button" aria-label="Close">×</button></div><div class="gallery-lightbox-stage"><img src="${photo.imageUrl}" alt="Bachelorette photo by ${escapeHtml(photo.firstName)}"></div>`;
  document.body.append(lightbox);
  document.body.classList.add('gallery-open');
  lightbox.querySelector('button').addEventListener('click', closePhoto);
  lightbox.querySelector('.gallery-lightbox-stage').addEventListener('click', closePhoto);
}
function closePhoto() { lightbox?.remove(); lightbox = null; document.body.classList.remove('gallery-open'); }
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePhoto(); });
const CAMERA_NAMES = { 'canon-ae1': 'The Minstrel', 'olympus-trip-35': 'The Wanderer', 'polaroid-sx70': 'The Alchemist', 'kodak-instamatic-104': 'The Jester', 'nikon-f3': 'The Archivist', 'pentax-k1000': 'The Courtier' };
function formatCamera(id) { return CAMERA_NAMES[id] || String(id || '').replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c])); }
