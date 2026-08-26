const INSTALL_COMPLETE_KEY = 'marqrcam.installComplete';
const INSTALL_SNOOZE_KEY = 'marqrcam.installSnoozedThisVisit';

const card = document.querySelector('#install-card');
const installButton = document.querySelector('#install-camera');
const doneButton = document.querySelector('#install-done');
const laterButton = document.querySelector('#install-later');
const iosHelp = document.querySelector('#ios-install-help');
const rollView = document.querySelector('#roll-view');

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function hasCameraSession() {
  try {
    const session = JSON.parse(localStorage.getItem('marqrcam.session') || 'null');
    return Boolean(session?.token && session?.camera && session?.guest);
  } catch {
    return false;
  }
}

function markInstalled() {
  localStorage.setItem(INSTALL_COMPLETE_KEY, '1');
  sessionStorage.removeItem(INSTALL_SNOOZE_KEY);
  if (card) card.hidden = true;
}

function hideForThisVisit() {
  sessionStorage.setItem(INSTALL_SNOOZE_KEY, '1');
  if (card) card.hidden = true;
}

function updateInstallCard() {
  if (!card) return;

  if (isStandalone()) {
    markInstalled();
    return;
  }

  // Browser mode is the source of truth. A stale installComplete flag should
  // never permanently remove the option after a shortcut was removed, an
  // install was cancelled, or the guest returns through Safari/Chrome.
  const snoozed = sessionStorage.getItem(INSTALL_SNOOZE_KEY) === '1';
  const rollIsOpen = rollView && !rollView.hidden;
  card.hidden = snoozed || !rollIsOpen || !hasCameraSession();
}

installButton?.addEventListener('click', () => {
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isiOS && !isStandalone()) {
    if (iosHelp) iosHelp.hidden = false;
    if (doneButton) doneButton.hidden = false;
    installButton.textContent = 'Add to Home Screen ↑';
  }
});

doneButton?.addEventListener('click', hideForThisVisit);
laterButton?.addEventListener('click', hideForThisVisit);

window.addEventListener('appinstalled', markInstalled);
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallCard);
window.addEventListener('pageshow', updateInstallCard);
window.addEventListener('focus', updateInstallCard);

if (rollView) {
  new MutationObserver(updateInstallCard).observe(rollView, {
    attributes: true,
    attributeFilter: ['hidden'],
  });
}

updateInstallCard();
