const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_DEVELOPED_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const DEVELOPED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const GALLERY_STATUSES = new Set(["private", "approved", "hidden"]);
const GALLERY_PERMISSIONS = new Set(["eligible", "just_between_us"]);
const FILTERS = new Set(["original", "warm", "soft", "mono", "faded", "night", "candlelight", "gallery", "film", "noir", "old-master"]);
const FRAMES = new Set(["none", "ivory", "black", "instant", "museum", "museum-mat", "gallery-label", "gilded", "modern-gallery", "illuminated", "renaissance"]);

const CAMERAS = {
  "canon-ae1": { name: "The Minstrel", shortName: "Minstrel", icon: "/icons/canon-ae1.svg", theme: "#171513" },
  "olympus-trip-35": { name: "The Wanderer", shortName: "Wanderer", icon: "/icons/olympus-trip-35.svg", theme: "#292623" },
  "polaroid-sx70": { name: "The Alchemist", shortName: "Alchemist", icon: "/icons/polaroid-sx70.svg", theme: "#1b1714" },
  "kodak-instamatic-104": { name: "The Jester", shortName: "Jester", icon: "/icons/kodak-instamatic-104.svg", theme: "#1d1c1a" },
  "nikon-f3": { name: "The Archivist", shortName: "Archivist", icon: "/icons/nikon-f3.svg", theme: "#11110f" },
  "pentax-k1000": { name: "The Courtier", shortName: "Courtier", icon: "/icons/pentax-k1000.svg", theme: "#1b1917" },
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/manifest.webmanifest") return manifestResponse(url);
      if (path === "/api/health" && request.method === "GET") return json({ ok: true, service: "marqrcam" });
      if (path === "/api/event-state" && request.method === "GET") return eventState(env);
      if (path === "/api/guests" && request.method === "GET") return guestLookup(url, env);
      if (path === "/api/sessions" && request.method === "POST") return createSession(request, env);
      if (path === "/api/sessions/claim" && request.method === "POST") return createSessionFromClaimLink(request, env);
      if (path === "/api/plus-one" && request.method === "GET") return plusOneStatus(request, env);
      if (path === "/api/plus-one" && request.method === "POST") return registerPlusOne(request, env);
      if (path === "/api/photos" && request.method === "POST") return uploadPhoto(request, url, env);
      if (/^\/api\/photos\/[^/]+\/developed$/.test(path) && request.method === "POST") return saveDevelopedPhoto(request, url, env);
      if (/^\/api\/photos\/[^/]+\/privacy$/.test(path) && request.method === "PATCH") return updateGalleryPermission(request, url, env);
      if (path.startsWith("/api/photos/") && request.method === "DELETE") return deleteOwnPhoto(request, url, env);
      if (path === "/api/my-roll" && request.method === "GET") return myRoll(request, env);
      if (path === "/api/gallery" && request.method === "GET") return galleryList(env);
      if (path.startsWith("/api/gallery/photos/") && request.method === "GET") return galleryPhoto(url, env);

      if (path === "/api/admin/auth" && request.method === "POST") return adminAuth(request, env);
      if (path === "/api/admin/overview" && request.method === "GET") return adminOverview(request, env);
      if (path === "/api/admin/guests" && request.method === "GET") return adminGuests(request, env);
      if (path === "/api/admin/sessions" && request.method === "GET") return adminSessions(request, env);
      if (path === "/api/admin/photos" && request.method === "GET") return adminPhotos(request, url, env);
      if (/^\/api\/admin\/photos\/[^/]+$/.test(path) && request.method === "PATCH") return adminUpdatePhoto(request, url, env);
      if (/^\/api\/admin\/photos\/[^/]+$/.test(path) && request.method === "DELETE") return adminDeletePhoto(request, url, env);
      if (path === "/api/admin/event" && request.method === "PATCH") return adminUpdateEvent(request, env);
      if (path === "/api/admin/export.csv" && request.method === "GET") return adminExportCsv(request, env);
      if (path === "/api/admin/claim-links" && request.method === "POST") return adminGenerateClaimLinks(request, env);
      if (path === "/api/admin/claim-links/reissue" && request.method === "POST") return adminReissueClaimLink(request, env);
      if (path.startsWith("/api/admin/download/") && request.method === "GET") return adminDownload(request, url, env);

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({ event: "unhandled_error", message: error instanceof Error ? error.message : String(error) }));
      return json({ error: "Something went wrong." }, 500);
    }
  },
};

