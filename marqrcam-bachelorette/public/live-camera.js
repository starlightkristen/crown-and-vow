const shootView = document.querySelector('#shoot-view');
const shutter = document.querySelector('#shutter');
const input = document.querySelector('#photo-input');
const video = document.querySelector('#live-viewfinder');
const gate = document.querySelector('#viewfinder-gate');
const gateButton = document.querySelector('#enable-viewfinder');
const fallbackButton = document.querySelector('#native-camera-fallback');
const gateStatus = document.querySelector('#viewfinder-status');

let stream = null;
let activating = false;

if (video && shutter && input && gate) {
  shutter.addEventListener('click', handleShutter, true);
  gateButton?.addEventListener('click', enableLiveCamera);
  fallbackButton?.addEventListener('click', openNativeCamera);
  video.addEventListener('playing', markLiveCameraReady);
  window.addEventListener('marqrcam:resume-live-camera', () => {
    if (stream && !shootView?.hidden) {
      video?.play().then(markLiveCameraReady).catch(() => {});
    }
  });
  document.addEventListener('visibilitychange', syncPlayback);
  if (shootView) {
    new MutationObserver(syncPlayback).observe(shootView, { attributes: true, attributeFilter: ['hidden'] });
  }
}

function markLiveCameraReady() {
  if (!video?.srcObject || video.paused || video.readyState < 2) return;
  gate.hidden = true;
  gate.setAttribute('aria-hidden', 'true');
  document.querySelector('#camera-body')?.classList.add('live-camera-ready');
}

function showViewfinderGate() {
  gate.hidden = false;
  gate.removeAttribute('aria-hidden');
  document.querySelector('#camera-body')?.classList.remove('live-camera-ready');
}

function syncPlayback() {
  if (!video || !stream) return;
  if (document.hidden || shootView?.hidden) video.pause();
  else video.play().then(markLiveCameraReady).catch(() => {});
}

async function enableLiveCamera() {
  if (stream || activating) {
    if (stream && !shootView?.hidden) video?.play().then(markLiveCameraReady).catch(() => {});
    return;
  }
  activating = true;
  setStatus('Opening the viewfinder…');
  gateButton && (gateButton.disabled = true);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Live camera is not available in this browser.');
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 3840 },
        height: { ideal: 2880 },
        aspectRatio: { ideal: 4 / 3 },
      },
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    markLiveCameraReady();
  } catch (error) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
    showViewfinderGate();
    setStatus(error?.name === 'NotAllowedError'
      ? 'Camera access was not allowed. You can still use your phone camera.'
      : 'Live viewfinder is unavailable here. You can still use your phone camera.');
    fallbackButton && (fallbackButton.hidden = false);
    gateButton && (gateButton.hidden = true);
  } finally {
    activating = false;
    gateButton && (gateButton.disabled = false);
  }
}

async function handleShutter(event) {
  if (!stream || video.readyState < 2) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  shutter.disabled = true;
  document.querySelector('#camera-body')?.classList.add('camera-flash');
  try {
    const file = await captureVideoFrame();
    window.dispatchEvent(new CustomEvent('marqrcam:review-capture', { detail: { file, source: 'live' } }));
  } catch {
    openNativeCamera();
  } finally {
    setTimeout(() => document.querySelector('#camera-body')?.classList.remove('camera-flash'), 180);
    setTimeout(() => { shutter.disabled = false; }, 220);
  }
}

async function captureVideoFrame() {
  const sourceW = video.videoWidth;
  const sourceH = video.videoHeight;
  if (!sourceW || !sourceH) throw new Error('Viewfinder is not ready.');

  const targetRatio = 4 / 3;
  const sourceRatio = sourceW / sourceH;
  let sx = 0;
  let sy = 0;
  let sw = sourceW;
  let sh = sourceH;

  if (sourceRatio > targetRatio) {
    sw = Math.round(sourceH * targetRatio);
    sx = Math.round((sourceW - sw) / 2);
  } else if (sourceRatio < targetRatio) {
    sh = Math.round(sourceW / targetRatio);
    sy = Math.round((sourceH - sh) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not capture photo.')), 'image/jpeg', 0.96);
  });
  return new File([blob], `marqrcam-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

function openNativeCamera() {
  input.value = '';
  input.click();
}

function setStatus(message) {
  if (gateStatus) gateStatus.textContent = message;
}
