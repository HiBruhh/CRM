-- Create user notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- App notification settings
    lesson_created_app BOOLEAN DEFAULT true,
    lesson_updated_app BOOLEAN DEFAULT true,
    lesson_cancelled_app BOOLEAN DEFAULT true,
    lesson_completed_app BOOLEAN DEFAULT true,
    lesson_deleted_app BOOLEAN DEFAULT true,
    student_assigned_app BOOLEAN DEFAULT true,
    student_removed_app BOOLEAN DEFAULT true,
    instructor_created_app BOOLEAN DEFAULT true,
    instructor_updated_app BOOLEAN DEFAULT true,
    instructor_removed_app BOOLEAN DEFAULT true,
    checklist_completed_app BOOLEAN DEFAULT true,
    checklist_overdue_app BOOLEAN DEFAULT true,
    checklist_reminder_app BOOLEAN DEFAULT true,
    
    -- SMS notification settings
    lesson_created_sms BOOLEAN DEFAULT false,
    lesson_updated_sms BOOLEAN DEFAULT false,
    lesson_cancelled_sms BOOLEAN DEFAULT true,
    lesson_completed_sms BOOLEAN DEFAULT false,
    lesson_deleted_sms BOOLEAN DEFAULT false,
    student_assigned_sms BOOLEAN DEFAULT false,
    student_removed_sms BOOLEAN DEFAULT false,
    instructor_created_sms BOOLEAN DEFAULT false,
    instructor_updated_sms BOOLEAN DEFAULT false,
    instructor_removed_sms BOOLEAN DEFAULT false,
    checklist_completed_sms BOOLEAN DEFAULT false,
    checklist_overdue_sms BOOLEAN DEFAULT false,
    checklist_reminder_sms BOOLEAN DEFAULT true,
    
    -- Email notification settings
    lesson_created_email BOOLEAN DEFAULT true,
    lesson_updated_email BOOLEAN DEFAULT true,
    lesson_cancelled_email BOOLEAN DEFAULT true,
    lesson_completed_email BOOLEAN DEFAULT true,
    lesson_deleted_email BOOLEAN DEFAULT true,
    student_assigned_email BOOLEAN DEFAULT true,
    student_removed_email BOOLEAN DEFAULT true,
    instructor_created_email BOOLEAN DEFAULT true,
    instructor_updated_email BOOLEAN DEFAULT true,
    instructor_removed_email BOOLEAN DEFAULT true,
    checklist_completed_email BOOLEAN DEFAULT true,
    checklist_overdue_email BOOLEAN DEFAULT true,
    checklist_reminder_email BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE user_notification_settings IS 'Stores user notification preferences for app, SMS, and email notifications';

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own settings
CREATE POLICY "Users can read own notification settings"
ON user_notification_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own notification settings"
ON user_notification_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own notification settings"
ON user_notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can manage settings
CREATE POLICY "Service role can manage notification settings"
ON user_notification_settings
TO service_role
USING (true)
WITH CHECK (true);
