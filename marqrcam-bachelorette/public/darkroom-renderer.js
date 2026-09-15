const LOOKS = {
  original: { label: 'Original', css: 'none', description: 'Untouched color and tone.' },
  candlelight: { label: 'Candlelight', css: 'brightness(1.045) contrast(1.025) saturate(.96) sepia(.13)', description: 'Warm highlights and soft reception glow.' },
  gallery: { label: 'Gallery', css: 'brightness(1.015) contrast(1.065) saturate(.96)', description: 'Clean, balanced and quietly polished.' },
  film: { label: 'Film', css: 'brightness(1.025) contrast(.94) saturate(.87) sepia(.045)', description: 'Soft blacks, gentle grain and analog bloom.' },
  noir: { label: 'Noir', css: 'grayscale(1) contrast(1.13) brightness(.99)', description: 'Rich monochrome with controlled contrast.' },
  'old-master': { label: 'Old Master', css: 'brightness(.99) contrast(1.035) saturate(.76) sepia(.22)', description: 'Subdued color, warm depth and painterly age.' },
};

const FRAMES = {
  none: { label: 'None', description: 'The photograph, unframed.' },
  'museum-mat': { label: 'Museum Mat', description: 'Warm archival mat with a beveled inner edge.' },
  'gallery-label': { label: 'Gallery Label', description: 'Exhibition mount with a dedicated caption field.' },
  gilded: { label: 'Gilded', description: 'Layered antique-gold moulding with subtle depth.' },
  'modern-gallery': { label: 'Modern Gallery', description: 'Clean floating presentation with a narrow shadow gap.' },
  illuminated: { label: 'Illuminated', description: 'Parchment, gold accents and manuscript-inspired ornament.' },
  renaissance: { label: 'Renaissance', description: 'Dark walnut, a gilt inner lip and restrained classical detail.' },
};

const LOOK_ALIASES = { warm: 'candlelight', soft: 'gallery', faded: 'film', mono: 'noir', night: 'old-master' };
const FRAME_ALIASES = { ivory: 'museum-mat', museum: 'gallery-label', black: 'gilded', instant: 'illuminated' };

function normalizeLook(id) {
  const normalized = LOOK_ALIASES[id] || id;
  return LOOKS[normalized] ? normalized : 'original';
}

function normalizeFrame(id) {
  const normalized = FRAME_ALIASES[id] || id;
  return FRAMES[normalized] ? normalized : 'none';
}

function normalizeRecipe(recipe = {}) {
  return {
    filter: normalizeLook(recipe.filter),
    frame: normalizeFrame(recipe.frame),
    title: String(recipe.title || '').trim().slice(0, 50),
    subtitle: String(recipe.subtitle || '').trim().slice(0, 80),
  };
}

function frameMetrics(frameId, minSide, hasText) {
  const frame = normalizeFrame(frameId);
  if (frame === 'none') return { left: 0, right: 0, top: 0, bottom: 0 };
  if (frame === 'gilded') {
    const edge = Math.max(30, Math.round(minSide * .055));
    return { left: edge, right: edge, top: edge, bottom: edge };
  }
  if (frame === 'modern-gallery') {
    const edge = Math.max(26, Math.round(minSide * .048));
    return { left: edge, right: edge, top: edge, bottom: hasText ? Math.round(edge * 1.55) : edge };
  }
  if (frame === 'gallery-label') {
    const side = Math.max(46, Math.round(minSide * .075));
    return { left: side, right: side, top: side, bottom: Math.max(Math.round(side * 2.8), Math.round(minSide * .22)) };
  }
  if (frame === 'illuminated') {
    const side = Math.max(46, Math.round(minSide * .075));
    return { left: side, right: side, top: side, bottom: hasText ? Math.round(side * 1.8) : side };
  }
  if (frame === 'renaissance') {
    const edge = Math.max(42, Math.round(minSide * .072));
    return { left: edge, right: edge, top: edge, bottom: hasText ? Math.round(edge * 1.45) : edge };
  }
  const side = Math.max(44, Math.round(minSide * .072));
  return { left: side, right: side, top: side, bottom: hasText ? Math.round(side * 1.7) : side };
}

