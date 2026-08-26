const input = document.querySelector('#photo-input');
let review = null;
let previewUrl = null;
let activeFile = null;
let activeSource = 'native';
let bypassNextChange = false;
let returnFocus = null;

if (input) document.addEventListener('change', interceptNativeCapture, true);
window.addEventListener('marqrcam:review-capture', (event) => {
  const file = event.detail?.file;
  if (file) showReview(file, event.detail?.source || 'live');
});
window.addEventListener('keydown', (event) => {
  if (!review) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    retakePhoto();
    return;
  }
  if (event.key === 'Tab') trapFocus(event);
});

function interceptNativeCapture(event) {
  if (event.target !== input) return;
  if (bypassNextChange) {
    bypassNextChange = false;
    return;
  }
  const file = input.files?.[0];
  if (!file) return;
  event.stopImmediatePropagation();
  event.preventDefault();
  showReview(file, 'native');
}

function showReview(file, source) {
  closeReview(false);
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeFile = file;
  activeSource = source;
  previewUrl = URL.createObjectURL(file);
  review = document.createElement('div');
  review.className = 'capture-review';
  review.setAttribute('role', 'dialog');
  review.setAttribute('aria-modal', 'true');
  review.setAttribute('aria-label', 'Review your photo');
  review.innerHTML = `
    <div class="capture-review-top">
      <div>
        <p class="capture-review-kicker">YOUR EXPOSURE</p>
        <h2>Keep this one?</h2>
        <p>Take a look before it goes into your roll.</p>
      </div>
    </div>
    <div class="capture-review-stage"><img src="${previewUrl}" alt="Photo you just took"></div>
    <div class="capture-review-actions">
      <button class="capture-retake" type="button">Retake</button>
      <button class="capture-keep" type="button">Keep photo</button>
    </div>
    <p class="capture-review-note">Retake discards this copy. Keep photo saves it to your roll.</p>`;
  document.body.append(review);
  document.body.classList.add('capture-review-open');
  review.querySelector('.capture-keep').addEventListener('click', keepPhoto);
  review.querySelector('.capture-retake').addEventListener('click', retakePhoto);
  review.querySelector('.capture-keep').focus({ preventScroll: true });
}

function keepPhoto() {
  if (!activeFile || !input) return closeReview();
  if (activeSource === 'live') {
    try {
      const transfer = new DataTransfer();
      transfer.items.add(activeFile);
      input.files = transfer.files;
    } catch {
      const fallback = input;
      closeReview(false);
      fallback.value = '';
      fallback.click();
      return;
    }
  }
  bypassNextChange = true;
  closeReview(false);
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function retakePhoto() {
  if (input) input.value = '';
  const source = activeSource;
  closeReview(false);
  if (source === 'live') window.dispatchEvent(new Event('marqrcam:resume-live-camera'));
  else input?.click();
}

function trapFocus(event) {
  if (!review) return;
  const focusable = [...review.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeReview(restoreFocus = true) {
  review?.remove();
  review = null;
  document.body.classList.remove('capture-review-open');
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  activeFile = null;
  activeSource = 'native';
  if (restoreFocus) {
    const target = returnFocus;
    returnFocus = null;
    target?.focus?.({ preventScroll: true });
  } else {
    returnFocus = null;
  }
}
