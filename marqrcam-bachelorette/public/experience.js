const MODE_KEY = 'marqrcam.viewMode';
const WELCOME_KEY = 'marqrcam.welcomeSeen';
const MODES = new Set(['classic', 'illuminated']);

const root = document.documentElement;
const app = document.querySelector('#app');
const welcome = document.querySelector('#welcome-experience');
const beginButton = document.querySelector('#begin-experience');
const displayToggle = document.querySelector('#display-toggle');
const displayDialog = document.querySelector('#display-dialog');
const displayClose = document.querySelector('#display-close');
const liveRegion = document.querySelector('#experience-announcer');
const modeButtons = [...document.querySelectorAll('[data-view-mode-choice]')];
const modeCopy = document.querySelector('#display-current-mode');
const views = [...document.querySelectorAll('.view')];
let dialogReturnFocus = null;

initExperience();

function initExperience() {
  const saved = localStorage.getItem(MODE_KEY);
  applyMode(MODES.has(saved) ? saved : 'classic', false);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.dataset.motion = 'reduced';
  }

  bindDisplayControls();
  bindWelcome();
  observeViewChanges();

  const hasIssuedCamera = hasValidSession();
  if (welcome) {
    welcome.hidden = hasIssuedCamera || sessionStorage.getItem(WELCOME_KEY) === '1';
    syncBackgroundInert();
    if (!welcome.hidden) requestAnimationFrame(() => beginButton?.focus({ preventScroll: true }));
  }
}

function bindDisplayControls() {
  displayToggle?.addEventListener('click', openDisplayDialog);
  displayClose?.addEventListener('click', closeDisplayDialog);

  displayDialog?.addEventListener('click', (event) => {
    if (event.target === displayDialog) closeDisplayDialog();
  });

  document.addEventListener('keydown', (event) => {
    if (!displayDialog || displayDialog.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDisplayDialog();
      return;
    }
    if (event.key === 'Tab') trapDialogFocus(event);
  });

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      applyMode(button.dataset.viewModeChoice, true);
      closeDisplayDialog();
    });
  }
}

function bindWelcome() {
  beginButton?.addEventListener('click', () => {
    if (!welcome) return;
    welcome.classList.add('welcome-exit');
    sessionStorage.setItem(WELCOME_KEY, '1');
    window.setTimeout(() => {
      welcome.hidden = true;
      welcome.classList.remove('welcome-exit');
      syncBackgroundInert();
      const input = document.querySelector('#last-name');
      input?.focus({ preventScroll: true });
      announce('Guest check-in. Enter your last name to find your invitation.');
    }, prefersReducedMotion() ? 0 : 260);
  });
}

function openDisplayDialog() {
  if (!displayDialog) return;
  dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : displayToggle;
  displayDialog.hidden = false;
  document.body.classList.add('dialog-open');
  syncBackgroundInert();
  const current = root.dataset.viewMode || 'classic';
  const active = modeButtons.find((button) => button.dataset.viewModeChoice === current);
  requestAnimationFrame(() => (active || displayClose)?.focus({ preventScroll: true }));
}

function closeDisplayDialog() {
  if (!displayDialog || displayDialog.hidden) return;
  displayDialog.hidden = true;
  document.body.classList.remove('dialog-open');
  syncBackgroundInert();
  const target = dialogReturnFocus?.isConnected ? dialogReturnFocus : displayToggle;
  dialogReturnFocus = null;
  target?.focus({ preventScroll: true });
}

function syncBackgroundInert() {
  const dialogOpen = Boolean(displayDialog && !displayDialog.hidden);
  const welcomeOpen = Boolean(welcome && !welcome.hidden);

  if (app) app.inert = dialogOpen || welcomeOpen;
  if (welcome) welcome.inert = dialogOpen;
  if (displayToggle) displayToggle.inert = dialogOpen;
}

function trapDialogFocus(event) {
  const focusable = [...displayDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getClientRects().length > 0);
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

function applyMode(mode, announceChange) {
  const next = MODES.has(mode) ? mode : 'classic';
  root.dataset.viewMode = next;
  localStorage.setItem(MODE_KEY, next);
  const label = next === 'illuminated' ? 'Illuminated' : 'Classic';
  if (modeCopy) modeCopy.textContent = label;

  for (const button of modeButtons) {
    const selected = button.dataset.viewModeChoice === next;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  }

  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme && !document.querySelector('#shoot-view:not([hidden])')) {
    theme.setAttribute('content', next === 'illuminated' ? '#f4eddf' : '#0d0c0a');
  }

  if (announceChange) {
    announce(`${label} view selected.${next === 'illuminated' ? ' Larger type, stronger contrast and larger controls are on.' : ' Candlelit wedding presentation is on.'}`);
  }
}

function observeViewChanges() {
  if (!views.length) return;
  const observer = new MutationObserver(() => {
    const active = views.find((view) => !view.hidden);
    if (!active) return;
    document.body.dataset.currentView = active.id;
    const heading = active.querySelector('h1, h2, [role="heading"]');
    if (heading?.textContent) announce(heading.textContent.trim());
  });

  for (const view of views) observer.observe(view, { attributes: true, attributeFilter: ['hidden'] });
}

function hasValidSession() {
  try {
    const raw = localStorage.getItem('marqrcam.session');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.token && parsed?.guest && parsed?.camera);
  } catch {
    return false;
  }
}

function announce(message) {
  if (!liveRegion || !message) return;
  liveRegion.textContent = '';
  window.setTimeout(() => { liveRegion.textContent = message; }, 10);
}

function prefersReducedMotion() {
  return root.dataset.motion === 'reduced';
}
