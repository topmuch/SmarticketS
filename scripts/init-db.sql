-- ============================================
-- SmartTicketQR — Database Initialization Script
-- Run automatically when PostgreSQL container starts for the first time
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE smartticketqr_prod TO smartticketqr;
