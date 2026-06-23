-- Krok 1: Stwórz konta użytkowników w Supabase Authentication
-- Przejdź do: Authentication → Users → Add user

-- Krok 2: Po stworzeniu kont, znajdź ich UUID i wykonaj poniższe zapytania

-- Znajdź UUID użytkowników:
SELECT id, email FROM auth.users WHERE email IN ('admin@szkola.pl', 'instructor@szkola.pl');

-- Wklej znalezione UUID poniżej:
-- 17f43ed3-b0e1-47b3-833d-3b5fb24e61fa (admin)
-- c2b68cc9-431d-462f-8a36-86780908488d (instructor)
-- Profile użytkowników (z prawdziwymi UUID)
INSERT INTO profiles (id, email, role, first_name, last_name, phone) VALUES
('17f43ed3-b0e1-47b3-833d-3b5fb24e61fa', 'admin@szkola.pl', 'admin', 'Jan', 'Kowalski', '+48123456789'),
('c2b68cc9-431d-462f-8a36-86780908488d', 'instructor@szkola.pl', 'instructor', 'Anna', 'Nowak', '+48123456788')
ON CONFLICT (id) DO NOTHING;

-- Instruktorzy
INSERT INTO instructors (user_id, first_name, last_name, email, phone, license_number, status) VALUES
('c2b68cc9-431d-462f-8a36-86780908488d', 'Anna', 'Nowak', 'instructor@szkola.pl', '+48123456788', 'INSTR/001/2024', 'active')
ON CONFLICT (license_number) DO NOTHING;

-- Przykładowi kursanci
INSERT INTO students (student_id, first_name, last_name, email, phone, birth_date, license_category, instructor_id) VALUES
('KURS-0001', 'Jan', 'Kowalski', 'jan.kowalski@email.com', '+48500123456', '1995-05-15', 'B', (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl')),
('KURS-0002', 'Anna', 'Nowak', 'anna.nowak@email.com', '+48500234567', '1998-08-22', 'B', (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl')),
('KURS-0003', 'Piotr', 'Wiśniewski', 'piotr.wisniewski@email.com', '+48500345678', '1992-12-10', 'B', (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl'))
ON CONFLICT (student_id) DO NOTHING;

-- Przykładowe jazdy
INSERT INTO driving_lessons (student_id, instructor_id, start_time, end_time, duration_minutes, status, location, notes) VALUES
-- Jazdy dla Jana Kowalskiego
((SELECT id FROM students WHERE student_id = 'KURS-0001'), (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl'), 
 '2024-05-14 09:00:00', '2024-05-14 10:00:00', 60, 'in_progress', 'Plac manewrowy', 'Pierwsza jazda - podstawy'),
((SELECT id FROM students WHERE student_id = 'KURS-0001'), (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl'), 
 '2024-05-15 11:00:00', '2024-05-15 12:30:00', 90, 'in_progress', 'Miasto', 'Jazda po mieście'),
-- Jazdy dla Anny Nowak
((SELECT id FROM students WHERE student_id = 'KURS-0002'), (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl'), 
 '2024-05-14 14:00:00', '2024-05-14 15:00:00', 60, 'pending', 'Plac manewrowy', 'Pierwsza jazda'),
((SELECT id FROM students WHERE student_id = 'KURS-0002'), (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl'), 
 '2024-05-16 10:00:00', '2024-05-16 11:00:00', 60, 'in_progress', 'Miasto', 'Powtórka'),
-- Jazdy dla Piotra Wiśniewskiego
((SELECT id FROM students WHERE student_id = 'KURS-0003'), (SELECT id FROM instructors WHERE email = 'instructor@szkola.pl'), 
 '2024-05-14 16:00:00', '2024-05-14 17:00:00', 60, 'completed', 'Trasa eksterna', 'Jazda zakończona sukcesem')
ON CONFLICT DO NOTHING;
