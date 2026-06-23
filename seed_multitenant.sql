-- ============================================================
-- SEED DO TESTOWANIA SEPARACJI DANYCH MIĘDZY ORGANIZACJAMI
-- ============================================================
-- Uruchom w Supabase SQL Editor.
-- Tworzy 2 organizacje, 2 szefów (org_admin), 4 instruktorów,
-- 8 kursantów i kilkanaście jazd. Każda organizacja ma własne dane.
-- Hasło dla wszystkich testowych kont: test123
-- ============================================================
-- UWAGA: skrypt najpierw usuwa stare dane testowe, potem wstawia nowe.
-- Można go uruchamiać wielokrotnie.
--
-- WAŻNE: Użytkowników w auth.users trzeba stworzyć RĘCZNIE w Supabase
-- Dashboard (Authentication → Users → Add user), bo SQL-owe crypt()
-- nie jest kompatybilne z haszowaniem Supabase Auth.
--
-- Utwórz 6 kont z hasłem test123:
--   szef.alfa@szkola.pl, szef.beta@szkola.pl,
--   inst.alfa1@szkola.pl, inst.alfa2@szkola.pl,
--   inst.beta1@szkola.pl, inst.beta2@szkola.pl
--
-- W metadata ustaw role: org_admin dla szefów, instructor dla instruktorów.
--
-- Jeśli Dashboard zwraca "Database error creating new user" — uruchom najpierw
-- poniższy blok czyszczący, a potem dodaj użytkowników w Dashboard.
-- ============================================================

-- CZYSZCZENIE AUTH (uruchom osobno, jeśli potrzeba)
-- ------------------------------------------------------------
-- DELETE FROM auth.sessions WHERE user_id IN (
--   SELECT id FROM auth.users WHERE email IN (
--     'szef.alfa@szkola.pl', 'szef.beta@szkola.pl',
--     'inst.alfa1@szkola.pl', 'inst.alfa2@szkola.pl',
--     'inst.beta1@szkola.pl', 'inst.beta2@szkola.pl'
--   )
-- );
-- DELETE FROM auth.identities WHERE user_id IN (
--   SELECT id FROM auth.users WHERE email IN (
--     'szef.alfa@szkola.pl', 'szef.beta@szkola.pl',
--     'inst.alfa1@szkola.pl', 'inst.alfa2@szkola.pl',
--     'inst.beta1@szkola.pl', 'inst.beta2@szkola.pl'
--   )
-- );
-- DELETE FROM auth.users WHERE email IN (
--   'szef.alfa@szkola.pl', 'szef.beta@szkola.pl',
--   'inst.alfa1@szkola.pl', 'inst.alfa2@szkola.pl',
--   'inst.beta1@szkola.pl', 'inst.beta2@szkola.pl'
-- );

-- 0. CZYSZCZENIE STARYCH DANYCH TESTOWYCH
-- Ustawiamy auth_id = NULL starym instruktorom z organizacji testowych,
-- żeby trigger powiadomień nie próbował wysłać ich do nieistniejących
-- użytkowników auth podczas cleanup.
-- ------------------------------------------------------------
UPDATE instructors
SET auth_id = NULL
WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug IN ('szkola-alfa', 'szkola-beta')
);

DELETE FROM driving_lessons WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug IN ('szkola-alfa', 'szkola-beta')
);
DELETE FROM students WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug IN ('szkola-alfa', 'szkola-beta')
);
DELETE FROM instructors WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug IN ('szkola-alfa', 'szkola-beta')
);
DELETE FROM organization_admins WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug IN ('szkola-alfa', 'szkola-beta')
);
DELETE FROM organizations WHERE slug IN ('szkola-alfa', 'szkola-beta');

-- 1. ORGANIZACJE
-- ------------------------------------------------------------
INSERT INTO organizations (name, slug, status)
VALUES
  ('Szkoła Jazdy Alfa', 'szkola-alfa', 'active'),
  ('Szkoła Jazdy Beta', 'szkola-beta', 'active');

-- Użytkowników auth.users utwórz ręcznie w Supabase Dashboard (patrz komentarz na górze)

