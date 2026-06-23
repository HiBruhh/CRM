-- Zaktualizuj check constraint, aby zezwolić na status 'in_progress'
ALTER TABLE driving_lessons DROP CONSTRAINT IF EXISTS driving_lessons_status_check;
ALTER TABLE driving_lessons ADD CONSTRAINT driving_lessons_status_check
  CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- Funkcja do automatycznej aktualizacji statusów jazd
CREATE OR REPLACE FUNCTION update_lesson_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Dane w bazie są teraz TIMESTAMP WITHOUT TIME ZONE (czas lokalny)
    -- Dodajemy 2 godziny do UTC aby uzyskać czas lokalny (Europe/Warsaw)
    DECLARE
        local_now TIMESTAMP := NOW() + INTERVAL '2 hours';
    BEGIN
        -- Debug logging
        RAISE NOTICE 'Lesson status update: start_time=%, end_time=%, local_now=%, current_status=%', 
            NEW.start_time, NEW.end_time, local_now, NEW.status;
        
        -- Zmień status z 'pending'/'confirmed' na 'in_progress' jeśli lekcja się zaczęła
        IF NEW.status IN ('pending', 'confirmed') AND NEW.start_time <= local_now THEN
            IF NEW.end_time <= local_now THEN
                -- Jeśli lekcja się zakończyła, zmień na 'completed'
                RAISE NOTICE 'Setting status to completed';
                NEW.status := 'completed';
            ELSE
                -- Jeśli się zaczęła, zmień na 'in_progress'
                RAISE NOTICE 'Setting status to in_progress';
                NEW.status := 'in_progress';
            END IF;
        END IF;
        
        -- Zmień status z 'in_progress' na 'completed' jeśli lekcja się zakończyła
        IF NEW.status = 'in_progress' AND NEW.end_time <= local_now THEN
            RAISE NOTICE 'Setting status to completed from in_progress';
            NEW.status := 'completed';
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Usuwamy trigger, aby nie nadpisywał statusu przy tworzeniu jazdy
DROP TRIGGER IF EXISTS on_lesson_insert_or_update ON driving_lessons;

-- Funkcja do masowej aktualizacji statusów (wywoływana okresowo)
CREATE OR REPLACE FUNCTION bulk_update_lesson_statuses()
RETURNS void AS $$
BEGIN
    -- Dane w bazie są teraz TIMESTAMP WITHOUT TIME ZONE (czas lokalny)
    -- Dodajemy 2 godziny do UTC aby uzyskać czas lokalny (Europe/Warsaw)
    DECLARE
        local_now TIMESTAMP := NOW() + INTERVAL '2 hours';
    BEGIN
        UPDATE driving_lessons
        SET status = CASE
            WHEN end_time <= local_now THEN 'completed'
            ELSE 'in_progress'
        END
        WHERE status IN ('pending', 'confirmed')
        AND start_time <= local_now;
        
        -- Zmień in_progress na completed jeśli lekcja się zakończyła
        UPDATE driving_lessons
        SET status = 'completed'
        WHERE status = 'in_progress'
        AND end_time <= local_now;
    END;
END;
$$ LANGUAGE plpgsql;

-- Nie wywołujemy funkcji automatycznie, aby nie aktualizować istniejących lekcji
-- SELECT bulk_update_lesson_statuses();
