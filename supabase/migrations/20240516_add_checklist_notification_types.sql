-- Add new notification types for checklist completion and overdue reminders
ALTER TABLE notifications 
DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'lesson_created',
  'lesson_updated',
  'lesson_deleted',
  'instructor_created',
  'instructor_updated',
  'instructor_deleted',
  'student_created',
  'student_updated',
  'student_deleted',
  'checklist_reminder',
  'checklist_completed',
  'checklist_overdue'
));
