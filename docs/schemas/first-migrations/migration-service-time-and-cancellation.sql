-- Migration: Add service_time field and update service_status enum for cancellation
-- Date: 2025-01-13
-- Description: Adds service_time field to store time separately from service_date, and updates service_status enum to include 'cancelled'

-- Step 1: Add service_time field to services table
ALTER TABLE services 
ADD COLUMN service_time TIME;

-- Step 2: Update existing services to extract time from service_date into service_time
UPDATE services 
SET service_time = service_date::TIME
WHERE service_time IS NULL;

-- Step 3: Make service_time NOT NULL after populating existing data
ALTER TABLE services 
ALTER COLUMN service_time SET NOT NULL;

-- Step 4: Update service_date to store only date (remove time component)
-- First, update service_date to date-only format
UPDATE services 
SET service_date = service_date::DATE;

-- Step 5: Update service_status enum to include 'cancelled' option
-- Note: In PostgreSQL, we need to add the new enum value
ALTER TYPE service_status ADD VALUE 'cancelled';

-- Step 6: Create index on service_time for performance
CREATE INDEX idx_services_time ON services (service_time);

-- Step 7: Create composite index on service_date and service_time
CREATE INDEX idx_services_date_time ON services (service_date, service_time);

-- Step 8: Add comment to document the change
COMMENT ON COLUMN services.service_time IS 'Time component of the service, stored separately from service_date for better querying';
COMMENT ON COLUMN services.service_date IS 'Date component of the service, time is stored in service_time column';

-- Step 9: Update any views or functions that depend on service_date to handle the new structure
-- (Add specific view updates here if any exist)

-- Verification queries (run these to verify the migration worked):
-- SELECT service_date, service_time, service_date + service_time AS combined_datetime FROM services LIMIT 5;
-- SELECT DISTINCT status FROM services;
