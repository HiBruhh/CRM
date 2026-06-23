-- ============================================================
-- DODATKOWE DANE TESTOWE (do uruchomienia po seed_multitenant.sql)
-- ============================================================
-- Dodaje więcej kursantów, instruktorów i jazd do organizacji Alfa/Beta,
-- żeby mieć więcej rekordów podczas testowania nowych funkcji.
--
-- Wymaga wcześniejszego uruchomienia seed_multitenant.sql oraz
-- ręcznego utworzenia kont w Dashboard (jeśli dodajesz nowych instruktorów/szefów).
-- ============================================================

-- 1. DODATKOWI INSTRUKTORZY
-- ------------------------------------------------------------
WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa')
INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Robert', 'Lewandowski', 'inst.alfa3@szkola.pl', '501103333', 'L/12347/2020', 'active'
FROM alfa o, auth.users u WHERE u.email = 'inst.alfa3@szkola.pl'
ON CONFLICT DO NOTHING;

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta')
INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Robert', 'Kubica', 'inst.beta3@szkola.pl', '502203333', 'L/22347/2021', 'active'
FROM beta o, auth.users u WHERE u.email = 'inst.beta3@szkola.pl'
ON CONFLICT DO NOTHING;

-- Instruktor na urlopie (nieaktywny) w Alfi
WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa')
INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Kamil', 'Stoch', 'inst.alfa4@szkola.pl', '501104444', 'L/12348/2020', 'inactive'
FROM alfa o, auth.users u WHERE u.email = 'inst.alfa4@szkola.pl'
ON CONFLICT DO NOTHING;

-- 2. DODATKOWI KURSANCI
-- ------------------------------------------------------------
WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.alfa1@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Krzysztof', 'Ibisz', 'krzysztof.i@example.com', '600111333', 'ALFA-005', 'ul. Słoneczna 5', 'B', 'active', 0, 30
FROM alfa o, instr i
ON CONFLICT DO NOTHING;

WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.alfa2@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Mariusz', 'Pudzianowski', 'mariusz.p@example.com', '600111444', 'ALFA-006', 'ul. Słoneczna 6', 'B', 'active', 28, 30
FROM alfa o, instr i
ON CONFLICT DO NOTHING;

WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.alfa3@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Marcin', 'Gortat', 'marcin.g@example.com', '600111555', 'ALFA-007', 'ul. Słoneczna 7', 'C', 'active', 5, 20
FROM alfa o, instr i
ON CONFLICT DO NOTHING;

WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.alfa1@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Justyna', 'Kowalczyk', 'justyna.k@example.com', '600111666', 'ALFA-008', 'ul. Słoneczna 8', 'B', 'paused', 12, 30
FROM alfa o, instr i
ON CONFLICT DO NOTHING;

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.beta1@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Zbigniew', 'Boniek', 'zbigniew.b@example.com', '600222555', 'BETA-005', 'ul. Księżycowa 5', 'B', 'active', 0, 30
FROM beta o, instr i
ON CONFLICT DO NOTHING;

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.beta2@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Andrzej', 'Gołota', 'andrzej.g@example.com', '600222666', 'BETA-006', 'ul. Księżycowa 6', 'B', 'active', 29, 30
FROM beta o, instr i
ON CONFLICT DO NOTHING;

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.beta3@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Tadeusz', 'Norek', 'tadeusz.n@example.com', '600222777', 'BETA-007', 'ul. Księżycowa 7', 'C', 'active', 8, 20
FROM beta o, instr i
ON CONFLICT DO NOTHING;

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta'),
     instr AS (SELECT id FROM instructors WHERE email = 'inst.beta1@szkola.pl')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Iga', 'Świątek', 'iga.s@example.com', '600222888', 'BETA-008', 'ul. Księżycowa 8', 'B', 'completed', 30, 30
FROM beta o, instr i
ON CONFLICT DO NOTHING;

-- 3. DODATKOWE JAZDY
-- ------------------------------------------------------------
-- Jazdy dla nowych kursantów Alfy
INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '2 days' + interval '9 hours')::timestamp,
       (CURRENT_DATE + interval '2 days' + interval '10 hours')::timestamp,
       'pending', 60, 'Pierwsza jazda - zapoznanie'
FROM students s WHERE s.student_id = 'ALFA-005';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '2 days' + interval '10 hours')::timestamp,
       (CURRENT_DATE + interval '2 days' + interval '11 hours')::timestamp,
       'pending', 60, 'Przed egzaminem'
FROM students s WHERE s.student_id = 'ALFA-006';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE - interval '2 days' + interval '14 hours')::timestamp,
       (CURRENT_DATE - interval '2 days' + interval '15 hours')::timestamp,
       'completed', 60, 'Kategoria C - manewry'
FROM students s WHERE s.student_id = 'ALFA-007';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '3 days' + interval '11 hours')::timestamp,
       (CURRENT_DATE + interval '3 days' + interval '12 hours')::timestamp,
       'cancelled', 60, 'Odwołana - choroba'
FROM students s WHERE s.student_id = 'ALFA-008';

-- Jazdy dla nowych kursantów Bety
INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '2 days' + interval '10 hours')::timestamp,
       (CURRENT_DATE + interval '2 days' + interval '11 hours')::timestamp,
       'pending', 60, 'Pierwsza jazda'
FROM students s WHERE s.student_id = 'BETA-005';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE - interval '1 day' + interval '9 hours')::timestamp,
       (CURRENT_DATE - interval '1 day' + interval '10 hours')::timestamp,
       'completed', 60, 'Ostatnia jazda przed egzaminem'
FROM students s WHERE s.student_id = 'BETA-006';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '1 day' + interval '15 hours')::timestamp,
       (CURRENT_DATE + interval '1 day' + interval '16 hours')::timestamp,
       'pending', 60, 'Jazda wieczorna'
FROM students s WHERE s.student_id = 'BETA-007';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE - interval '3 days' + interval '11 hours')::timestamp,
       (CURRENT_DATE - interval '3 days' + interval '12 hours')::timestamp,
       'completed', 60, 'Zakończony kurs'
FROM students s WHERE s.student_id = 'BETA-008';

-- 4. PODSUMOWANIE
-- ------------------------------------------------------------
SELECT
  o.name AS organizacja,
  (SELECT COUNT(*) FROM instructors WHERE organization_id = o.id) AS instruktorzy,
  (SELECT COUNT(*) FROM students WHERE organization_id = o.id) AS kursanci,
  (SELECT COUNT(*) FROM driving_lessons WHERE organization_id = o.id) AS jazdy
FROM organizations o
WHERE o.slug IN ('szkola-alfa', 'szkola-beta')
ORDER BY o.name;
