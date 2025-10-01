-- Migration: Update google_drive_url column to blob_url
-- Date: 2025-08-24

-- Add new blob_url column
ALTER TABLE audit_requests 
ADD COLUMN IF NOT EXISTS blob_url VARCHAR(2048);

-- Copy existing data from google_drive_url to blob_url (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'audit_requests' AND column_name = 'google_drive_url') THEN
    UPDATE audit_requests 
    SET blob_url = google_drive_url 
    WHERE google_drive_url IS NOT NULL;
  END IF;
END $$;

-- Drop old google_drive_url column
ALTER TABLE audit_requests 
DROP COLUMN IF EXISTS google_drive_url;