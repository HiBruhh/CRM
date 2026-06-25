-- Add file_path column to student_documents for signed URL generation
ALTER TABLE student_documents
ADD COLUMN IF NOT EXISTS file_path text;

-- Update existing records to extract file_path from file_url
UPDATE student_documents
SET file_path = substring(file_url FROM 'student-documents/(.+)$')
WHERE file_path IS NULL AND file_url LIKE '%student-documents/%';
