-- Update create_notification function to use settings check
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
BEGIN
    -- Use the new function that checks notification settings
    RETURN create_notification_with_settings(
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_notification TO service_role;

-- Comment on function
COMMENT ON FUNCTION create_notification IS 'Creates notification with automatic settings check for each channel';
