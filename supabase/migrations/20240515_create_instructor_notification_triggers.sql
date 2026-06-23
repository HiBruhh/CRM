-- Function to get instructor auth_id from instructor_id
CREATE OR REPLACE FUNCTION get_instructor_auth_id(p_instructor_id UUID)
RETURNS UUID AS $$
DECLARE
    v_auth_id UUID;
BEGIN
    SELECT auth_id INTO v_auth_id
    FROM instructors
    WHERE id = p_instructor_id;
    
    RETURN v_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify instructor when lesson is created for their student
CREATE OR REPLACE FUNCTION notify_instructor_lesson_created()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'lesson_created',
            'Nowa jazda utworzona',
            'Jazda dla kursanta ' || v_student_name || ' została utworzona',
            'lesson',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_lesson_created ON driving_lessons;

CREATE TRIGGER trigger_notify_instructor_lesson_created
AFTER INSERT ON driving_lessons
FOR EACH ROW
EXECUTE FUNCTION notify_instructor_lesson_created();

-- Trigger: Notify instructor when their lesson is updated
CREATE OR REPLACE FUNCTION notify_instructor_lesson_updated()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'lesson_updated',
            'Jazda zaktualizowana',
            'Jazda dla kursanta ' || v_student_name || ' została zaktualizowana',
            'lesson',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_lesson_updated ON driving_lessons;

CREATE TRIGGER trigger_notify_instructor_lesson_updated
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.checklist IS NULL AND NEW.checklist IS NULL)
EXECUTE FUNCTION notify_instructor_lesson_updated();

-- Trigger: Notify instructor when their lesson is started
CREATE OR REPLACE FUNCTION notify_instructor_lesson_started()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'lesson_started',
            'Lekcja jazdy się rozpoczęła',
            'Lekcja jazdy dla kursanta ' || v_student_name || ' się rozpoczęła',
            'lesson',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_lesson_started ON driving_lessons;

CREATE TRIGGER trigger_notify_instructor_lesson_started
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.status != 'in_progress' AND NEW.status = 'in_progress')
EXECUTE FUNCTION notify_instructor_lesson_started();

-- Trigger: Notify instructor when their lesson is cancelled
CREATE OR REPLACE FUNCTION notify_instructor_lesson_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'lesson_cancelled',
            'Jazda anulowana',
            'Jazda dla kursanta ' || v_student_name || ' została anulowana',
            'lesson',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_lesson_cancelled ON driving_lessons;

CREATE TRIGGER trigger_notify_instructor_lesson_cancelled
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
EXECUTE FUNCTION notify_instructor_lesson_cancelled();

-- Trigger: Notify instructor when their lesson is completed
CREATE OR REPLACE FUNCTION notify_instructor_lesson_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'lesson_completed',
            'Jazda zakończona',
            'Jazda dla kursanta ' || v_student_name || ' została zakończona',
            'lesson',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_lesson_completed ON driving_lessons;

CREATE TRIGGER trigger_notify_instructor_lesson_completed
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION notify_instructor_lesson_completed();

-- Trigger: Notify instructor when student is assigned to them
CREATE OR REPLACE FUNCTION notify_instructor_student_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    v_student_name := NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'student_assigned',
            'Nowy kursant przypisany',
            'Kursant ' || v_student_name || ' został przypisany do Ciebie',
            'student',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_student_assigned ON students;

CREATE TRIGGER trigger_notify_instructor_student_assigned
AFTER UPDATE ON students
FOR EACH ROW
WHEN (OLD.instructor_id IS NULL AND NEW.instructor_id IS NOT NULL)
EXECUTE FUNCTION notify_instructor_student_assigned();

-- Trigger: Notify instructor when student is removed from them
CREATE OR REPLACE FUNCTION notify_instructor_student_removed()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id (from old instructor_id)
    SELECT get_instructor_auth_id(OLD.instructor_id) INTO v_instructor_auth_id;
    
    v_student_name := NEW.student_id;
    
    -- Notify instructor if they have an auth account
    IF v_instructor_auth_id IS NOT NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'student_removed',
            'Kursant usunięty',
            'Kursant ' || v_student_name || ' został usunięty z Twojej listy',
            'student',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_student_removed ON students;

CREATE TRIGGER trigger_notify_instructor_student_removed
AFTER UPDATE ON students
FOR EACH ROW
WHEN (OLD.instructor_id IS NOT NULL AND NEW.instructor_id IS NULL)
EXECUTE FUNCTION notify_instructor_student_removed();

-- Trigger: Notify instructor to fill checklist after lesson completion
CREATE OR REPLACE FUNCTION notify_instructor_checklist_reminder()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_auth_id UUID;
    v_student_name TEXT;
BEGIN
    -- Get instructor auth_id
    SELECT get_instructor_auth_id(NEW.instructor_id) INTO v_instructor_auth_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;
    
    -- Notify instructor if they have an auth account and checklist is not filled
    IF v_instructor_auth_id IS NOT NULL AND NEW.checklist IS NULL THEN
        PERFORM create_notification(
            v_instructor_auth_id,
            'checklist_reminder',
            'Wypełnij checklistę',
            'Jazda dla kursanta ' || v_student_name || ' została zakończona. Wypełnij checklistę jazdy.',
            'lesson',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_instructor_checklist_reminder ON driving_lessons;

CREATE TRIGGER trigger_notify_instructor_checklist_reminder
AFTER INSERT OR UPDATE ON driving_lessons
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION notify_instructor_checklist_reminder();
