-- Add instructor_number column to instructors table if it doesn't exist
ALTER TABLE instructors 
ADD COLUMN IF NOT EXISTS instructor_number TEXT;

-- Update existing instructors with sequential numbers
DO $$
DECLARE
  instructor_record RECORD;
  counter INTEGER := 1;
BEGIN
  -- Only update instructors that don't have an instructor_number yet
  FOR instructor_record IN 
    SELECT id FROM instructors WHERE instructor_number IS NULL ORDER BY created_at
  LOOP
    UPDATE instructors 
    SET instructor_number = 'INS-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = instructor_record.id;
    counter := counter + 1;
  END LOOP;
END $$;