async function eventState(env) {
  const state = await getEventState(env);
  return json(state);
}

async function getEventState(env) {
  const row = await env.DB.prepare(`SELECT capture_enabled AS captureEnabled, gallery_enabled AS galleryEnabled, ceremony_message AS message, updated_at AS updatedAt FROM event_settings WHERE id='wedding' LIMIT 1`).first();
  return {
    captureEnabled: row ? Boolean(row.captureEnabled) : true,
    galleryEnabled: row ? Boolean(row.galleryEnabled) : true,
    message: row?.message || "The cameras are resting during the ceremony.",
    updatedAt: row?.updatedAt || null,
  };
}

async function guestLookup(url, env) {
  const raw = (url.searchParams.get("lastName") || "").trim();
  if (raw.length < 2 || raw.length > 80) return json({ error: "Enter at least two letters of your name." }, 400);
  const result = await env.DB.prepare(`SELECT id, first_name AS firstName, last_name AS lastName, guest_type AS guestType FROM guests WHERE normalized_last_name=?1 AND active=1 ORDER BY first_name COLLATE NOCASE`).bind(normalizeName(raw)).all();
  return json({ guests: result.results || [] });
}

async function createSession(request, env) {
  const body = await request.json().catch(() => null);
  const guestId = body?.guestId;
  const cameraModel = body?.cameraModel;
  if (typeof guestId !== "string" || !CAMERAS[cameraModel]) return json({ error: "Choose an invited guest and camera." }, 400);
  const guest = await env.DB.prepare(`SELECT g.id, g.first_name AS firstName, g.last_name AS lastName, g.household_id AS householdId FROM guests g WHERE g.id=?1 AND g.active=1 LIMIT 1`).bind(guestId).first();
  if (!guest) return json({ error: "Guest not found." }, 404);
  const { sessionId, token } = await createGuestSession(env, guestId, cameraModel);
  return json({ sessionId, token, guest, camera: { id: cameraModel, ...CAMERAS[cameraModel] } }, 201);
}

async function createSessionFromClaimLink(request, env) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (code.length < 20) return json({ error: "This camera link is not valid." }, 400);
  const codeHash = await sha256Hex(code);
  const row = await env.DB.prepare(`
    SELECT l.id,l.guest_id AS guestId,l.camera_model AS cameraModel,l.max_uses AS maxUses,l.use_count AS useCount,l.expires_at AS expiresAt,l.revoked_at AS revokedAt,
           g.first_name AS firstName,g.last_name AS lastName,g.household_id AS householdId
      FROM guest_claim_links l
      JOIN guests g ON g.id=l.guest_id
     WHERE l.code_hash=?1 AND g.active=1
     LIMIT 1`).bind(codeHash).first();
  if (!row) return json({ error: "That camera link is no longer available. Use the fallback QR at check-in." }, 404);
  if (row.revokedAt) return json({ error: "That camera link has been replaced. Ask for a fresh code at check-in." }, 409);
  if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return json({ error: "That camera link expired. Use the fallback QR at check-in." }, 409);

  const useResult = await env.DB.prepare(`
    UPDATE guest_claim_links
       SET use_count=use_count+1,last_used_at=CURRENT_TIMESTAMP
     WHERE id=?1
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       AND use_count < max_uses`).bind(row.id).run();
  if (!useResult.meta?.changes) return json({ error: "That camera link has already been used. Ask for a fresh code at check-in." }, 409);

  const { sessionId, token } = await createGuestSession(env, row.guestId, row.cameraModel);
  const guest = { id: row.guestId, firstName: row.firstName, lastName: row.lastName, householdId: row.householdId };
  return json({ sessionId, token, guest, camera: { id: row.cameraModel, ...CAMERAS[row.cameraModel] } }, 201);
}

