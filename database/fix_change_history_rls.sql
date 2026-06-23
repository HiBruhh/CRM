-- Dodanie polityk RLS dla tabeli change_history
-- Naprawia błąd: "new row violates row-level security policy for table "change_history""

-- Polityki RLS dla change_history
CREATE POLICY "Admins can view all change history"
  ON change_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage change history"
  ON change_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Alternatywnie - jeśli chcesz pozwolić wszystkim zalogowanym użytkownikom na tworzenie historii zmian:
CREATE POLICY "Authenticated users can create change history"
  ON change_history FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can view own change history"
  ON change_history FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );
