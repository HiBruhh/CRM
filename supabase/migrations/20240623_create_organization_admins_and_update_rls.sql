-- Create organization_admins table for OSK chiefs
CREATE TABLE IF NOT EXISTS organization_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, auth_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_admins_organization_id ON organization_admins(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_admins_auth_id ON organization_admins(auth_id);
CREATE INDEX IF NOT EXISTS idx_organization_admins_email ON organization_admins(email);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_organization_admins_updated_at ON organization_admins;
CREATE TRIGGER update_organization_admins_updated_at
    BEFORE UPDATE ON organization_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on organization_admins
ALTER TABLE organization_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_admins
DROP POLICY IF EXISTS "Users can read their own organization admin profile" ON organization_admins;
CREATE POLICY "Users can read their own organization admin profile"
ON organization_admins
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage organization_admins" ON organization_admins;
CREATE POLICY "Service role can manage organization_admins"
ON organization_admins
TO service_role
USING (true)
WITH CHECK (true);

-- Update helper function to get user's organization_id and role
CREATE OR REPLACE FUNCTION get_user_organization_context()
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_role TEXT;
    v_is_super_admin BOOLEAN;
BEGIN
    -- Check if user is super-admin (admin@szkola.pl or has role 'super_admin')
    SELECT EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.email = 'admin@szkola.pl' OR u.raw_user_meta_data->>'role' = 'super_admin')
    ) INTO v_is_super_admin;
    
    IF v_is_super_admin THEN
        RETURN jsonb_build_object(
            'organization_id', NULL,
            'role', 'super_admin',
            'is_super_admin', true
        );
    END IF;
    
    -- Check if user is organization admin
    SELECT organization_id INTO v_org_id
    FROM organization_admins
    WHERE auth_id = auth.uid()
    AND status = 'active'
    LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'organization_id', v_org_id,
            'role', 'org_admin',
            'is_super_admin', false
        );
    END IF;
    
    -- Check if user is instructor
    SELECT organization_id INTO v_org_id
    FROM instructors
    WHERE auth_id::uuid = auth.uid()
    LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'organization_id', v_org_id,
            'role', 'instructor',
            'is_super_admin', false
        );
    END IF;
    
    -- Default: no organization access
    RETURN jsonb_build_object(
        'organization_id', NULL,
        'role', 'none',
        'is_super_admin', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for instructors - super-admin sees all
DROP POLICY IF EXISTS "Users can read instructors from their organization" ON instructors;
DROP POLICY IF EXISTS "Service role can manage instructors" ON instructors;

DROP POLICY IF EXISTS "Super-admin can read all instructors" ON instructors;
CREATE POLICY "Super-admin can read all instructors"
ON instructors
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.email = 'admin@szkola.pl' OR u.raw_user_meta_data->>'role' = 'super_admin')
    )
    OR organization_id = (get_user_organization_context()->>'organization_id')::UUID
);

CREATE POLICY "Service role can manage instructors"
ON instructors
TO service_role
USING (true)
WITH CHECK (true);

-- Update RLS policies for students - super-admin sees all
DROP POLICY IF EXISTS "Users can read students from their organization" ON students;
DROP POLICY IF EXISTS "Instructors can update students from their organization" ON students;
DROP POLICY IF EXISTS "Admins can manage students from their organization" ON students;
DROP POLICY IF EXISTS "Service role can manage students" ON students;

DROP POLICY IF EXISTS "Super-admin can read all students" ON students;
CREATE POLICY "Super-admin can read all students"
ON students
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.email = 'admin@szkola.pl' OR u.raw_user_meta_data->>'role' = 'super_admin')
    )
    OR organization_id = (get_user_organization_context()->>'organization_id')::UUID
);

DROP POLICY IF EXISTS "Instructors can update students from their organization" ON students;
CREATE POLICY "Instructors can update students from their organization"
ON students
FOR UPDATE
TO authenticated
USING (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = students.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
)
WITH CHECK (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = students.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
);

DROP POLICY IF EXISTS "Org-admins can manage students in their organization" ON students;
CREATE POLICY "Org-admins can manage students in their organization"
ON students
TO authenticated
USING (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND get_user_organization_context()->>'role' = 'org_admin'
)
WITH CHECK (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND get_user_organization_context()->>'role' = 'org_admin'
);

DROP POLICY IF EXISTS "Service role can manage students" ON students;
CREATE POLICY "Service role can manage students"
ON students
TO service_role
USING (true)
WITH CHECK (true);

-- Update RLS policies for driving_lessons - super-admin sees all
DROP POLICY IF EXISTS "Users can read lessons from their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can update their own lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can insert their own lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can delete their own lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Admins can manage lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Service role can manage driving_lessons" ON driving_lessons;

DROP POLICY IF EXISTS "Super-admin can read all lessons" ON driving_lessons;
CREATE POLICY "Super-admin can read all lessons"
ON driving_lessons
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.email = 'admin@szkola.pl' OR u.raw_user_meta_data->>'role' = 'super_admin')
    )
    OR organization_id = (get_user_organization_context()->>'organization_id')::UUID
);

DROP POLICY IF EXISTS "Instructors can update their own lessons in their organization" ON driving_lessons;
CREATE POLICY "Instructors can update their own lessons in their organization"
ON driving_lessons
FOR UPDATE
TO authenticated
USING (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = driving_lessons.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
)
WITH CHECK (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
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
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
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
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.id = driving_lessons.instructor_id 
        AND instructors.auth_id::uuid = auth.uid()
    )
);

DROP POLICY IF EXISTS "Org-admins can manage lessons in their organization" ON driving_lessons;
CREATE POLICY "Org-admins can manage lessons in their organization"
ON driving_lessons
TO authenticated
USING (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND get_user_organization_context()->>'role' = 'org_admin'
)
WITH CHECK (
    organization_id = (get_user_organization_context()->>'organization_id')::UUID
    AND get_user_organization_context()->>'role' = 'org_admin'
);

DROP POLICY IF EXISTS "Service role can manage driving_lessons" ON driving_lessons;
CREATE POLICY "Service role can manage driving_lessons"
ON driving_lessons
TO service_role
USING (true)
WITH CHECK (true);

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_user_organization_context TO authenticated;

-- Comments
COMMENT ON TABLE organization_admins IS 'Organization admins (OSK chiefs) - can manage their organization';
COMMENT ON FUNCTION get_user_organization_context IS 'Helper function to get user organization context (org_id, role, is_super_admin)';
