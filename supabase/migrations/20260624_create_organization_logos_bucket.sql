-- Create a public storage bucket for organization logos
insert into storage.buckets (id, name, public)
values ('organization-logos', 'organization-logos', true)
on conflict (id) do nothing;

-- Allow anyone to read logo files
DROP POLICY IF EXISTS "Public can read organization logos" ON storage.objects;
CREATE POLICY "Public can read organization logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- Allow org admins to upload/update logos only inside their own organization folder
DROP POLICY IF EXISTS "Org admins can upload logos" ON storage.objects;
CREATE POLICY "Org admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'organization-logos'
    AND EXISTS (
        SELECT 1 FROM organization_admins
        WHERE organization_admins.auth_id::uuid = auth.uid()
        AND name LIKE organization_admins.organization_id::text || '/%'
    )
);

DROP POLICY IF EXISTS "Org admins can update logos" ON storage.objects;
CREATE POLICY "Org admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'organization-logos'
    AND EXISTS (
        SELECT 1 FROM organization_admins
        WHERE organization_admins.auth_id::uuid = auth.uid()
        AND name LIKE organization_admins.organization_id::text || '/%'
    )
)
WITH CHECK (
    bucket_id = 'organization-logos'
    AND EXISTS (
        SELECT 1 FROM organization_admins
        WHERE organization_admins.auth_id::uuid = auth.uid()
        AND name LIKE organization_admins.organization_id::text || '/%'
    )
);

-- Allow org admins to delete logos inside their own organization folder
DROP POLICY IF EXISTS "Org admins can delete logos" ON storage.objects;
CREATE POLICY "Org admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'organization-logos'
    AND EXISTS (
        SELECT 1 FROM organization_admins
        WHERE organization_admins.auth_id::uuid = auth.uid()
        AND name LIKE organization_admins.organization_id::text || '/%'
    )
);
