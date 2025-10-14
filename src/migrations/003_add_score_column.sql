-- Migration: Add score column to audit_requests table
-- Date: 2025-10-13

ALTER TABLE audit_requests 
ADD COLUMN IF NOT EXISTS score INTEGER;