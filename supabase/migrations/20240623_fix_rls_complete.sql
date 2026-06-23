-- ============================================================
-- KOMPLETNY RESET I NAPRAWA RLS DLA MULTI-TENANCY
-- Wklej CAŁY ten plik do SQL Editor i uruchom jednorazowo
-- ============================================================

-- ============================================================
-- 1. USUŃ WSZYSTKIE STARE POLITYKI RLS
-- ============================================================

-- Organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;

-- Instructors
DROP POLICY IF EXISTS "Users can read own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can update own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can insert own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can delete own instructors" ON instructors;
DROP POLICY IF EXISTS "Users can read instructors from their organization" ON instructors;
DROP POLICY IF EXISTS "Service role can manage instructors" ON instructors;
DROP POLICY IF EXISTS "Super-admin can read all instructors" ON instructors;
DROP POLICY IF EXISTS "Admins can manage instructors" ON instructors;

-- Students
DROP POLICY IF EXISTS "Users can read own students" ON students;
DROP POLICY IF EXISTS "Users can update own students" ON students;
DROP POLICY IF EXISTS "Users can insert own students" ON students;
DROP POLICY IF EXISTS "Users can delete own students" ON students;
DROP POLICY IF EXISTS "Users can read students from their organization" ON students;
DROP POLICY IF EXISTS "Instructors can update students from their organization" ON students;
DROP POLICY IF EXISTS "Admins can manage students from their organization" ON students;
DROP POLICY IF EXISTS "Service role can manage students" ON students;
DROP POLICY IF EXISTS "Super-admin can read all students" ON students;
DROP POLICY IF EXISTS "Org-admins can manage students in their organization" ON students;

-- Driving lessons
DROP POLICY IF EXISTS "Instructors can update their own lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can insert their own lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can delete their own lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Users can read lessons from their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can update their own lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can insert their own lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Instructors can delete their own lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Admins can manage lessons in their organization" ON driving_lessons;
DROP POLICY IF EXISTS "Service role can manage driving_lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Super-admin can read all lessons" ON driving_lessons;
DROP POLICY IF EXISTS "Org-admins can manage lessons in their organization" ON driving_lessons;

-- Organization admins
DROP POLICY IF EXISTS "Users can read their own organization admin profile" ON organization_admins;
DROP POLICY IF EXISTS "Service role can manage organization_admins" ON organization_admins;

-- ============================================================
-- 2. HELPER FUNCTION - sprawdza czy user jest super-adminem
-- ============================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
            email = 'admin@szkola.pl'
            OR raw_user_meta_data->>'role' = 'super_admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. HELPER FUNCTION - zwraca organization_id bieżącego usera
-- ============================================================

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
    
    -- Sprawdź czy instructor (auth_id może być TEXT lub UUID)
    SELECT organization_id INTO v_org_id
    FROM instructors
    WHERE auth_id::text = auth.uid()::text
    LIMIT 1;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_organization_id TO authenticated;

-- ============================================================
-- 3.5. USUŃ NOWE POLITYKI (jeśli istnieją) - idempotentność
-- ============================================================

DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "organizations_delete" ON organizations;
DROP POLICY IF EXISTS "organizations_service_role" ON organizations;

DROP POLICY IF EXISTS "instructors_select" ON instructors;
DROP POLICY IF EXISTS "instructors_insert" ON instructors;
DROP POLICY IF EXISTS "instructors_update" ON instructors;
DROP POLICY IF EXISTS "instructors_delete" ON instructors;
DROP POLICY IF EXISTS "instructors_service_role" ON instructors;

DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_insert" ON students;
DROP POLICY IF EXISTS "students_update" ON students;
DROP POLICY IF EXISTS "students_delete" ON students;
DROP POLICY IF EXISTS "students_service_role" ON students;

DROP POLICY IF EXISTS "driving_lessons_select" ON driving_lessons;
DROP POLICY IF EXISTS "driving_lessons_insert" ON driving_lessons;
DROP POLICY IF EXISTS "driving_lessons_update" ON driving_lessons;
DROP POLICY IF EXISTS "driving_lessons_delete" ON driving_lessons;
DROP POLICY IF EXISTS "driving_lessons_service_role" ON driving_lessons;

DROP POLICY IF EXISTS "org_admins_select" ON organization_admins;
DROP POLICY IF EXISTS "org_admins_insert" ON organization_admins;
DROP POLICY IF EXISTS "org_admins_update" ON organization_admins;
DROP POLICY IF EXISTS "org_admins_delete" ON organization_admins;
DROP POLICY IF EXISTS "org_admins_service_role" ON organization_admins;