async function plusOneStatus(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired." }, 401);
  const household = await env.DB.prepare(`SELECT h.id, h.unnamed_guest_slots AS totalSlots FROM households h JOIN guests g ON g.household_id=h.id WHERE g.id=?1 LIMIT 1`).bind(session.guest_id).first();
  if (!household) return json({ totalSlots: 0, usedSlots: 0, remainingSlots: 0, guests: [] });
  const registered = await env.DB.prepare(`SELECT r.guest_id AS guestId, r.first_name AS firstName, r.last_name AS lastName, r.slot_index AS slotIndex FROM registered_plus_ones r WHERE r.household_id=?1 ORDER BY r.slot_index`).bind(household.id).all();
  const usedSlots = registered.results?.length || 0;
  return json({ totalSlots: household.totalSlots, usedSlots, remainingSlots: Math.max(0, household.totalSlots - usedSlots), guests: registered.results || [] });
}

async function registerPlusOne(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired." }, 401);
  const body = await request.json().catch(() => null);
  const firstName = cleanName(body?.firstName);
  const lastName = cleanName(body?.lastName);
  if (!firstName || !lastName) return json({ error: "Enter your guest’s first and last name." }, 400);

  const household = await env.DB.prepare(`SELECT h.id, h.unnamed_guest_slots AS totalSlots FROM households h JOIN guests g ON g.household_id=h.id WHERE g.id=?1 LIMIT 1`).bind(session.guest_id).first();
  if (!household || household.totalSlots < 1) return json({ error: "This invitation does not have an open guest slot." }, 409);
  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS used FROM registered_plus_ones WHERE household_id=?1`).bind(household.id).first();
  const used = Number(countRow?.used || 0);
  if (used >= household.totalSlots) return json({ error: "All guest slots on this invitation are already registered." }, 409);

  const guestId = crypto.randomUUID();
  const registrationId = crypto.randomUUID();
  const slotIndex = used + 1;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO guests (id,household_id,first_name,last_name,normalized_last_name,guest_type,active) VALUES (?1,?2,?3,?4,?5,'plus_one',1)`).bind(guestId, household.id, firstName, lastName, normalizeName(lastName)),
    env.DB.prepare(`INSERT INTO registered_plus_ones (id,household_id,first_name,last_name,normalized_last_name,sponsor_guest_id,guest_id,slot_index) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`).bind(registrationId, household.id, firstName, lastName, normalizeName(lastName), session.guest_id, guestId, slotIndex),
  ]);
  return json({ guest: { id: guestId, firstName, lastName, guestType: "plus_one" }, remainingSlots: Math.max(0, household.totalSlots - slotIndex) }, 201);
}

async function uploadPhoto(request, url, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired. Check in again." }, 401);
  const state = await getEventState(env);
  if (!state.captureEnabled) return json({ error: state.message, paused: true }, 423);

  const contentType = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) return json({ error: "That photo format is not supported." }, 415);
  const statedLength = Number(request.headers.get("content-length") || 0);
  if (statedLength && statedLength > MAX_UPLOAD_BYTES) return json({ error: "Photo is too large." }, 413);
  if (!request.body) return json({ error: "Photo body is missing." }, 400);

  const clientRoll = clampInt(url.searchParams.get("roll"), 1, 9999, 1);
  const clientExposure = clampInt(url.searchParams.get("exposure"), 1, 36, 1);
  const frame = ((clientRoll - 1) * 36) + clientExposure;
  const capturedAt = validIso(url.searchParams.get("capturedAt"));
  const extension = extensionFor(contentType);
  const photoId = crypto.randomUUID();
  const key = `bachelorette/last-knight-out-2026/originals/${session.guest_id}/${session.id}/personal-roll/${String(frame).padStart(4, "0")}-${photoId}.${extension}`;

  let stored;
  try {
    stored = await env.PHOTOS.put(key, request.body, {
      httpMetadata: { contentType },
      customMetadata: { photoId, guestId: session.guest_id, sessionId: session.id, cameraModel: session.camera_model, frame: String(frame) },
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "r2_upload_failed", photoId, message: error instanceof Error ? error.message : String(error) }));
    return json({ error: "Upload did not finish. The camera will retry." }, 503);
  }
  if (!stored) return json({ error: "Upload did not finish. The camera will retry." }, 503);
  if (stored.size > MAX_UPLOAD_BYTES) {
    await env.PHOTOS.delete(key);
    return json({ error: "Photo is too large." }, 413);
  }

  try {
    await env.DB.prepare(`INSERT INTO photos (id,guest_id,session_id,r2_original_key,mime_type,size_bytes,camera_model,roll_number,exposure_number,captured_at) VALUES (?1,?2,?3,?4,?5,?6,?7,1,?8,?9)`).bind(photoId, session.guest_id, session.id, key, contentType, stored.size, session.camera_model, frame, capturedAt).run();
  } catch (error) {
    await env.PHOTOS.delete(key);
    throw error;
  }
  await env.DB.prepare(`UPDATE guest_sessions SET last_seen_at=CURRENT_TIMESTAMP,current_roll=1 WHERE id=?1`).bind(session.id).run();
  return json({ id: photoId, safe: true, exposure: frame, uploadedAt: new Date().toISOString(), galleryPermission: "eligible" }, 201);
}