-- Ustaw role w metadata (jeśli nie ustawiłeś ich w Dashboard)
UPDATE auth.users SET raw_user_meta_data = '{"role": "org_admin"}' WHERE email IN ('szef.alfa@szkola.pl', 'szef.beta@szkola.pl');
UPDATE auth.users SET raw_user_meta_data = '{"role": "instructor"}' WHERE email IN ('inst.alfa1@szkola.pl', 'inst.alfa2@szkola.pl', 'inst.beta1@szkola.pl', 'inst.beta2@szkola.pl');

-- 2. SZEFOWIE ORGANIZACJI (organization_admins)
-- ------------------------------------------------------------
INSERT INTO organization_admins (auth_id, organization_id, first_name, last_name, email, phone, status)
SELECT u.id, o.id, 'Jan', 'Kowalski', 'szef.alfa@szkola.pl', '500100101', 'active'
FROM auth.users u, organizations o
WHERE u.email = 'szef.alfa@szkola.pl' AND o.slug = 'szkola-alfa';

INSERT INTO organization_admins (auth_id, organization_id, first_name, last_name, email, phone, status)
SELECT u.id, o.id, 'Anna', 'Nowak', 'szef.beta@szkola.pl', '500200202', 'active'
FROM auth.users u, organizations o
WHERE u.email = 'szef.beta@szkola.pl' AND o.slug = 'szkola-beta';

-- 3. INSTRUKTORZY
-- ------------------------------------------------------------
INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Piotr', 'Wiśniewski', 'inst.alfa1@szkola.pl', '501101111', 'L/12345/2020', 'active'
FROM auth.users u, organizations o
WHERE u.email = 'inst.alfa1@szkola.pl' AND o.slug = 'szkola-alfa';

INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Michał', 'Zieliński', 'inst.alfa2@szkola.pl', '501102222', 'L/12346/2020', 'active'
FROM auth.users u, organizations o
WHERE u.email = 'inst.alfa2@szkola.pl' AND o.slug = 'szkola-alfa';

INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Tomasz', 'Mazur', 'inst.beta1@szkola.pl', '502201111', 'L/22345/2021', 'active'
FROM auth.users u, organizations o
WHERE u.email = 'inst.beta1@szkola.pl' AND o.slug = 'szkola-beta';

INSERT INTO instructors (auth_id, organization_id, first_name, last_name, email, phone, license_number, status)
SELECT u.id, o.id, 'Krzysztof', 'Krawczyk', 'inst.beta2@szkola.pl', '502202222', 'L/22346/2021', 'active'
FROM auth.users u, organizations o
WHERE u.email = 'inst.beta2@szkola.pl' AND o.slug = 'szkola-beta';

-- 4. KURSANCI
-- ------------------------------------------------------------
WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Adam', 'Malinowski', 'adam.m@example.com', '600111111', 'ALFA-001', 'ul. Polna 1', 'B', 'active', 5, 30
FROM alfa o, instructors i WHERE i.email = 'inst.alfa1@szkola.pl';

WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Ewa', 'Dąbrowska', 'ewa.d@example.com', '600111222', 'ALFA-002', 'ul. Leśna 2', 'B', 'active', 12, 30
FROM alfa o, instructors i WHERE i.email = 'inst.alfa2@szkola.pl';

WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Katarzyna', 'Szymańska', 'kasia.s@example.com', '600111333', 'ALFA-003', 'ul. Słoneczna 3', 'A', 'active', 0, 20
FROM alfa o, instructors i WHERE i.email = 'inst.alfa1@szkola.pl';

