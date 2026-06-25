-- Allow students to read their organization by extending get_my_organization_id()
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Sprawdź czy org_admin
    SELECT organization_id INTO v_org_id
    FROM organization_admins
    WHERE auth_id::text = auth.uid()::text
    AND status = 'active'
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
        RETURN v_org_id;
    END IF;

    -- Sprawdź czy instructor
    SELECT organization_id INTO v_org_id
    FROM instructors
    WHERE auth_id::text = auth.uid()::text
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
        RETURN v_org_id;
    END IF;

    -- Sprawdź czy student
    SELECT organization_id INTO v_org_id
    FROM students
    WHERE auth_id::text = auth.uid()::text
    LIMIT 1;

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