async function saveDevelopedPhoto(request, url, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired." }, 401);
  const photoId = decodeURIComponent(url.pathname.split("/")[3] || "");
  const photo = await env.DB.prepare(`SELECT id,session_id AS originalSessionId,r2_developed_key AS developedKey FROM photos WHERE id=?1 AND guest_id=?2 LIMIT 1`).bind(photoId, session.guest_id).first();
  if (!photo) return json({ error: "Photo not found." }, 404);
  const contentType = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!DEVELOPED_IMAGE_TYPES.has(contentType)) return json({ error: "Developed photo must be JPEG, PNG, or WebP." }, 415);
  const statedLength = Number(request.headers.get("content-length") || 0);
  if (statedLength && statedLength > MAX_DEVELOPED_BYTES) return json({ error: "Developed photo is too large." }, 413);
  if (!request.body) return json({ error: "Developed photo body is missing." }, 400);

  const recipe = parseEditRecipe(request.headers.get("x-edit-recipe"));
  if (!recipe) return json({ error: "Invalid darkroom settings." }, 400);
  const extension = extensionFor(contentType);
  const key = `bachelorette/last-knight-out-2026/developed/${session.guest_id}/${photo.originalSessionId}/${photoId}.${extension}`;
  const stored = await env.PHOTOS.put(key, request.body, { httpMetadata: { contentType }, customMetadata: { photoId, guestId: session.guest_id, sessionId: photo.originalSessionId, kind: "developed" } });
  if (!stored || stored.size > MAX_DEVELOPED_BYTES) {
    await env.PHOTOS.delete(key);
    return json({ error: "Developed photo did not save." }, 413);
  }
  if (photo.developedKey && photo.developedKey !== key) await env.PHOTOS.delete(photo.developedKey);
  await env.DB.prepare(`UPDATE photos SET edit_status='edited', edit_recipe=?1, r2_developed_key=?2 WHERE id=?3 AND guest_id=?4`).bind(JSON.stringify(recipe), key, photoId, session.guest_id).run();
  return json({ saved: true, id: photoId, recipe });
}

async function updateGalleryPermission(request, url, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired." }, 401);
  const photoId = decodeURIComponent(url.pathname.split("/")[3] || "");
  const body = await request.json().catch(() => null);
  const permission = body?.galleryPermission;
  if (!GALLERY_PERMISSIONS.has(permission)) return json({ error: "Choose a valid gallery permission." }, 400);
  const photo = await env.DB.prepare(`SELECT id,gallery_status AS galleryStatus FROM photos WHERE id=?1 AND guest_id=?2 LIMIT 1`).bind(photoId, session.guest_id).first();
  if (!photo) return json({ error: "Photo not found." }, 404);
  const nextStatus = permission === "just_between_us" && photo.galleryStatus === "approved" ? "private" : photo.galleryStatus;
  await env.DB.prepare(`UPDATE photos SET gallery_permission=?1,gallery_status=?2 WHERE id=?3 AND guest_id=?4`).bind(permission, nextStatus, photoId, session.guest_id).run();
  return json({ updated: true, id: photoId, galleryPermission: permission, galleryStatus: nextStatus });
}

async function deleteOwnPhoto(request, url, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired." }, 401);
  const photoId = decodeURIComponent(url.pathname.slice("/api/photos/".length));
  if (!photoId || photoId.includes("/")) return json({ error: "Photo not found." }, 404);
  const photo = await env.DB.prepare(`SELECT id,r2_original_key AS originalKey,r2_developed_key AS developedKey FROM photos WHERE id=?1 AND guest_id=?2 LIMIT 1`).bind(photoId, session.guest_id).first();
  if (!photo) return json({ error: "Photo not found." }, 404);
  await deletePhotoObjects(photo, env);
  await env.DB.prepare(`DELETE FROM photos WHERE id=?1 AND guest_id=?2`).bind(photoId, session.guest_id).run();
  return json({ deleted: true, id: photoId });
}

