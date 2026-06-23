-- Migracja: usunięcie statusu 'confirmed' z systemu
-- Status 'confirmed' (Potwierdzona) zostaje całkowicie usunięty.
-- Istniejące rekordy z statusem 'confirmed' migrują do 'pending'.
-- Finalny zestaw statusów: pending, in_progress, completed, cancelled.

-- Dodanie komentarza do tabeli driving_lessons
COMMENT ON TABLE driving_lessons IS 'Tabela jazd - statusy: pending=Oczekująca, in_progress=W trakcie, completed=Zakończona, cancelled=Odwołana';

-- Migracja istniejących danych
UPDATE driving_lessons SET status = 'pending' WHERE status = 'confirmed';

-- Aktualizacja constraint CHECK
ALTER TABLE driving_lessons DROP CONSTRAINT IF EXISTS driving_lessons_status_check;
ALTER TABLE driving_lessons ADD CONSTRAINT driving_lessons_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
