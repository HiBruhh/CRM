-- Create organizations table for multi-tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- Internal identifier (e.g., szkola-warszawa)
    logo_url TEXT,
    primary_color TEXT DEFAULT '#4F46E5', -- Brand color
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    max_instructors INTEGER DEFAULT 5, -- Plan limits
    max_students INTEGER DEFAULT 100, -- Plan limits
    subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'enterprise')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    billing_email TEXT,
    billing_address JSONB,
    settings JSONB DEFAULT '{}'::jsonb, -- Organization-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Add organization_id to existing tables
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE driving_lessons ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for organization_id
CREATE INDEX IF NOT EXISTS idx_instructors_organization_id ON instructors(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_organization_id ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_organization_id ON driving_lessons(organization_id);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
ON organizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM instructors 
        WHERE instructors.organization_id = organizations.id 
        AND instructors.auth_id::uuid = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND u.raw_user_meta_data->>'role' = 'admin'
    )
);

DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;
CREATE POLICY "Service role can manage organizations"
ON organizations
TO service_role
USING (true)
WITH CHECK (true);

-- Comments
COMMENT ON TABLE organizations IS 'Organizations/Schools for multi-tenancy CRM system';
COMMENT ON COLUMN organizations.slug IS 'Internal identifier for the organization';
COMMENT ON COLUMN organizations.max_instructors IS 'Maximum number of instructors based on subscription plan';
COMMENT ON COLUMN organizations.max_students IS 'Maximum number of students based on subscription plan';
