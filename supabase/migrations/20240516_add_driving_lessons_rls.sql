-- Enable RLS on driving_lessons if not already enabled
ALTER TABLE driving_lessons ENABLE ROW LEVEL SECURITY;

-- Instructors can update their own lessons (including checklists)
CREATE POLICY "Instructors can update their own lessons"
ON driving_lessons
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors 
    WHERE instructors.id::uuid = driving_lessons.instructor_id::uuid 
    AND instructors.auth_id::uuid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM instructors 
    WHERE instructors.id::uuid = driving_lessons.instructor_id::uuid 
    AND instructors.auth_id::uuid = auth.uid()
  )
);

-- Instructors can insert their own lessons
CREATE POLICY "Instructors can insert their own lessons"
ON driving_lessons
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM instructors 
    WHERE instructors.id::uuid = driving_lessons.instructor_id::uuid 
    AND instructors.auth_id::uuid = auth.uid()
  )
);

-- Instructors can delete their own lessons
CREATE POLICY "Instructors can delete their own lessons"
ON driving_lessons
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM instructors 
    WHERE instructors.id::uuid = driving_lessons.instructor_id::uuid 
    AND instructors.auth_id::uuid = auth.uid()
  )
);