async function myRoll(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: "Camera session expired." }, 401);
  const result = await env.DB.prepare(`SELECT id,session_id AS sessionId,exposure_number AS exposure,captured_at AS capturedAt,uploaded_at AS uploadedAt,edit_status AS editStatus,gallery_status AS galleryStatus,gallery_permission AS galleryPermission,edit_recipe AS editRecipe,r2_developed_key IS NOT NULL AS hasDeveloped FROM photos WHERE guest_id=?1 ORDER BY COALESCE(captured_at,uploaded_at) DESC,uploaded_at DESC LIMIT 500`).bind(session.guest_id).all();
  return json({ photos: (result.results || []).map((row) => ({ ...row, hasDeveloped: Boolean(row.hasDeveloped), editRecipe: parseJson(row.editRecipe) })) });
}

async function galleryList(env) {
  const state = await getEventState(env);
  if (!state.galleryEnabled) return json({ enabled: false, photos: [] });
  const result = await env.DB.prepare(`SELECT p.id,p.exposure_number AS exposure,p.captured_at AS capturedAt,p.camera_model AS cameraModel,p.r2_developed_key IS NOT NULL AS hasDeveloped,g.first_name AS firstName FROM photos p JOIN guests g ON g.id=p.guest_id WHERE p.gallery_status='approved' AND p.gallery_permission='eligible' ORDER BY COALESCE(p.captured_at,p.uploaded_at) DESC LIMIT 500`).all();
  return json({ enabled: true, photos: (result.results || []).map((row) => ({ ...row, hasDeveloped: Boolean(row.hasDeveloped), imageUrl: `/api/gallery/photos/${encodeURIComponent(row.id)}` })) });
}

async function galleryPhoto(url, env) {
  const state = await getEventState(env);
  if (!state.galleryEnabled) return new Response("Gallery unavailable", { status: 404 });
  const photoId = decodeURIComponent(url.pathname.slice("/api/gallery/photos/".length));
  const photo = await env.DB.prepare(`SELECT r2_original_key AS originalKey,r2_developed_key AS developedKey FROM photos WHERE id=?1 AND gallery_status='approved' AND gallery_permission='eligible' LIMIT 1`).bind(photoId).first();
  if (!photo) return new Response("Not found", { status: 404 });
  return r2Response(env, photo.developedKey || photo.originalKey, "public, max-age=60");
}

async function adminAuth(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ ok: false, error: "Invalid admin key." }, 401);
  return json({ ok: true });
}

async function adminOverview(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const [state, counts, recent] = await Promise.all([
    getEventState(env),
    env.DB.prepare(`SELECT (SELECT COUNT(*) FROM photos) AS photos,(SELECT COUNT(*) FROM guest_sessions WHERE revoked_at IS NULL) AS sessions,(SELECT COUNT(DISTINCT guest_id) FROM guest_sessions WHERE revoked_at IS NULL) AS guests,(SELECT COUNT(*) FROM photos WHERE gallery_status='approved' AND gallery_permission='eligible') AS approved,(SELECT COUNT(*) FROM photos WHERE edit_status='edited') AS edited,(SELECT COUNT(*) FROM photos WHERE gallery_permission='just_between_us') AS justBetweenUs`).first(),
    env.DB.prepare(`SELECT p.id,p.exposure_number AS exposure,p.uploaded_at AS uploadedAt,p.gallery_status AS galleryStatus,p.gallery_permission AS galleryPermission,p.edit_status AS editStatus,p.camera_model AS cameraModel,g.first_name AS firstName,g.last_name AS lastName FROM photos p JOIN guests g ON g.id=p.guest_id ORDER BY p.uploaded_at DESC LIMIT 12`).all(),
  ]);
  return json({ state, counts: counts || {}, recent: recent.results || [] });
}

