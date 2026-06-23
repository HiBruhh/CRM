-- Add student_assigned notification type to check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'lesson_created',
  'lesson_updated',
  'lesson_cancelled',
  'lesson_completed',
  'lesson_deleted',
  'student_assigned',
  'student_removed',
  'instructor_created',
  'instructor_updated',
  'instructor_deleted',
  'checklist_completed',
  'checklist_reminder',
  'checklist_overdue'
));
