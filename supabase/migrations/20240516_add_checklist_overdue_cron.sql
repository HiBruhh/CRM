-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to check for overdue checklists
CREATE OR REPLACE FUNCTION check_overdue_checklists()
RETURNS void AS $$
DECLARE
  admin_record RECORD;
  lesson_record RECORD;
  hours_since_end INTEGER;
  notification_exists BOOLEAN;
BEGIN
  -- Get all admin users
  FOR admin_record IN 
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  LOOP
    -- Find completed lessons without checklists that ended more than 24 hours ago
    FOR lesson_record IN
      SELECT 
        dl.id,
        dl.instructor_id,
        dl.student_id,
        dl.start_time,
        dl.end_time,
        i.first_name as instructor_first_name,
        i.last_name as instructor_last_name,
        s.first_name as student_first_name,
        s.last_name as student_last_name
      FROM driving_lessons dl
      LEFT JOIN instructors i ON i.id = dl.instructor_id
      LEFT JOIN students s ON s.id = dl.student_id
      WHERE dl.status = 'completed'
        AND dl.checklist IS NULL
        AND dl.end_time < NOW() - INTERVAL '24 hours'
        AND dl.end_time IS NOT NULL
    LOOP
      -- Calculate hours since lesson ended
      hours_since_end := EXTRACT(EPOCH FROM (NOW() - lesson_record.end_time)) / 3600;
      
      -- Check if notification already exists in last 24 hours
      SELECT EXISTS(
        SELECT 1 FROM notifications
        WHERE type = 'checklist_overdue'
          AND entity_id = lesson_record.id
          AND created_at > NOW() - INTERVAL '24 hours'
      ) INTO notification_exists;
      
      -- Create notification if it doesn't exist
      IF NOT notification_exists THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
        VALUES (
          admin_record.id,
          'checklist_overdue',
          'Checklista nieuzupełniona',
          'Instruktor ' || 
            COALESCE(lesson_record.instructor_first_name || ' ' || lesson_record.instructor_last_name, 'Nieznany') || 
            ' nie uzupełnił checklisty dla kursanta ' || 
            COALESCE(lesson_record.student_first_name || ' ' || lesson_record.student_last_name, 'Nieznany') ||
            ' przez ' || hours_since_end || ' godzin',
          'driving_lesson',
          lesson_record.id,
          jsonb_build_object(
            'instructor_id', lesson_record.instructor_id,
            'instructor_name', lesson_record.instructor_first_name || ' ' || lesson_record.instructor_last_name,
            'student_id', lesson_record.student_id,
            'student_name', lesson_record.student_first_name || ' ' || lesson_record.student_last_name,
            'lesson_date', lesson_record.start_time,
            'hours_overdue', hours_since_end
          )
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run every 24 hours
SELECT cron.schedule(
  'check-overdue-checklists',
  '0 0 * * *', -- Run at midnight every day
  'SELECT check_overdue_checklists();'
);
