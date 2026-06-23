-- Add dismissed column to notifications table
ALTER TABLE notifications ADD COLUMN dismissed BOOLEAN DEFAULT FALSE;

-- Update existing notifications to set dismissed = false (default)
UPDATE notifications SET dismissed = FALSE WHERE dismissed IS NULL;

-- Add check constraint to ensure dismissed is not null
ALTER TABLE notifications ALTER COLUMN dismissed SET NOT NULL;
