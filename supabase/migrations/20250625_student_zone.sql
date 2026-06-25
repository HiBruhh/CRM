-- Student Zone: tables, columns, storage bucket, and RLS policies

-- ============================================================
-- 1. Extend students table for student zone authentication
-- ============================================================
ALTER TABLE students
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS activation_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS activation_email_sent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_students_auth_id ON students(auth_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- ============================================================
-- 2. Extend driving_lessons table for proposals and cancellations
-- ============================================================
ALTER TABLE driving_lessons
DROP CONSTRAINT IF EXISTS driving_lessons_status_check;

ALTER TABLE driving_lessons
ADD CONSTRAINT driving_lessons_status_check
CHECK (status IN ('proposed', 'pending', 'in_progress', 'completed', 'cancelled', 'rejected'));

ALTER TABLE driving_lessons
ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_status TEXT DEFAULT 'pending' CHECK (cancellation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS cancellation_resolved_note TEXT,
ADD COLUMN IF NOT EXISTS student_comment TEXT,
ADD COLUMN IF NOT EXISTS student_visible BOOLEAN DEFAULT true;

-- ============================================================
-- 3. Student OTP tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS student_otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_otp_tokens_student_id ON student_otp_tokens(student_id);
CREATE INDEX IF NOT EXISTS idx_student_otp_tokens_code ON student_otp_tokens(code);

-- ============================================================
-- 4. Student documents
-- ============================================================
CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_by_role TEXT NOT NULL CHECK (uploaded_by_role IN ('student', 'osk')),
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    osk_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents(status);

-- ============================================================
-- 5. Student lesson ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS student_lesson_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES driving_lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    what_was_good TEXT,
    what_was_unclear TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_lesson_ratings_student_id ON student_lesson_ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_ratings_lesson_id ON student_lesson_ratings(lesson_id);

-- ============================================================
-- 6. Student email changes
-- ============================================================
CREATE TABLE IF NOT EXISTS student_email_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    new_email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_email_changes_student_id ON student_email_changes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_email_changes_token ON student_email_changes(token);

-- ============================================================
-- 7. Enable RLS on new tables
-- ============================================================
ALTER TABLE student_otp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_email_changes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS policies for student_documents
-- ============================================================
DROP POLICY IF EXISTS "Students can view own documents" ON student_documents;
CREATE POLICY "Students can view own documents"
ON student_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_documents.student_id
        AND students.auth_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can upload own documents" ON student_documents;
CREATE POLICY "Students can upload own documents"
ON student_documents
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_documents.student_id
        AND students.auth_id = auth.uid()
    )
    AND uploaded_by_role = 'student'
);

DROP POLICY IF EXISTS "OSK can view documents of their students" ON student_documents;
CREATE POLICY "OSK can view documents of their students"
ON student_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_documents.student_id
        AND students.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "OSK can manage documents of their students" ON student_documents;
CREATE POLICY "OSK can manage documents of their students"
ON student_documents
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_documents.student_id
        AND students.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_documents.student_id
        AND students.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

-- ============================================================
-- 9. RLS policies for student_lesson_ratings
-- ============================================================
DROP POLICY IF EXISTS "Students can view own ratings" ON student_lesson_ratings;
CREATE POLICY "Students can view own ratings"
ON student_lesson_ratings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_lesson_ratings.student_id
        AND students.auth_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can create own ratings" ON student_lesson_ratings;
CREATE POLICY "Students can create own ratings"
ON student_lesson_ratings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_lesson_ratings.student_id
        AND students.auth_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "OSK can view ratings of their students" ON student_lesson_ratings;
CREATE POLICY "OSK can view ratings of their students"
ON student_lesson_ratings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_lesson_ratings.student_id
        AND students.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

-- ============================================================
-- 10. RLS policies for student_email_changes
-- ============================================================
DROP POLICY IF EXISTS "Students can view own email changes" ON student_email_changes;
CREATE POLICY "Students can view own email changes"
ON student_email_changes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = student_email_changes.student_id
        AND students.auth_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Service role can manage email changes" ON student_email_changes;
CREATE POLICY "Service role can manage email changes"
ON student_email_changes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 11. RLS policies for student_otp_tokens
-- ============================================================
DROP POLICY IF EXISTS "Service role can manage OTP tokens" ON student_otp_tokens;
CREATE POLICY "Service role can manage OTP tokens"
ON student_otp_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 12. Create storage bucket for student documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for student documents
DROP POLICY IF EXISTS "Students can read own documents" ON storage.objects;
CREATE POLICY "Students can read own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'student-documents'
    AND (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.auth_id = auth.uid()
            AND name LIKE students.id::text || '/%'
        )
        OR EXISTS (
            SELECT 1 FROM students s
            WHERE name LIKE s.id::text || '/%'
            AND s.organization_id IN (
                SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
                UNION
                SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
            )
        )
    )
);

-- Students can upload to their own folder
DROP POLICY IF EXISTS "Students can upload own documents" ON storage.objects;
CREATE POLICY "Students can upload own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'student-documents'
    AND EXISTS (
        SELECT 1 FROM students
        WHERE students.auth_id = auth.uid()
        AND name LIKE students.id::text || '/%'
    )
);

-- OSK can upload to students in their organization
DROP POLICY IF EXISTS "OSK can upload student documents" ON storage.objects;
CREATE POLICY "OSK can upload student documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'student-documents'
    AND EXISTS (
        SELECT 1 FROM students s
        WHERE name LIKE s.id::text || '/%'
        AND s.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
);

-- OSK can update/delete documents in their organization
DROP POLICY IF EXISTS "OSK can manage student documents" ON storage.objects;
CREATE POLICY "OSK can manage student documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'student-documents'
    AND EXISTS (
        SELECT 1 FROM students s
        WHERE name LIKE s.id::text || '/%'
        AND s.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
)
WITH CHECK (
    bucket_id = 'student-documents'
    AND EXISTS (
        SELECT 1 FROM students s
        WHERE name LIKE s.id::text || '/%'
        AND s.organization_id IN (
            SELECT organization_id FROM instructors WHERE instructors.auth_id::uuid = auth.uid()
            UNION
            SELECT organization_id FROM organization_admins WHERE organization_admins.auth_id::uuid = auth.uid()
        )
    )
);

-- ============================================================
-- 13. Update students RLS to allow student self-access
-- ============================================================
DROP POLICY IF EXISTS "Students can view own profile" ON students;
CREATE POLICY "Students can view own profile"
ON students
FOR SELECT
TO authenticated
USING (
    auth_id = auth.uid()
);

DROP POLICY IF EXISTS "Students can update own profile" ON students;
CREATE POLICY "Students can update own profile"
ON students
FOR UPDATE
TO authenticated
USING (
    auth_id = auth.uid()
)
WITH CHECK (
    auth_id = auth.uid()
);

-- ============================================================
-- 14. Update driving_lessons RLS to allow student access
-- ============================================================
DROP POLICY IF EXISTS "Students can view own lessons" ON driving_lessons;
CREATE POLICY "Students can view own lessons"
ON driving_lessons
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = driving_lessons.student_id
        AND students.auth_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can update own lesson proposals" ON driving_lessons;
CREATE POLICY "Students can update own lesson proposals"
ON driving_lessons
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = driving_lessons.student_id
        AND students.auth_id = auth.uid()
    )
    AND status = 'proposed'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.id = driving_lessons.student_id
        AND students.auth_id = auth.uid()
    )
);
