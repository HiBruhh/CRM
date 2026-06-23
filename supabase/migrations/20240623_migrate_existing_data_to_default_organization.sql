-- Migrate existing data to default organization
DO $$
DECLARE
    v_default_org_id UUID;
BEGIN
    -- Create default organization if it doesn't exist
    INSERT INTO organizations (name, slug, status, subscription_plan)
    VALUES (
        'Domyślna Organizacja',
        'default-organization',
        'active',
        'basic'
    )
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO v_default_org_id
    FROM organizations
    WHERE slug = 'default-organization'
    LIMIT 1;
    
    IF v_default_org_id IS NOT NULL THEN
        -- Update existing instructors to belong to default organization
        UPDATE instructors
        SET organization_id = v_default_org_id
        WHERE organization_id IS NULL;
        
        -- Update existing students to belong to default organization
        UPDATE students
        SET organization_id = v_default_org_id
        WHERE organization_id IS NULL;
        
        -- Update existing driving lessons to belong to default organization
        UPDATE driving_lessons
        SET organization_id = v_default_org_id
        WHERE organization_id IS NULL;
        
        RAISE NOTICE 'Existing data migrated to default organization: %', v_default_org_id;
    ELSE
        RAISE NOTICE 'Default organization not found';
    END IF;
END $$;

-- Make organization_id NOT NULL after migration
ALTER TABLE instructors ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE driving_lessons ALTER COLUMN organization_id SET NOT NULL;

-- Add comment
COMMENT ON COLUMN instructors.organization_id IS 'Organization ID for multi-tenancy - required field';
COMMENT ON COLUMN students.organization_id IS 'Organization ID for multi-tenancy - required field';
COMMENT ON COLUMN driving_lessons.organization_id IS 'Organization ID for multi-tenancy - required field';