function drawFrameBackground(ctx, canvas, frameId) {
  const frame = normalizeFrame(frameId);
  if (frame === 'none') return;
  if (frame === 'gilded') {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#4d3a1f'); gradient.addColorStop(.22, '#a9833f'); gradient.addColorStop(.5, '#d2b46c'); gradient.addColorStop(.72, '#80612e'); gradient.addColorStop(1, '#3c2b17');
    ctx.fillStyle = gradient;
  } else if (frame === 'modern-gallery') ctx.fillStyle = '#171716';
  else if (frame === 'illuminated') ctx.fillStyle = '#eee0bc';
  else if (frame === 'renaissance') {
    const wood = ctx.createLinearGradient(0, 0, canvas.width, 0);
    wood.addColorStop(0, '#241610'); wood.addColorStop(.2, '#5a3624'); wood.addColorStop(.48, '#2f1b14'); wood.addColorStop(.78, '#62402b'); wood.addColorStop(1, '#21140f');
    ctx.fillStyle = wood;
  } else ctx.fillStyle = '#f1eadf';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPhoto(ctx, img, lookId, x, y, width, height) {
  const look = normalizeLook(lookId);
  const spec = LOOKS[look];
  ctx.save();
  ctx.filter = spec.css;
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();

  if (look === 'candlelight') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = .075;
    ctx.filter = 'blur(8px) brightness(1.12) sepia(.18)';
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
    addWarmGlow(ctx, x, y, width, height, .11);
    addVignette(ctx, x, y, width, height, .09);
  } else if (look === 'gallery') {
    addVignette(ctx, x, y, width, height, .045);
  } else if (look === 'film') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = .045;
    ctx.filter = 'blur(5px) brightness(1.08)';
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
    addFilmGrain(ctx, x, y, width, height, .032);
    addVignette(ctx, x, y, width, height, .07);
  } else if (look === 'noir') {
    addVignette(ctx, x, y, width, height, .14);
    addFilmGrain(ctx, x, y, width, height, .018);
  } else if (look === 'old-master') {
    addWarmGlow(ctx, x, y, width, height, .075);
    addVignette(ctx, x, y, width, height, .18);
    addPaperPatina(ctx, x, y, width, height);
  }
}