async function adminGuests(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const result = await env.DB.prepare(`
    SELECT g.id,g.first_name AS firstName,g.last_name AS lastName,g.guest_type AS guestType,
           COUNT(s.id) AS sessionCount,MAX(s.last_seen_at) AS lastSeenAt,
           (SELECT COUNT(*) FROM photos p WHERE p.guest_id=g.id) AS photoCount,
           (SELECT s2.camera_model FROM guest_sessions s2 WHERE s2.guest_id=g.id AND s2.revoked_at IS NULL ORDER BY s2.last_seen_at DESC LIMIT 1) AS latestCamera
      FROM guests g
      JOIN guest_sessions s ON s.guest_id=g.id AND s.revoked_at IS NULL
     GROUP BY g.id,g.first_name,g.last_name,g.guest_type
     ORDER BY MAX(s.last_seen_at) DESC,g.last_name COLLATE NOCASE,g.first_name COLLATE NOCASE
     LIMIT 500`).all();
  return json({ guests: result.results || [] });
}

async function adminSessions(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const result = await env.DB.prepare(`
    SELECT s.id,s.camera_model AS cameraModel,s.created_at AS createdAt,s.last_seen_at AS lastSeenAt,
           g.id AS guestId,g.first_name AS firstName,g.last_name AS lastName,
           (SELECT COUNT(*) FROM photos p WHERE p.session_id=s.id) AS photoCount
      FROM guest_sessions s
      JOIN guests g ON g.id=s.guest_id
     WHERE s.revoked_at IS NULL
     ORDER BY s.last_seen_at DESC
     LIMIT 500`).all();
  return json({ sessions: result.results || [] });
}

async function adminPhotos(request, url, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const status = url.searchParams.get("status");
  const where = GALLERY_STATUSES.has(status) ? "WHERE p.gallery_status=?1" : "";
  const stmt = env.DB.prepare(`SELECT p.id,p.exposure_number AS exposure,p.captured_at AS capturedAt,p.uploaded_at AS uploadedAt,p.gallery_status AS galleryStatus,p.gallery_permission AS galleryPermission,p.edit_status AS editStatus,p.camera_model AS cameraModel,p.r2_developed_key IS NOT NULL AS hasDeveloped,g.first_name AS firstName,g.last_name AS lastName FROM photos p JOIN guests g ON g.id=p.guest_id ${where} ORDER BY p.uploaded_at DESC LIMIT 500`);
  const result = GALLERY_STATUSES.has(status) ? await stmt.bind(status).all() : await stmt.all();
  return json({ photos: (result.results || []).map((row) => ({ ...row, hasDeveloped: Boolean(row.hasDeveloped) })) });
}

async function adminUpdatePhoto(request, url, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const photoId = decodeURIComponent(url.pathname.slice("/api/admin/photos/".length));
  const body = await request.json().catch(() => null);
  if (!GALLERY_STATUSES.has(body?.galleryStatus)) return json({ error: "Invalid gallery status." }, 400);
  const photo = await env.DB.prepare(`SELECT id,gallery_permission AS galleryPermission FROM photos WHERE id=?1 LIMIT 1`).bind(photoId).first();
  if (!photo) return json({ error: "Photo not found." }, 404);
  if (body.galleryStatus === "approved" && photo.galleryPermission === "just_between_us") {
    return json({ error: "This guest marked the photo Just between us. It cannot be added to the public gallery.", galleryPermission: photo.galleryPermission }, 409);
  }
  const result = await env.DB.prepare(`UPDATE photos SET gallery_status=?1 WHERE id=?2`).bind(body.galleryStatus, photoId).run();
  if (!result.meta?.changes) return json({ error: "Photo not found." }, 404);
  return json({ updated: true, id: photoId, galleryStatus: body.galleryStatus, galleryPermission: photo.galleryPermission });
}

async function adminDeletePhoto(request, url, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const photoId = decodeURIComponent(url.pathname.slice("/api/admin/photos/".length));
  const photo = await env.DB.prepare(`SELECT id,r2_original_key AS originalKey,r2_developed_key AS developedKey FROM photos WHERE id=?1 LIMIT 1`).bind(photoId).first();
  if (!photo) return json({ error: "Photo not found." }, 404);
  await deletePhotoObjects(photo, env);
  await env.DB.prepare(`DELETE FROM photos WHERE id=?1`).bind(photoId).run();
  return json({ deleted: true, id: photoId });
}

