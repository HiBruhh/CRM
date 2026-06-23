-- Add checklist_reminder type to notifications type check constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('lesson_created', 'lesson_updated', 'lesson_cancelled', 'lesson_completed', 'lesson_deleted', 'student_assigned', 'student_removed', 'instructor_created', 'instructor_updated', 'instructor_removed', 'checklist_reminder'));