-- ============================================================
-- 4. POLITYKI RLS - ORGANIZATIONS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select"
ON organizations FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR id = get_my_organization_id()
);

CREATE POLICY "organizations_insert"
ON organizations FOR INSERT TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "organizations_update"
ON organizations FOR UPDATE TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "organizations_delete"
ON organizations FOR DELETE TO authenticated
USING (is_super_admin());

CREATE POLICY "organizations_service_role"
ON organizations TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 4.5. POLITYKI RLS - ORGANIZATION_ADMINS
-- ============================================================

ALTER TABLE organization_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_admins FORCE ROW LEVEL SECURITY;

CREATE POLICY "org_admins_select"
ON organization_admins FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR auth_id = auth.uid()
);

CREATE POLICY "org_admins_insert"
ON organization_admins FOR INSERT TO authenticated
WITH CHECK (
    is_super_admin()
);

CREATE POLICY "org_admins_update"
ON organization_admins FOR UPDATE TO authenticated
USING (
    is_super_admin()
)
WITH CHECK (
    is_super_admin()
);

CREATE POLICY "org_admins_delete"
ON organization_admins FOR DELETE TO authenticated
USING (
    is_super_admin()
);

CREATE POLICY "org_admins_service_role"
ON organization_admins TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 5. POLITYKI RLS - INSTRUCTORS
-- ============================================================

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors FORCE ROW LEVEL SECURITY;

-- SELECT: super_admin widzi wszystko, reszta tylko swoją org
CREATE POLICY "instructors_select"
ON instructors FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

-- INSERT: super_admin lub org_admin/admin swojej org
CREATE POLICY "instructors_insert"
ON instructors FOR INSERT TO authenticated
WITH CHECK (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

-- UPDATE
CREATE POLICY "instructors_update"
ON instructors FOR UPDATE TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
)
WITH CHECK (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

-- DELETE
CREATE POLICY "instructors_delete"
ON instructors FOR DELETE TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "instructors_service_role"
ON instructors TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 6. POLITYKI RLS - STUDENTS
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;

CREATE POLICY "students_select"
ON students FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "students_insert"
ON students FOR INSERT TO authenticated
WITH CHECK (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "students_update"
ON students FOR UPDATE TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
)
WITH CHECK (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "students_delete"
ON students FOR DELETE TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "students_service_role"
ON students TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 7. POLITYKI RLS - DRIVING_LESSONS
-- ============================================================

ALTER TABLE driving_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE driving_lessons FORCE ROW LEVEL SECURITY;

CREATE POLICY "driving_lessons_select"
ON driving_lessons FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "driving_lessons_insert"
ON driving_lessons FOR INSERT TO authenticated
WITH CHECK (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "driving_lessons_update"
ON driving_lessons FOR UPDATE TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
)
WITH CHECK (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "driving_lessons_delete"
ON driving_lessons FOR DELETE TO authenticated
USING (
    is_super_admin()
    OR organization_id = get_my_organization_id()
);

CREATE POLICY "driving_lessons_service_role"
ON driving_lessons TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 9. KASKADOWE USUWANIE ORGANIZACJI
-- ============================================================

CREATE OR REPLACE FUNCTION delete_organization_cascade(target_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Tylko super-admin może usuwać organizacje';
    END IF;

    -- Usuń konta auth instruktorów tej organizacji (kaskaduje instructors, organization_admins, notifications, settings)
    DELETE FROM auth.users
    WHERE id IN (SELECT auth_id::uuid FROM instructors WHERE organization_id = target_org_id);

    -- Usuń konta auth szefów tej organizacji (kaskaduje organization_admins, notifications, settings)
    DELETE FROM auth.users
    WHERE id IN (SELECT auth_id FROM organization_admins WHERE organization_id = target_org_id);

    -- Usuń organizację (kaskaduje students, driving_lessons)
    DELETE FROM organizations WHERE id = target_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_organization_cascade TO authenticated;
GRANT EXECUTE ON FUNCTION delete_organization_cascade TO service_role;

-- ============================================================
-- 10. FIX NOTIFICATION TYPES - trigery używają innych nazw niż constraint
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'lesson_created',
  'lesson_started',
  'lesson_updated',
  'lesson_cancelled',
  'lesson_completed',
  'lesson_deleted',
  'student_assigned',
  'student_removed',
  'student_created',
  'student_updated',
  'student_deleted',
  'instructor_created',
  'instructor_updated',
  'instructor_removed',
  'instructor_deleted',
  'checklist_reminder',
  'checklist_completed',
  'checklist_overdue'
));

-- ============================================================
-- GOTOWE
-- ============================================================
