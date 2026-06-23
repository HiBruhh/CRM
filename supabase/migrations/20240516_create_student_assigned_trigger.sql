-- Function to notify instructor when a student is assigned
CREATE OR REPLACE FUNCTION notify_instructor_on_student_assigned_func()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify if instructor_id is set (either new assignment or reassignment)
  IF NEW.instructor_id IS NOT NULL THEN
    -- Get instructor's auth user ID
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, metadata)
    SELECT
      i.auth_id::uuid,
      'student_assigned',
      'Nowy kursant przypisany',
      'Kursant ' || COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Nieznany') ||
      ' (' || COALESCE(NEW.student_id, 'Brak ID') || ') został przypisany do Ciebie',
      'student',
      NEW.id,
      jsonb_build_object(
        'student_id', NEW.student_id,
        'student_name', NEW.first_name || ' ' || NEW.last_name,
        'student_phone', NEW.phone,
        'assigned_at', NOW()
      )
    FROM instructors i
    WHERE i.id = NEW.instructor_id
    AND i.auth_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to notify instructor when a student is assigned
DROP TRIGGER IF EXISTS notify_instructor_on_student_assigned ON students;

CREATE TRIGGER notify_instructor_on_student_assigned
AFTER INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION notify_instructor_on_student_assigned_func();
