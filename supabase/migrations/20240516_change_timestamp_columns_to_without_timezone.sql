-- Zmień kolumny czasu na TIMESTAMP WITHOUT TIME ZONE
-- Dzięki temu czas będzie zapisywany bezpośrednio jako czas lokalny

ALTER TABLE driving_lessons 
ALTER COLUMN start_time TYPE TIMESTAMP WITHOUT TIME ZONE,
ALTER COLUMN end_time TYPE TIMESTAMP WITHOUT TIME ZONE;
