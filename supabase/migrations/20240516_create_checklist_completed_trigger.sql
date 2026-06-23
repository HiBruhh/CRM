-- Function to notify admin when a checklist is completed
CREATE OR REPLACE FUNCTION notify_admin_on_checklist_completed_func()
RETURNS TRIGGER AS $$
BEGIN
  -- Get admin user IDs (users with admin role in user_metadata)
  INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
  SELECT 
    u.id,
    'checklist_completed',
    'Checklista uzupełniona',
    'Checklista dla jazdy kursanta ' ||
      COALESCE(s.first_name || ' ' || s.last_name, 'Nieznany') ||
      ' przez instruktora ' ||
      COALESCE(i.first_name || ' ' || i.last_name, 'Nieznany') ||
      ' dnia ' ||
      TO_CHAR(NEW.start_time::timestamp at time zone 'UTC' at time zone 'Europe/Warsaw', 'DD.MM.YYYY HH24:MI') ||
      ' została właśnie uzupełniona',
    'lesson',
    NEW.id,
    jsonb_build_object(
      'instructor_id', NEW.instructor_id,
      'instructor_name', i.first_name || ' ' || i.last_name,
      'student_id', NEW.student_id,
      'student_name', s.first_name || ' ' || s.last_name,
      'score', NEW.score,
      'lesson_date', NEW.start_time
    )
  FROM auth.users u
  LEFT JOIN instructors i ON i.id = NEW.instructor_id
  LEFT JOIN students s ON s.id = NEW.student_id
  WHERE u.raw_user_meta_data->>'role' = 'admin';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to notify admin when a checklist is completed
DROP TRIGGER IF EXISTS notify_admin_on_checklist_completed ON driving_lessons;

CREATE TRIGGER notify_admin_on_checklist_completed
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (
  NEW.checklist IS NOT NULL 
  AND NEW.status = 'completed'
  AND (OLD.checklist IS NULL OR NEW.checklist IS DISTINCT FROM OLD.checklist)
)
EXECUTE FUNCTION notify_admin_on_checklist_completed_func();
