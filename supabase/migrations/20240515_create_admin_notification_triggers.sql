-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_entity_type TEXT,
    p_entity_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin user IDs
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify admin when lesson is created
CREATE OR REPLACE FUNCTION notify_admin_lesson_created()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
    v_instructor_name TEXT;
BEGIN
    -- Get student and instructor names
    SELECT s.student_id, i.first_name || ' ' || i.last_name
    INTO v_student_name, v_instructor_name
    FROM students s
    JOIN instructors i ON s.instructor_id = i.id
    WHERE s.id = NEW.student_id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'lesson_created',
            'Nowa jazda utworzona',
            'Jazda dla kursanta ' || v_student_name || ' z instruktorem ' || v_instructor_name || ' została utworzona',
            'lesson',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_lesson_created ON driving_lessons;

CREATE TRIGGER trigger_notify_admin_lesson_created
AFTER INSERT ON driving_lessons
FOR EACH ROW
EXECUTE FUNCTION notify_admin_lesson_created();

-- Trigger: Notify admin when lesson is updated
CREATE OR REPLACE FUNCTION notify_admin_lesson_updated()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
BEGIN
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'lesson_updated',
            'Jazda zaktualizowana',
            'Jazda dla kursanta ' || v_student_name || ' została zaktualizowana',
            'lesson',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_lesson_updated ON driving_lessons;

CREATE TRIGGER trigger_notify_admin_lesson_updated
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.checklist IS NULL AND NEW.checklist IS NULL)
EXECUTE FUNCTION notify_admin_lesson_updated();

-- Trigger: Notify admin when lesson is cancelled
CREATE OR REPLACE FUNCTION notify_admin_lesson_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
BEGIN
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'lesson_cancelled',
            'Jazda anulowana',
            'Jazda dla kursanta ' || v_student_name || ' została anulowana',
            'lesson',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_lesson_cancelled ON driving_lessons;

CREATE TRIGGER trigger_notify_admin_lesson_cancelled
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
EXECUTE FUNCTION notify_admin_lesson_cancelled();

-- Trigger: Notify admin when lesson is completed
CREATE OR REPLACE FUNCTION notify_admin_lesson_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
BEGIN
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.student_id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'lesson_completed',
            'Jazda zakończona',
            'Jazda dla kursanta ' || v_student_name || ' została zakończona',
            'lesson',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_lesson_completed ON driving_lessons;

CREATE TRIGGER trigger_notify_admin_lesson_completed
AFTER UPDATE ON driving_lessons
FOR EACH ROW
WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION notify_admin_lesson_completed();

-- Trigger: Notify admin when student is assigned
CREATE OR REPLACE FUNCTION notify_admin_student_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
    v_instructor_name TEXT;
BEGIN
    -- Get names
    SELECT NEW.student_id, i.first_name || ' ' || i.last_name
    INTO v_student_name, v_instructor_name
    FROM instructors i
    WHERE i.id = NEW.instructor_id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'student_assigned',
            'Kursant przypisany',
            'Kursant ' || v_student_name || ' został przypisany do instruktora ' || v_instructor_name,
            'student',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_student_assigned ON students;

CREATE TRIGGER trigger_notify_admin_student_assigned
AFTER UPDATE ON students
FOR EACH ROW
WHEN (OLD.instructor_id IS NULL AND NEW.instructor_id IS NOT NULL)
EXECUTE FUNCTION notify_admin_student_assigned();

-- Trigger: Notify admin when student is removed
CREATE OR REPLACE FUNCTION notify_admin_student_removed()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
BEGIN
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = NEW.id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'student_removed',
            'Kursant usunięty',
            'Kursant ' || v_student_name || ' został usunięty z instruktora',
            'student',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_student_removed ON students;

CREATE TRIGGER trigger_notify_admin_student_removed
AFTER UPDATE ON students
FOR EACH ROW
WHEN (OLD.instructor_id IS NOT NULL AND NEW.instructor_id IS NULL)
EXECUTE FUNCTION notify_admin_student_removed();

-- Trigger: Notify admin when instructor is created
CREATE OR REPLACE FUNCTION notify_admin_instructor_created()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_instructor_name TEXT;
BEGIN
    v_instructor_name := NEW.first_name || ' ' || NEW.last_name;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'instructor_created',
            'Instruktor utworzony',
            'Instruktor ' || v_instructor_name || ' został utworzony',
            'instructor',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_instructor_created ON instructors;

CREATE TRIGGER trigger_notify_admin_instructor_created
AFTER INSERT ON instructors
FOR EACH ROW
EXECUTE FUNCTION notify_admin_instructor_created();

-- Trigger: Notify admin when instructor is updated
CREATE OR REPLACE FUNCTION notify_admin_instructor_updated()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_instructor_name TEXT;
BEGIN
    v_instructor_name := NEW.first_name || ' ' || NEW.last_name;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'instructor_updated',
            'Instruktor zaktualizowany',
            'Instruktor ' || v_instructor_name || ' został zaktualizowany',
            'instructor',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_instructor_updated ON instructors;

CREATE TRIGGER trigger_notify_admin_instructor_updated
AFTER UPDATE ON instructors
FOR EACH ROW
EXECUTE FUNCTION notify_admin_instructor_updated();

-- Trigger: Notify admin when instructor is deleted
CREATE OR REPLACE FUNCTION notify_admin_instructor_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_instructor_name TEXT;
BEGIN
    v_instructor_name := OLD.first_name || ' ' || OLD.last_name;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'instructor_removed',
            'Instruktor usunięty',
            'Instruktor ' || v_instructor_name || ' został usunięty',
            'instructor',
            OLD.id
        );
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_instructor_deleted ON instructors;

CREATE TRIGGER trigger_notify_admin_instructor_deleted
AFTER DELETE ON instructors
FOR EACH ROW
EXECUTE FUNCTION notify_admin_instructor_deleted();

-- Trigger: Notify admin when lesson is deleted
CREATE OR REPLACE FUNCTION notify_admin_lesson_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
BEGIN
    -- Get student name
    SELECT student_id INTO v_student_name
    FROM students
    WHERE id = OLD.student_id;

    -- Notify all admins
    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'lesson_deleted',
            'Jazda usunięta',
            'Jazda dla kursanta ' || v_student_name || ' została usunięta',
            'lesson',
            OLD.id
        );
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_lesson_deleted ON driving_lessons;

CREATE TRIGGER trigger_notify_admin_lesson_deleted
AFTER DELETE ON driving_lessons
FOR EACH ROW
EXECUTE FUNCTION notify_admin_lesson_deleted();
