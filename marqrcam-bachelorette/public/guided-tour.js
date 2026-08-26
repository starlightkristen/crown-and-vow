const TOUR_VERSION = 'v1';
const TOUR_STEPS = new Set(['intro', 'shutter', 'shooting', 'review', 'roll', 'photo', 'features', 'privacy', 'home', 'complete']);
let coach = null;
let activeTarget = null;
let session = readSession();
let guestKey = session?.guest?.id ? `marqrcam.tour.${TOUR_VERSION}.${session.guest.id}` : null;
let step = guestKey ? readStep() : 'intro';
let observer = null;
let statusObserver = null;

start();

function start() {
  observer = new MutationObserver(handleMutation);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('click', handleClick, true);
  window.addEventListener('storage', refreshSession);
  window.addEventListener('marqrcam:gallery-permission-changed', () => {
    if (step === 'privacy') showHomeStep();
  });
  watchSafeStatus();
  setTimeout(resume, 350);
}

function refreshSession() {
  const next = readSession();
  if (next?.guest?.id === session?.guest?.id) return;
  session = next;
  guestKey = session?.guest?.id ? `marqrcam.tour.${TOUR_VERSION}.${session.guest.id}` : null;
  step = guestKey ? readStep() : 'intro';
  resume();
}

function readStep() {
  const saved = localStorage.getItem(guestKey) || 'intro';
  return TOUR_STEPS.has(saved) ? saved : 'intro';
}

function setStep(next) {
  if (!TOUR_STEPS.has(next)) return;
  step = next;
  if (guestKey) localStorage.setItem(guestKey, next);
}

function resume() {
  refreshSessionFromPage();
  if (!session?.token || !guestKey || step === 'complete') return clearCoach();
  const shoot = document.querySelector('#shoot-view');
  if (!shoot || shoot.hidden) return;

  if (step === 'intro') return showIntro();
  if (step === 'shutter') return showShutterStep();
  if (step === 'shooting') return clearCoach();
  if (step === 'review') return document.querySelector('.capture-review') ? showReviewStep() : clearCoach();
  if (['roll', 'photo', 'features', 'privacy', 'home'].includes(step)) return showRollStep();
}

function refreshSessionFromPage() {
  const latest = readSession();
  if (!latest?.guest?.id) return;
  if (latest.guest.id !== session?.guest?.id) {
    session = latest;
    guestKey = `marqrcam.tour.${TOUR_VERSION}.${session.guest.id}`;
    step = readStep();
  } else session = latest;
}

function showIntro() {
  const owner = document.querySelector('#camera-owner');
  showCoach({
    eyebrow: 'YOUR CAMERA FOR THE NIGHT',
    title: `All yours, ${session.guest.firstName}.`,
    body: `Take photos all weekend. Keep the ones you love and we'll make sure Marlena's Court gets them. Your roll stays here so you can edit, save, or change your mind later.`,
    joke: `The court-photographer licensing process was alarmingly easy.`,
    target: owner || document.querySelector('#camera-body'),
    primary: 'Show me around',
    secondary: 'I know what I’m doing',
    onPrimary: () => { setStep('shutter'); showShutterStep(); },
    onSecondary: completeTour,
  });
}

function showShutterStep() {
  if (document.querySelector('.capture-review')) return showReviewStep();
  showCoach({
    eyebrow: '01 · TAKE THE PICTURE',
    title: 'Point. Shoot. Be brilliant.',
    body: `Use the viewfinder, then press the shutter. You'll get to approve the photo before anything is kept.`,
    joke: `Try not to put your thumb over the lens. We believe in you.`,
    target: document.querySelector('#shutter'),
    primary: 'Got it — let me shoot',
    secondary: null,
    onPrimary: activateCameraForTour,
  });
}

function activateCameraForTour() {
  setStep('shooting');
  clearCoach();
  const cameraBody = document.querySelector('#camera-body');
  cameraBody?.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  window.dispatchEvent(new Event('marqrcam:resume-live-camera'));

  const gate = document.querySelector('#viewfinder-gate');
  const enable = document.querySelector('#enable-viewfinder');
  if (gate && !gate.hidden && enable && !enable.hidden && !enable.disabled) {
    enable.click();
    return;
  }

  const shutter = document.querySelector('#shutter');
  shutter?.focus?.({ preventScroll: true });
}

function showReviewStep() {
  setStep('review');
  const review = document.querySelector('.capture-review');
  if (!review) return;
  clearCoach();
  let note = review.querySelector('.tour-review-note');
  if (!note) {
    note = document.createElement('div');
    note.className = 'tour-review-note';
    note.innerHTML = `
      <span>02 · YOU DECIDE WHAT STAYS</span>
      <p><strong>Retake:</strong> Nope. Never happened.</p>
      <p><strong>Keep photo:</strong> Saves a private copy for Marlena's Court and adds it to your roll.</p>
      <small>Keeping a photo does <strong>not</strong> post it publicly.</small>`;
    review.querySelector('.capture-review-actions')?.before(note);
  }
}

