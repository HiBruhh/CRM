-- ============================================================
-- Moja Flota - struktura tabel i polityk RLS
-- ============================================================
-- Tworzy tabele vehicles oraz fuel_reports z izolacją danych
-- na poziomie organizacji. Szef i super_admin mają pełny CRUD.
-- Instruktor może odczytywać pojazdy (potrzebne do raportu paliwa)
-- oraz dodawać / czytać własne wpisy w fuel_reports.
-- ============================================================

--- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    production_year INTEGER,
    registration_plate TEXT NOT NULL,
    vin TEXT UNIQUE,
    engine_capacity TEXT,
    fuel_type TEXT,
    transmission TEXT,
    license_category TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'service')),
    insurance_expiry DATE,
    inspection_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--- Fuel reports table
CREATE TABLE IF NOT EXISTS fuel_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL,
    fuel_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    current_mileage INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_organization_id ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_plate ON vehicles(registration_plate);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_vehicle_id ON fuel_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_organization_id ON fuel_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_instructor_id ON fuel_reports(instructor_id);
CREATE INDEX IF NOT EXISTS idx_fuel_reports_receipt_date ON fuel_reports(receipt_date);

--- Updated_at triggers
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fuel_reports_updated_at ON fuel_reports;
CREATE TRIGGER update_fuel_reports_updated_at
    BEFORE UPDATE ON fuel_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_reports ENABLE ROW LEVEL SECURITY;

--- Helper: is the caller a super_admin?
-- Used in policies below.

--- VEHICLES POLICIES
-- Szef / super_admin: full CRUD within own organization
DROP POLICY IF EXISTS org_admin_vehicles_all ON vehicles;
CREATE POLICY org_admin_vehicles_all ON vehicles
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_admins WHERE auth_id::uuid = auth.uid()
        )
        OR is_super_admin()
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_admins WHERE auth_id::uuid = auth.uid()
        )
        OR is_super_admin()
    );

-- Instruktor: SELECT vehicles in own organization (needed to add fuel reports)
DROP POLICY IF EXISTS instructor_vehicles_select ON vehicles;
CREATE POLICY instructor_vehicles_select ON vehicles
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM instructors WHERE auth_id::uuid = auth.uid()
        )
    );

--- FUEL REPORTS POLICIES
-- Szef / super_admin: full CRUD within own organization
DROP POLICY IF EXISTS org_admin_fuel_reports_all ON fuel_reports;
CREATE POLICY org_admin_fuel_reports_all ON fuel_reports
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_admins WHERE auth_id::uuid = auth.uid()
        )
        OR is_super_admin()
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_admins WHERE auth_id::uuid = auth.uid()
        )
        OR is_super_admin()
    );

-- Instruktor: INSERT fuel reports for own organization
DROP POLICY IF EXISTS instructor_fuel_reports_insert ON fuel_reports;
CREATE POLICY instructor_fuel_reports_insert ON fuel_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM instructors WHERE auth_id::uuid = auth.uid()
        )
    );

-- Instruktor: SELECT own fuel reports
DROP POLICY IF EXISTS instructor_fuel_reports_select_own ON fuel_reports;
CREATE POLICY instructor_fuel_reports_select_own ON fuel_reports
    FOR SELECT
    TO authenticated
    USING (
        instructor_id IN (
            SELECT id FROM instructors WHERE auth_id::uuid = auth.uid()
        )
    );