function addWarmGlow(ctx, x, y, width, height, opacity) {
  ctx.save();
  const gradient = ctx.createRadialGradient(x + width * .43, y + height * .25, 0, x + width * .43, y + height * .25, Math.max(width, height) * .75);
  gradient.addColorStop(0, `rgba(255,220,158,${opacity})`);
  gradient.addColorStop(.55, `rgba(201,137,73,${opacity * .32})`);
  gradient.addColorStop(1, 'rgba(90,48,25,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function addVignette(ctx, x, y, width, height, strength) {
  ctx.save();
  const radius = Math.max(width, height) * .72;
  const gradient = ctx.createRadialGradient(x + width / 2, y + height / 2, radius * .22, x + width / 2, y + height / 2, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(.72, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(19,12,8,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function addFilmGrain(ctx, x, y, width, height, opacity = .03) {
  ctx.save();
  const count = Math.min(10000, Math.max(2200, Math.round((width * height) / 560)));
  for (let i = 0; i < count; i += 1) {
    const light = Math.random() > .48;
    ctx.fillStyle = light ? `rgba(255,255,255,${opacity})` : `rgba(24,17,12,${opacity * .94})`;
    const size = Math.random() > .94 ? 2 : 1;
    ctx.fillRect(x + Math.random() * width, y + Math.random() * height, size, size);
  }
  ctx.restore();
}

function addPaperPatina(ctx, x, y, width, height) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 90; i += 1) {
    const px = x + Math.random() * width;
    const py = y + Math.random() * height;
    const radius = 8 + Math.random() * Math.max(18, Math.min(width, height) * .035);
    const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0, 'rgba(102,72,42,.025)');
    g.addColorStop(1, 'rgba(102,72,42,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFrameDetails(ctx, canvas, frameId, metrics, imageW, imageH) {
  const frame = normalizeFrame(frameId);
  if (frame === 'none') return;
  const x = metrics.left, y = metrics.top;

  if (frame === 'museum-mat' || frame === 'gallery-label') {
    ctx.save();
    ctx.shadowColor = 'rgba(53,39,25,.32)'; ctx.shadowBlur = Math.max(5, canvas.width * .004); ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#d6cab9'; ctx.lineWidth = Math.max(7, canvas.width * .005);
    ctx.strokeRect(x - 5, y - 5, imageW + 10, imageH + 10);
    ctx.restore();
    ctx.strokeStyle = '#9d876a'; ctx.lineWidth = Math.max(1, canvas.width * .0008);
    ctx.strokeRect(x - 9, y - 9, imageW + 18, imageH + 18);
    if (frame === 'gallery-label') {
      const ruleY = y + imageH + metrics.bottom * .22;
      ctx.beginPath(); ctx.moveTo(metrics.left, ruleY); ctx.lineTo(canvas.width - metrics.right, ruleY); ctx.stroke();
    }
  }

  if (frame === 'gilded') {
    const outer = Math.max(4, metrics.left * .12);
    const mid = Math.max(8, metrics.left * .34);
    const inner = Math.max(12, metrics.left * .62);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = Math.max(8, canvas.width * .006);
    ctx.strokeStyle = '#3d2b16'; ctx.lineWidth = outer; ctx.strokeRect(outer / 2, outer / 2, canvas.width - outer, canvas.height - outer);
    ctx.strokeStyle = '#8d6a2e'; ctx.lineWidth = mid; ctx.strokeRect(mid / 2 + outer, mid / 2 + outer, canvas.width - mid - outer * 2, canvas.height - mid - outer * 2);
    ctx.strokeStyle = '#d8bd75'; ctx.lineWidth = Math.max(2, metrics.left * .11); ctx.strokeRect(x - inner * .45, y - inner * .45, imageW + inner * .9, imageH + inner * .9);
    ctx.strokeStyle = '#6f4f22'; ctx.lineWidth = Math.max(1, metrics.left * .055); ctx.strokeRect(x - inner * .25, y - inner * .25, imageW + inner * .5, imageH + inner * .5);
    ctx.restore();
  }

  if (frame === 'modern-gallery') {
    const gap = Math.max(7, metrics.left * .28);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = Math.max(10, canvas.width * .008); ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#f5f2eb';
    ctx.fillRect(x - gap, y - gap, imageW + gap * 2, imageH + gap * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  }

  if (frame === 'illuminated') {
    ctx.strokeStyle = '#9a7835'; ctx.lineWidth = Math.max(1, canvas.width * .0012);
    ctx.strokeRect(x - 9, y - 9, imageW + 18, imageH + 18);
    drawIlluminatedOrnament(ctx, canvas, metrics, imageW, imageH);
  }

  if (frame === 'renaissance') {
    const innerLip = Math.max(5, metrics.left * .15);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.52)'; ctx.shadowBlur = Math.max(10, canvas.width * .008);
    ctx.strokeStyle = '#120b08'; ctx.lineWidth = Math.max(6, metrics.left * .22); ctx.strokeRect(metrics.left * .13, metrics.top * .13, canvas.width - metrics.left * .26, canvas.height - metrics.top * .26);
    ctx.strokeStyle = '#7a5630'; ctx.lineWidth = Math.max(5, metrics.left * .18); ctx.strokeRect(metrics.left * .28, metrics.top * .28, canvas.width - metrics.left * .56, canvas.height - metrics.top * .56);
    ctx.strokeStyle = '#c2a060'; ctx.lineWidth = innerLip; ctx.strokeRect(x - innerLip * .75, y - innerLip * .75, imageW + innerLip * 1.5, imageH + innerLip * 1.5);
    ctx.restore();
    drawRenaissanceCorners(ctx, canvas, metrics);
  }
}

function drawIlluminatedOrnament(ctx, canvas, metrics, imageW, imageH) {
  const gold = '#a9853f', wine = '#6d3935', blue = '#38556b';
  const s = Math.max(30, Math.min(metrics.left, metrics.top) * .68);
  const anchors = [
    [metrics.left - s * .62, metrics.top - s * .64, 1, 1, wine],
    [metrics.left + imageW + s * .58, metrics.top - s * .62, -1, 1, blue],
    [metrics.left - s * .6, metrics.top + imageH + s * .56, 1, -1, blue],
    [metrics.left + imageW + s * .6, metrics.top + imageH + s * .58, -1, -1, wine],
  ];
  anchors.forEach(([cx, cy, sx, sy, accent], index) => {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.lineCap = 'round';
    ctx.strokeStyle = gold; ctx.lineWidth = Math.max(2, canvas.width * .0014);
    ctx.beginPath(); ctx.moveTo(0, s * .68); ctx.bezierCurveTo(s * .02, s * .28, s * .18, s * .03, s * .7, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * .2, s * .48); ctx.quadraticCurveTo(s * .33, s * .28, s * .52, s * .2); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(s * .28, s * .32, s * .11, s * .055, -.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c7a657'; ctx.beginPath(); ctx.arc(s * (.13 + index * .01), s * .13, Math.max(2.5, s * .055), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function drawRenaissanceCorners(ctx, canvas, metrics) {
  const size = Math.max(18, metrics.left * .3);
  const pts = [
    [metrics.left * .33, metrics.top * .33],
    [canvas.width - metrics.right * .33, metrics.top * .33],
    [metrics.left * .33, canvas.height - metrics.bottom * .33],
    [canvas.width - metrics.right * .33, canvas.height - metrics.bottom * .33],
  ];
  pts.forEach(([x, y]) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#8b693b'; ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = '#d0b06a'; ctx.lineWidth = Math.max(1, size * .08); ctx.strokeRect(-size * .32, -size * .32, size * .64, size * .64);
    ctx.restore();
  });
}

function drawCaption(ctx, canvas, frameId, metrics, title, subtitle) {
  const frame = normalizeFrame(frameId);
  if (!title && !subtitle) return;
  if (!['museum-mat', 'gallery-label', 'modern-gallery', 'illuminated', 'renaissance'].includes(frame)) return;
  const bottomStart = canvas.height - metrics.bottom;
  const centerX = canvas.width / 2;
  const maxWidth = canvas.width - metrics.left - metrics.right;
  let titleSize = Math.max(22, Math.round(canvas.width * .024));
  let subtitleSize = Math.max(14, Math.round(titleSize * .55));
  let titleY = bottomStart + metrics.bottom * .48;
  let titleFont = `italic ${titleSize}px Georgia, serif`;
  let subtitleFont = `${subtitleSize}px Arial, sans-serif`;
  let titleColor = '#2d261f', subtitleColor = '#6b5b49';

  if (frame === 'gallery-label') {
    titleSize = Math.max(24, Math.round(canvas.width * .026)); subtitleSize = Math.max(14, Math.round(titleSize * .52));
    titleY = bottomStart + metrics.bottom * .47; titleFont = `${titleSize}px Georgia, serif`; subtitleFont = `${subtitleSize}px Arial, sans-serif`;
  } else if (frame === 'modern-gallery') {
    titleFont = `${titleSize}px Arial, sans-serif`; subtitleFont = `${subtitleSize}px Arial, sans-serif`; titleColor = '#f0eee8'; subtitleColor = '#bdb8ad';
  } else if (frame === 'illuminated') {
    titleFont = `small-caps ${titleSize}px Georgia, serif`; subtitleFont = `italic ${subtitleSize}px Georgia, serif`; titleColor = '#5e3c2c'; subtitleColor = '#7b6547';
  } else if (frame === 'renaissance') {
    titleFont = `${titleSize}px Georgia, serif`; subtitleFont = `italic ${subtitleSize}px Georgia, serif`; titleColor = '#ead6ad'; subtitleColor = '#c1a77c';
  }

  ctx.textAlign = 'center';
  if (title) { ctx.fillStyle = titleColor; ctx.font = titleFont; ctx.fillText(title, centerX, titleY, maxWidth); }
  if (subtitle) { ctx.fillStyle = subtitleColor; ctx.font = subtitleFont; ctx.fillText(subtitle, centerX, titleY + (title ? titleSize * 1.32 : 0), maxWidth); }
}

async function renderBlob(srcOrImage, recipe = {}, max = 2800) {
  const normalized = normalizeRecipe(recipe);
  const img = typeof srcOrImage === 'string' ? await loadImage(srcOrImage) : srcOrImage;
  const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const imageW = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const imageH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const metrics = frameMetrics(normalized.frame, Math.min(imageW, imageH), Boolean(normalized.title || normalized.subtitle));
  const canvas = document.createElement('canvas');
  canvas.width = imageW + metrics.left + metrics.right;
  canvas.height = imageH + metrics.top + metrics.bottom;
  const ctx = canvas.getContext('2d', { alpha: false });
  drawFrameBackground(ctx, canvas, normalized.frame);
  drawPhoto(ctx, img, normalized.filter, metrics.left, metrics.top, imageW, imageH);
  drawFrameDetails(ctx, canvas, normalized.frame, metrics, imageW, imageH);
  drawCaption(ctx, canvas, normalized.frame, metrics, normalized.title, normalized.subtitle);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not render this photo.')), 'image/jpeg', .93));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open this photo.'));
    img.src = src;
  });
}

window.MarQrDarkroom = { LOOKS, FRAMES, normalizeLook, normalizeFrame, normalizeRecipe, renderBlob };