function watchSafeStatus() {
  const status = document.querySelector('#latest-status');
  if (!status) return;
  statusObserver?.disconnect();
  statusObserver = new MutationObserver(() => {
    if (!guestKey || step !== 'review') return;
    if (/safe/i.test(status.textContent || '')) {
      setStep('roll');
      setTimeout(showSafeStep, 250);
    }
  });
  statusObserver.observe(status, { childList: true, characterData: true, subtree: true });
}

function showSafeStep() {
  if (step !== 'roll') return;
  showCoach({
    eyebrow: 'SAFE ✓',
    title: 'One for the newlyweds. One place for you.',
    body: `That keeper is safely with Marlena's Court and waiting in My Roll. You never need to download a photo for the Court to receive it — Keep already handled that.`,
    joke: `Tiny invisible photo courier: dispatched.`,
    target: document.querySelector('#open-roll'),
    primary: 'Open My Roll',
    secondary: null,
    onPrimary: () => {
      setStep('photo');
      clearCoach();
      document.querySelector('#open-roll')?.click();
      setTimeout(showRollIntro, 300);
    },
  });
}

function showRollStep() {
  const roll = document.querySelector('#roll-view');
  if (!roll || roll.hidden) {
    if (step === 'roll') return showSafeStep();
    showCoach({
      eyebrow: 'YOUR ROLL',
      title: 'Your pictures are still right here.',
      body: `Open My Roll to continue. Your kept photos stay with the couple even if you close the app.`,
      target: document.querySelector('#open-roll'),
      primary: 'Open My Roll',
      onPrimary: () => {
        clearCoach();
        document.querySelector('#open-roll')?.click();
        setTimeout(showRollIntro, 300);
      },
    });
    return;
  }
  if (step === 'photo') return showRollIntro();
  if (['features', 'privacy'].includes(step)) {
    const lightbox = document.querySelector('.photo-lightbox');
    if (lightbox) return step === 'privacy' ? showPrivacyStep() : showFeaturesStep();
    return showRollIntro();
  }
  if (step === 'home') return showHomeStep();
}

function showRollIntro() {
  if (step !== 'photo' && step !== 'features' && step !== 'privacy') return;
  const firstPhoto = document.querySelector('.roll-item.has-photo, .roll-item[data-photo-id]');
  if (!firstPhoto) return setTimeout(showRollIntro, 250);
  if (step !== 'photo') return;
  showCoach({
    eyebrow: '03 · THIS IS YOUR ROLL',
    title: 'Open your first keeper.',
    body: `Every photo you keep lands here. Open one to view it bigger and see what else you can do with it.`,
    joke: `All evidence from the evening, neatly catalogued.`,
    target: firstPhoto,
    primary: 'Open this photo',
    onPrimary: () => {
      setStep('features');
      clearCoach();
      firstPhoto.click();
      setTimeout(showFeaturesStep, 250);
    },
  });
}

function showFeaturesStep() {
  if (step !== 'features') return;
  const lightbox = document.querySelector('.photo-lightbox');
  if (!lightbox) return;
  const actions = lightbox.querySelector('.photo-lightbox-actions');
  showCoach({
    eyebrow: '04 · YOUR PHOTO, YOUR OPTIONS',
    title: 'A little more than a disposable camera.',
    body: `Save a copy to your phone, open the Darkroom to change the look or add a frame and title, or remove the photo entirely. Editing makes a separate copy — your original stays untouched.`,
    joke: `Museum-curator credentials remain optional.`,
    target: actions,
    primary: 'And the Court Gallery?',
    secondary: 'That makes sense',
    onPrimary: () => { setStep('privacy'); showPrivacyStep(); },
    onSecondary: () => { setStep('privacy'); showPrivacyStep(); },
  });
}

function showPrivacyStep() {
  if (step !== 'privacy') return;
  const panel = document.querySelector('.photo-gallery-permission');
  if (!panel) return setTimeout(showPrivacyStep, 200);
  showCoach({
    eyebrow: '05 · THE COURT GALLERY',
    title: 'The gallery is curated — not automatic.',
    body: `Everything you Keep is privately saved for Marlena's Court. Later, Marlena chooses favorite moments from everyone's photos for the public Court Gallery. If a photo is only for their eyes, choose “Just between us.”`,
    joke: `Not every masterpiece needs an exhibition wall.`,
    target: panel,
    primary: 'Got it',
    secondary: null,
    onPrimary: showHomeStep,
  });
}

