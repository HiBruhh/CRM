-- Add activation token columns to students table for email confirmation flow
ALTER TABLE students
ADD COLUMN IF NOT EXISTS activation_token TEXT,
ADD COLUMN IF NOT EXISTS activation_token_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_students_activation_token ON students(activation_token);
