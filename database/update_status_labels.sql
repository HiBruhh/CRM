-- Aktualizacja etykiet statusów w bazie danych
-- Zmiana interpretacji statusu 'confirmed' na 'W trakcie' zamiast 'Potwierdzona'

-- Dodanie komentarza do tabeli driving_lessons dla wyjaśnienia statusów
COMMENT ON TABLE driving_lessons IS 'Tabela jazd - statusy: pending=Oczekująca, confirmed=W trakcie, completed=Zakończona, cancelled=Odwołana';

-- Ewentualna migracja istniejących danych (jeśli trzeba zmienić nazwy statusów)
-- UWAGA: Poniższe polecenia są opcjonalne - tylko jeśli chcemy zmienić nazwy statusów w bazie

-- Jeśli chcemy zmienić nazwę statusu z 'confirmed' na 'in_progress':
-- UPDATE driving_lessons SET status = 'in_progress' WHERE status = 'confirmed';
-- ALTER TABLE driving_lessons DROP CONSTRAINT IF EXISTS driving_lessons_status_check;
-- ALTER TABLE driving_lessons ADD CONSTRAINT driving_lessons_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Jeśli zostajemy przy 'confirmed' ale zmieniamy tylko etykiety w UI:
-- Nic nie trzeba zmieniać w bazie danych - status 'confirmed' oznacza teraz 'W trakcie'
