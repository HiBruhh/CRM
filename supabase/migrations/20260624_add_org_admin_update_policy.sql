-- Allow organization admins to update their own organization (name, logo_url, etc.)
DROP POLICY IF EXISTS "Org admins can update their organization" ON organizations;
CREATE POLICY "Org admins can update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_admins
        WHERE organization_admins.organization_id = organizations.id
        AND organization_admins.auth_id::uuid = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_admins
        WHERE organization_admins.organization_id = organizations.id
        AND organization_admins.auth_id::uuid = auth.uid()
    )
);