WITH alfa AS (SELECT id FROM organizations WHERE slug = 'szkola-alfa')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Marcin', 'Lewandowski', 'marcin.l@example.com', '600111444', 'ALFA-004', 'ul. Kwiatowa 4', 'B', 'active', 28, 30
FROM alfa o, instructors i WHERE i.email = 'inst.alfa2@szkola.pl';

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Bartosz', 'Wójcik', 'bartek.w@example.com', '600222111', 'BETA-001', 'ul. Ogrodowa 5', 'B', 'active', 8, 30
FROM beta o, instructors i WHERE i.email = 'inst.beta1@szkola.pl';

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Magdalena', 'Kubiak', 'magda.k@example.com', '600222222', 'BETA-002', 'ul. Parkowa 6', 'B', 'active', 15, 30
FROM beta o, instructors i WHERE i.email = 'inst.beta2@szkola.pl';

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Paweł', 'Zawadzki', 'pawel.z@example.com', '600222333', 'BETA-003', 'ul. Rycerska 7', 'C', 'active', 2, 20
FROM beta o, instructors i WHERE i.email = 'inst.beta1@szkola.pl';

WITH beta AS (SELECT id FROM organizations WHERE slug = 'szkola-beta')
INSERT INTO students (organization_id, instructor_id, first_name, last_name, email, phone, student_id, address, category, status, completed_hours, required_hours)
SELECT o.id, i.id, 'Aleksandra', 'Pawlak', 'ola.p@example.com', '600222444', 'BETA-004', 'ul. Morska 8', 'B', 'active', 25, 30
FROM beta o, instructors i WHERE i.email = 'inst.beta2@szkola.pl';

-- 5. JAZDY (driving_lessons)
-- Jazdy dla ALFA
-- ------------------------------------------------------------
INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '9 hours')::timestamp,
       (CURRENT_DATE + interval '10 hours')::timestamp,
       'completed', 60, 'Jazda w ruchu miejskim'
FROM students s WHERE s.student_id = 'ALFA-001';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '1 day' + interval '11 hours')::timestamp,
       (CURRENT_DATE + interval '1 day' + interval '12 hours')::timestamp,
       'pending', 60, 'Manewry na placu'
FROM students s WHERE s.student_id = 'ALFA-002';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '2 days' + interval '13 hours')::timestamp,
       (CURRENT_DATE + interval '2 days' + interval '14 hours')::timestamp,
       'pending', 60, 'Pierwsza jazda'
FROM students s WHERE s.student_id = 'ALFA-003';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE - interval '1 day' + interval '15 hours')::timestamp,
       (CURRENT_DATE - interval '1 day' + interval '16 hours')::timestamp,
       'completed', 60, 'Trasa egzaminacyjna'
FROM students s WHERE s.student_id = 'ALFA-004';

-- Jazdy dla BETA
-- ------------------------------------------------------------
INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '10 hours')::timestamp,
       (CURRENT_DATE + interval '11 hours')::timestamp,
       'completed', 60, 'Pierwsza jazda'
FROM students s WHERE s.student_id = 'BETA-001';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '1 day' + interval '12 hours')::timestamp,
       (CURRENT_DATE + interval '1 day' + interval '13 hours')::timestamp,
       'pending', 60, 'Jazda nocna'
FROM students s WHERE s.student_id = 'BETA-002';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE + interval '2 days' + interval '14 hours')::timestamp,
       (CURRENT_DATE + interval '2 days' + interval '15 hours')::timestamp,
       'pending', 60, 'Manewry'
FROM students s WHERE s.student_id = 'BETA-003';

INSERT INTO driving_lessons (student_id, instructor_id, organization_id, start_time, end_time, status, duration_minutes, notes)
SELECT s.id, s.instructor_id, s.organization_id,
       (CURRENT_DATE - interval '1 day' + interval '16 hours')::timestamp,
       (CURRENT_DATE - interval '1 day' + interval '17 hours')::timestamp,
       'completed', 60, 'Trasa egzaminacyjna'
FROM students s WHERE s.student_id = 'BETA-004';

-- 6. PODSUMOWANIE DANYCH
-- ------------------------------------------------------------
SELECT
  o.name AS organizacja,
  (SELECT COUNT(*) FROM instructors WHERE organization_id = o.id) AS instruktorzy,
  (SELECT COUNT(*) FROM students WHERE organization_id = o.id) AS kursanci,
  (SELECT COUNT(*) FROM driving_lessons WHERE organization_id = o.id) AS jazdy
FROM organizations o
ORDER BY o.name;
