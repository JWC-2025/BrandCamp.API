-- Migration: Create audit_requests table
-- Date: 2025-08-15

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS audit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url VARCHAR(2048) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    include_screenshot BOOLEAN DEFAULT false,
    format VARCHAR(20) DEFAULT 'json',
    google_drive_url VARCHAR(2048),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    request_data JSONB,
    result_data JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_requests_status ON audit_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_requests_created_at ON audit_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_requests_url ON audit_requests(url);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_audit_requests_updated_at ON audit_requests;
CREATE TRIGGER update_audit_requests_updated_at 
    BEFORE UPDATE ON audit_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();