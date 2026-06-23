-- Fix: delete notification triggers could insert NULL message when cascade
-- deleting organizations (students/instructors already gone by the time the
-- AFTER DELETE trigger on driving_lessons fires).

CREATE OR REPLACE FUNCTION notify_admin_lesson_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_student_name TEXT;
BEGIN
    -- Student may already be deleted during cascade
    SELECT first_name || ' ' || last_name INTO v_student_name
    FROM students
    WHERE id = OLD.student_id;

    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'lesson_deleted',
            'Jazda usunięta',
            'Jazda dla kursanta ' || COALESCE(v_student_name, 'nieznany') || ' została usunięta',
            'lesson',
            OLD.id
        );
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_admin_instructor_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
    v_instructor_name TEXT;
BEGIN
    v_instructor_name := COALESCE(OLD.first_name, '') || ' ' || COALESCE(OLD.last_name, '');

    FOR v_admin_user IN SELECT user_id FROM get_admin_users() LOOP
        PERFORM create_notification(
            v_admin_user,
            'instructor_removed',
            'Instruktor usunięty',
            CASE
                WHEN trim(v_instructor_name) = '' THEN 'Instruktor został usunięty'
                ELSE 'Instruktor ' || v_instructor_name || ' został usunięty'
            END,
            'instructor',
            OLD.id
        );
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