async function adminUpdateEvent(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const body = await request.json().catch(() => null);
  const current = await getEventState(env);
  const captureEnabled = typeof body?.captureEnabled === "boolean" ? body.captureEnabled : current.captureEnabled;
  const galleryEnabled = typeof body?.galleryEnabled === "boolean" ? body.galleryEnabled : current.galleryEnabled;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 240) : current.message;
  await env.DB.prepare(`UPDATE event_settings SET capture_enabled=?1,gallery_enabled=?2,ceremony_message=?3,updated_at=CURRENT_TIMESTAMP WHERE id='wedding'`).bind(captureEnabled ? 1 : 0, galleryEnabled ? 1 : 0, message).run();
  return json(await getEventState(env));
}

async function adminExportCsv(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const result = await env.DB.prepare(`SELECT p.id,p.exposure_number AS frame,p.camera_model,p.mime_type,p.size_bytes,p.captured_at,p.uploaded_at,p.edit_status,p.gallery_status,p.gallery_permission,g.first_name,g.last_name FROM photos p JOIN guests g ON g.id=p.guest_id ORDER BY p.uploaded_at`).all();
  const headers = ["photo_id","frame","camera","mime_type","size_bytes","captured_at","uploaded_at","edit_status","gallery_status","gallery_permission","first_name","last_name"];
  const rows = (result.results || []).map((r) => [r.id,r.frame,r.camera_model,r.mime_type,r.size_bytes,r.captured_at,r.uploaded_at,r.edit_status,r.gallery_status,r.gallery_permission,r.first_name,r.last_name]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="last-knight-out-photo-manifest.csv"`, "cache-control": "no-store" } });
}

async function adminGenerateClaimLinks(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const body = await request.json().catch(() => null);
  const maxUses = clampInt(body?.maxUses, 1, 5, 1);
  const expiresAt = validIso(body?.expiresAt) || defaultClaimExpiry();
  const guests = await env.DB.prepare(`
    SELECT g.id,g.first_name AS firstName,g.last_name AS lastName,
           COALESCE((SELECT s.camera_model FROM guest_sessions s WHERE s.guest_id=g.id ORDER BY s.last_seen_at DESC LIMIT 1), 'canon-ae1') AS cameraModel
      FROM guests g
     WHERE g.active=1
     ORDER BY g.last_name COLLATE NOCASE,g.first_name COLLATE NOCASE
     LIMIT 1200`).all();
  const links = [];
  for (const guest of guests.results || []) links.push(await getOrCreateClaimLinkForGuest(env, guest, { maxUses, expiresAt, forceNew: true }));
  return json({ generated: links.length, fallbackUrl: "/", links });
}

async function adminReissueClaimLink(request, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const body = await request.json().catch(() => null);
  const guestId = body?.guestId;
  const cameraModel = CAMERAS[body?.cameraModel] ? body.cameraModel : "canon-ae1";
  const maxUses = clampInt(body?.maxUses, 1, 5, 1);
  const expiresAt = validIso(body?.expiresAt) || defaultClaimExpiry();
  if (typeof guestId !== "string") return json({ error: "Guest is required." }, 400);
  const guest = await env.DB.prepare(`SELECT id,first_name AS firstName,last_name AS lastName FROM guests WHERE id=?1 AND active=1 LIMIT 1`).bind(guestId).first();
  if (!guest) return json({ error: "Guest not found." }, 404);
  const link = await getOrCreateClaimLinkForGuest(env, { ...guest, cameraModel }, { maxUses, expiresAt, forceNew: true });
  return json({ reissued: true, link });
}

async function adminDownload(request, url, env) {
  if (!(await adminAuthorized(request, env))) return json({ error: "Unauthorized." }, 401);
  const photoId = decodeURIComponent(url.pathname.slice("/api/admin/download/".length));
  const variant = url.searchParams.get("variant") === "developed" ? "developed" : "original";
  const photo = await env.DB.prepare(`SELECT r2_original_key AS originalKey,r2_developed_key AS developedKey FROM photos WHERE id=?1 LIMIT 1`).bind(photoId).first();
  if (!photo) return new Response("Not found", { status: 404 });
  const key = variant === "developed" && photo.developedKey ? photo.developedKey : photo.originalKey;
  return r2Response(env, key, "private, no-store", `attachment; filename="${photoId}-${variant}.${extensionFromKey(key)}"`);
}

async function authenticate(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (token.length < 20) return null;
  return env.DB.prepare(`SELECT id,guest_id,camera_model FROM guest_sessions WHERE session_token_hash=?1 AND revoked_at IS NULL LIMIT 1`).bind(await sha256Hex(token)).first();
}

async function adminAuthorized(request, env) {
  const supplied = request.headers.get("x-admin-token") || "";
  const expected = env.ADMIN_TOKEN || "";
  if (supplied.length < 24 || expected.length < 24) return false;
  return (await sha256Hex(supplied)) === (await sha256Hex(expected));
}

async function deletePhotoObjects(photo, env) {
  const keys = [photo.originalKey, photo.developedKey].filter(Boolean);
  if (keys.length) await Promise.all(keys.map((key) => env.PHOTOS.delete(key)));
}

async function r2Response(env, key, cacheControl, contentDisposition = null) {
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", cacheControl);
  if (contentDisposition) headers.set("content-disposition", contentDisposition);
  return new Response(object.body, { headers });
}

async function createGuestSession(env, guestId, cameraModel) {
  const sessionId = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare(`INSERT INTO guest_sessions (id,guest_id,session_token_hash,camera_model) VALUES (?1,?2,?3,?4)`).bind(sessionId, guestId, tokenHash, cameraModel).run();
  return { sessionId, token };
}

async function getOrCreateClaimLinkForGuest(env, guest, options = {}) {
  const forceNew = Boolean(options.forceNew);
  const cameraModel = CAMERAS[guest.cameraModel] ? guest.cameraModel : "canon-ae1";
  const maxUses = clampInt(options.maxUses, 1, 5, 1);
  const expiresAt = validIso(options.expiresAt) || defaultClaimExpiry();
  if (forceNew) await env.DB.prepare(`UPDATE guest_claim_links SET revoked_at=CURRENT_TIMESTAMP WHERE guest_id=?1 AND revoked_at IS NULL`).bind(guest.id).run();
  const code = randomToken();
  const codeHash = await sha256Hex(code);
  await env.DB.prepare(`INSERT INTO guest_claim_links (id,guest_id,code_hash,camera_model,max_uses,expires_at) VALUES (?1,?2,?3,?4,?5,?6)`).bind(crypto.randomUUID(), guest.id, codeHash, cameraModel, maxUses, expiresAt).run();
  return {
    guestId: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    cameraModel,
    maxUses,
    expiresAt,
    claimCode: code,
    claimPath: `/?claim=${encodeURIComponent(code)}`,
  };
}

function defaultClaimExpiry() {
  return new Date("2026-09-22T12:00:00.000Z").toISOString();
}

function parseEditRecipe(value) {
  if (!value || value.length > 2400) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(value));
    const filter = FILTERS.has(raw?.filter) ? raw.filter : null;
    const frame = FRAMES.has(raw?.frame) ? raw.frame : null;
    const title = typeof raw?.title === "string" ? raw.title.trim().slice(0, 50) : "";
    const subtitle = typeof raw?.subtitle === "string" ? raw.subtitle.trim().slice(0, 80) : "";
    if (!filter || !frame) return null;
    return { filter, frame, title, subtitle };
  } catch {
    return null;
  }
}

function manifestResponse(url) {
  const cameraId = CAMERAS[url.searchParams.get("camera")] ? url.searchParams.get("camera") : "canon-ae1";
  const camera = CAMERAS[cameraId];
  return new Response(JSON.stringify({
    id: `/?camera=${cameraId}`,
    name: `Last Knight Out Camera — ${camera.name}`,
    short_name: camera.shortName,
    start_url: `/?camera=${cameraId}`,
    scope: "/",
    display: "standalone",
    background_color: "#f2eadc",
    theme_color: camera.theme,
    description: "Strike a pose, good knight. Last Knight Out · Sept 18–21, 2026",
    icons: [{ src: camera.icon, sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  }), { headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "no-store" } });
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function normalizeName(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9'-]/g, "");
}

function cleanName(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return /^[\p{L}\p{M}.' -]+$/u.test(cleaned) ? cleaned : "";
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function validIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extensionFor(contentType) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" })[contentType] || "img";
}

function extensionFromKey(key) {
  const match = String(key).match(/\.([a-z0-9]+)$/i);
  return match ? match[1] : "img";
}

function parseJson(value) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}