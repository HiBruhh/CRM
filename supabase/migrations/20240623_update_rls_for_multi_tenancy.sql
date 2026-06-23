-- Update RLS policies for multi-tenancy isolation
-- This ensures that users from organization A cannot see data from organization B

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get organization_id from instructors table
    SELECT organization_id INTO v_org_id
    FROM instructors
    WHERE auth_id::uuid = auth.uid();
    
    -- If not found in instructors, check if user is admin (admin can see all)
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id
        FROM organizations
        WHERE id = (
            SELECT organization_id 
            FROM instructors 
            WHERE auth_id::uuid = auth.uid()
            LIMIT 1
        );
    END IF;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing RLS policies on instructors
DROP POLICY IF EXISTS "Users can read own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can update own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can insert own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can delete own instructors" ON instructors;

-- New RLS policies for instructors with organization isolation
DROP POLICY IF EXISTS "Users can read instructors from their organization" ON instructors;
CREATE POLICY "Users can read instructors from their organization"
ON instructors
FOR SELECT
TO authenticated
USING (
    organization_id = get_user_organization_id()
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "Service role can manage instructors" ON instructors;
CREATE POLICY "Service role can manage instructors"
ON instructors
TO service_role
USING (true)
WITH CHECK (true);

-- Drop existing RLS policies on students
DROP POLICY IF EXISTS "Users can read own students" ON students;
DROP POLICY IF EXISTS "Users can update own students" ON students;
DROP POLICY IF EXISTS "Users can insert own students" ON students;
DROP POLICY IF EXISTS "Users can delete own students" ON students;

-- New RLS policies for students with organization isolation
DROP POLICY IF EXISTS "Users can read students from their organization" ON students;
CREATE POLICY "Users can read students from their organization"
ON students
FOR SELECT
TO authenticated
USING (
    organization_id = get_user_organization_id()
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "Instructors can update students from their organization" ON students;
CREATE POLICY "Instructors can update students from their organization"
ON students
FOR UPDATE
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = students.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
)
WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = students.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins can manage students from their organization" ON students;
CREATE POLICY "Admins can manage students from their organization"
ON students
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
)
WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "Service role can manage students" ON students;
CREATE POLICY "Service role can manage students"
ON students
TO service_role
USING (true)
WITH CHECK (true);

-- Drop existing RLS policies on driving_lessons
DROP POLICY IF EXISTS "Instructors can update their own lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can insert their own lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can delete their own lessons" ON driving_lessons;

-- New RLS policies for driving_lessons with organization isolation
DROP POLICY IF EXISTS "Users can read lessons from their organization" ON driving_lessons;
CREATE POLICY "Users can read lessons from their organization"
ON driving_lessons
FOR SELECT
TO authenticated
USING (
    organization_id = get_user_organization_id()
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "Instructors can update their own lessons in their organization" ON driving_lessons;
CREATE POLICY "Instructors can update their own lessons in their organization"
ON driving_lessons
FOR UPDATE
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = driving_lessons.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
)
WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = driving_lessons.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
);

DROP POLICY IF EXISTS "Instructors can insert their own lessons in their organization" ON driving_lessons;
CREATE POLICY "Instructors can insert their own lessons in their organization"
ON driving_lessons
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = driving_lessons.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
);

DROP POLICY IF EXISTS "Instructors can delete their own lessons in their organization" ON driving_lessons;
CREATE POLICY "Instructors can delete their own lessons in their organization"
ON driving_lessons
FOR DELETE
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = driving_lessons.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins can manage lessons in their organization" ON driving_lessons;
CREATE POLICY "Admins can manage lessons in their organization"
ON driving_lessons
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
)
WITH CHECK (
    organization_id = get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "Service role can manage driving_lessons" ON driving_lessons;
CREATE POLICY "Service role can manage driving_lessons"
ON driving_lessons
TO service_role
USING (true)
WITH CHECK (true);

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_user_organization_id TO authenticated;

-- Comment on helper function
COMMENT ON FUNCTION get_user_organization_id IS 'Helper function to get the current user organization_id for RLS policies';