function showHomeStep() {
  setStep('home');
  const lightbox = document.querySelector('.photo-lightbox');
  lightbox?.querySelector('.photo-close')?.click();
  setTimeout(() => {
    const install = document.querySelector('#install-card');
    const target = install && !install.hidden ? install : document.querySelector('#back-to-camera');
    showCoach({
      eyebrow: 'ONE LAST THING',
      title: 'Planning to keep shooting tonight?',
      body: `You can add this camera to your Home Screen so it's easy to get back to this camera and this roll without hunting down the QR code again. You can also skip it and keep using the browser.`,
      joke: `The QR code will not be offended.`,
      target,
      primary: 'I’m ready',
      secondary: null,
      onPrimary: finishWithCongratulations,
    });
  }, 180);
}

function finishWithCongratulations() {
  setStep('complete');
  showCoach({
    eyebrow: 'TOUR COMPLETE',
    title: 'You’re officially a court photographer.',
    body: `Take pictures. Keep what you love. Marlena's Court gets every keeper privately, and Marlena will curate the public gallery later. We'll handle the rest.`,
    joke: `Again: qualifications were alarmingly minimal.`,
    target: document.querySelector('#back-to-camera'),
    primary: 'Take more pictures',
    onPrimary: () => {
      clearCoach();
      document.querySelector('#back-to-camera')?.click();
    },
  });
}

function completeTour() {
  setStep('complete');
  clearCoach();
}

function handleMutation() {
  refreshSessionFromPage();
  if (!guestKey || step === 'complete') return;
  if (document.querySelector('.capture-review') && ['shutter', 'shooting', 'review'].includes(step)) showReviewStep();
  else if (document.querySelector('.photo-lightbox') && step === 'features') showFeaturesStep();
  else if (document.querySelector('.photo-lightbox') && step === 'privacy') showPrivacyStep();
  else if (!document.querySelector('.coachmark') && document.querySelector('#shoot-view:not([hidden])')) resume();
}

function handleClick(event) {
  if (!guestKey || step === 'complete') return;
  if (event.target.closest('#change-person')) clearCoach();
  if (event.target.closest('.capture-keep') && step === 'review') clearCoach();
  if (event.target.closest('.capture-retake') && step === 'review') {
    setStep('shooting');
    clearCoach();
  }
  if (event.target.closest('#open-roll') && step === 'roll') {
    setStep('photo');
    setTimeout(showRollIntro, 300);
  }
}

function showCoach({ eyebrow, title, body, joke = '', target = null, primary = 'Continue', secondary = null, onPrimary = null, onSecondary = null }) {
  clearCoach();
  coach = document.createElement('div');
  coach.className = 'coachmark';
  coach.setAttribute('role', 'dialog');
  coach.setAttribute('aria-modal', 'false');
  coach.setAttribute('aria-label', title);
  coach.innerHTML = `
    <div class="coachmark-card">
      <span class="coachmark-eyebrow">${escapeHtml(eyebrow)}</span>
      <strong class="coachmark-title">${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${joke ? `<small>${escapeHtml(joke)}</small>` : ''}
      <div class="coachmark-actions">
        <button class="coachmark-primary" type="button">${escapeHtml(primary)}</button>
        ${secondary ? `<button class="coachmark-secondary" type="button">${escapeHtml(secondary)}</button>` : ''}
      </div>
    </div>`;
  document.body.append(coach);
  if (target) spotlight(target);
  positionCoach(target);
  coach.querySelector('.coachmark-primary')?.addEventListener('click', () => onPrimary?.());
  coach.querySelector('.coachmark-secondary')?.addEventListener('click', () => onSecondary?.());
  coach.querySelector('.coachmark-primary')?.focus({ preventScroll: true });
}

function spotlight(target) {
  activeTarget = target;
  target.classList.add('tour-spotlight');
  target.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function positionCoach(target) {
  if (!coach) return;
  const card = coach.querySelector('.coachmark-card');
  requestAnimationFrame(() => {
    if (!target || !target.getBoundingClientRect) {
      card.classList.add('coachmark-centered');
      return;
    }
    const rect = target.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const margin = 12;
    const roomBelow = window.innerHeight - rect.bottom;
    const top = roomBelow >= cardRect.height + 24
      ? rect.bottom + margin
      : Math.max(margin, rect.top - cardRect.height - margin);
    const left = Math.min(Math.max(margin, rect.left + rect.width / 2 - cardRect.width / 2), window.innerWidth - cardRect.width - margin);
    card.style.top = `${Math.max(margin, top)}px`;
    card.style.left = `${Math.max(margin, left)}px`;
  });
}

function clearCoach() {
  coach?.remove();
  coach = null;
  activeTarget?.classList.remove('tour-spotlight');
  activeTarget = null;
}

function readSession() {
  try { return JSON.parse(localStorage.getItem('marqrcam.session') || 'null'); } catch { return null; }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '\"': '&quot;' }[char]));
}
