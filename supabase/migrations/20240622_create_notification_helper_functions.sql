-- Function to check if user has notification enabled for specific type and channel
CREATE OR REPLACE FUNCTION check_notification_enabled(
    p_user_id UUID,
    p_notification_type TEXT,
    p_channel TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_setting_column TEXT;
    v_enabled BOOLEAN;
BEGIN
    -- Construct the column name based on notification type and channel
    v_setting_column := p_notification_type || '_' || p_channel;
    
    -- Check if user has settings, if not return default values
    IF NOT EXISTS (
        SELECT 1 FROM user_notification_settings 
        WHERE user_id = p_user_id
    ) THEN
        -- Default values: app=true, sms=false (except cancelled/reminder), email=true
        IF p_channel = 'app' THEN
            RETURN TRUE;
        ELSIF p_channel = 'sms' THEN
            IF p_notification_type IN ('lesson_cancelled', 'checklist_reminder') THEN
                RETURN TRUE;
            ELSE
                RETURN FALSE;
            END IF;
        ELSIF p_channel = 'email' THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check the specific setting
    EXECUTE format('SELECT %I FROM user_notification_settings WHERE user_id = $1', v_setting_column)
    INTO v_enabled
    USING p_user_id;
    
    -- If setting is NULL, return default
    IF v_enabled IS NULL THEN
        IF p_channel = 'app' THEN
            RETURN TRUE;
        ELSIF p_channel = 'sms' THEN
            IF p_notification_type IN ('lesson_cancelled', 'checklist_reminder') THEN
                RETURN TRUE;
            ELSE
                RETURN FALSE;
            END IF;
        ELSIF p_channel = 'email' THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN v_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification with settings check
CREATE OR REPLACE FUNCTION create_notification_with_settings(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_app_enabled BOOLEAN;
    v_sms_enabled BOOLEAN;
    v_email_enabled BOOLEAN;
BEGIN
    -- Check notification settings for each channel
    v_app_enabled := check_notification_enabled(p_user_id, p_type, 'app');
    v_sms_enabled := check_notification_enabled(p_user_id, p_type, 'sms');
    v_email_enabled := check_notification_enabled(p_user_id, p_type, 'email');
    
    -- Only create notification if at least one channel is enabled
    IF NOT (v_app_enabled OR v_sms_enabled OR v_email_enabled) THEN
        RETURN NULL;
    END IF;
    
    -- Create notification with channel info in metadata
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id,
        jsonb_build_object(
            'channels', jsonb_build_object(
                'app', v_app_enabled,
                'sms', v_sms_enabled,
                'email', v_email_enabled
            ),
            'original_metadata', p_metadata
        )
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function to manually trigger notifications
CREATE OR REPLACE FUNCTION test_notification(
    p_user_id UUID DEFAULT NULL,
    p_type TEXT DEFAULT 'lesson_created',
    p_title TEXT DEFAULT 'Testowe powiadomienie',
    p_message TEXT DEFAULT 'To jest testowe powiadomienie',
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_target_user_id UUID;
    v_notification_id UUID;
    v_result JSONB;
BEGIN
    -- If no user_id provided, use current user
    IF p_user_id IS NULL THEN
        v_target_user_id := auth.uid();
    ELSE
        v_target_user_id := p_user_id;
    END IF;
    
    -- Create notification
    v_notification_id := create_notification_with_settings(
        v_target_user_id,
        p_type,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id
    );
    
    -- Build result
    v_result := jsonb_build_object(
        'success', (v_notification_id IS NOT NULL),
        'notification_id', v_notification_id,
        'user_id', v_target_user_id,
        'type', p_type,
        'message', CASE 
            WHEN v_notification_id IS NOT NULL THEN 'Powiadomienie utworzone'
            ELSE 'Powiadomienie nie utworzone - wszystkie kanały wyłączone'
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_notification_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_with_settings TO service_role;
GRANT EXECUTE ON FUNCTION test_notification TO authenticated;

-- Comment on functions
COMMENT ON FUNCTION check_notification_enabled IS 'Checks if user has notification enabled for specific type and channel';
COMMENT ON FUNCTION create_notification_with_settings IS 'Creates notification with settings check for each channel';
COMMENT ON FUNCTION test_notification IS 'Test function to manually trigger notifications for testing purposes';
