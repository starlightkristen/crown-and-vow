PRAGMA foreign_keys = ON;

ALTER TABLE photos ADD COLUMN gallery_permission TEXT NOT NULL DEFAULT 'eligible' CHECK (gallery_permission IN ('eligible','just_between_us'));

CREATE INDEX IF NOT EXISTS idx_photos_gallery_permission ON photos(gallery_permission);

CREATE TRIGGER IF NOT EXISTS prevent_private_gallery_approval
BEFORE UPDATE OF gallery_status ON photos
WHEN NEW.gallery_status = 'approved' AND NEW.gallery_permission = 'just_between_us'
BEGIN
  SELECT RAISE(ABORT, 'Guest marked this photo Just between us');
END;

CREATE TRIGGER IF NOT EXISTS remove_private_photo_from_gallery
AFTER UPDATE OF gallery_permission ON photos
WHEN NEW.gallery_permission = 'just_between_us' AND NEW.gallery_status = 'approved'
BEGIN
  UPDATE photos SET gallery_status = 'private' WHERE id = NEW.id;
END;
