-- Tabela profilów użytkowników
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'instructor')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela instruktorów
CREATE TABLE IF NOT EXISTS instructors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  license_number TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela kursantów
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  license_category TEXT DEFAULT 'B',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  required_hours INTEGER DEFAULT 30,
  completed_hours INTEGER DEFAULT 0,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela jazd
CREATE TABLE IF NOT EXISTS driving_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_time CHECK (end_time > start_time)
);

-- Tabela historii zmian
CREATE TABLE IF NOT EXISTS change_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES profiles(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funkcja do generowania ID kursanta
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    NEW.student_id := 'KURS-' || LPAD(nextval('student_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sekwencja do numeracji kursantów
CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1;

-- Trigger do automatycznego generowania ID kursanta
CREATE TRIGGER generate_student_id_trigger
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_student_id();

-- Funkcja do automatycznego aktualizowania godzin kursanta
CREATE OR REPLACE FUNCTION update_student_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' THEN
      UPDATE students 
      SET completed_hours = (
        SELECT COALESCE(SUM(duration_minutes), 0) / 60
        FROM driving_lessons 
        WHERE student_id = NEW.student_id AND status = 'completed'
      )
      WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE students 
    SET completed_hours = (
      SELECT COALESCE(SUM(duration_minutes), 0) / 60
      FROM driving_lessons 
      WHERE student_id = OLD.student_id AND status = 'completed'
    )
    WHERE id = OLD.student_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger do automatycznego aktualizowania godzin
CREATE TRIGGER update_student_hours_trigger
  AFTER INSERT OR UPDATE OR DELETE ON driving_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_student_hours();

-- Funkcja do logowania zmian
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO change_history (table_name, record_id, action, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), NULL);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO change_history (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NULL);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO change_history (table_name, record_id, action, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggery do logowania zmian
CREATE TRIGGER log_instructors_changes
  AFTER INSERT OR UPDATE OR DELETE ON instructors
  FOR EACH ROW
  EXECUTE FUNCTION log_changes();

CREATE TRIGGER log_students_changes
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW
  EXECUTE FUNCTION log_changes();

CREATE TRIGGER log_driving_lessons_changes
  AFTER INSERT OR UPDATE OR DELETE ON driving_lessons
  FOR EACH ROW
  EXECUTE FUNCTION log_changes();

-- Indexes dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_students_instructor_id ON students(instructor_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_student_id ON driving_lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_instructor_id ON driving_lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_start_time ON driving_lessons(start_time);
CREATE INDEX IF NOT EXISTS idx_change_history_table_record ON change_history(table_name, record_id);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE driving_lessons ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla profili
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Polityki RLS dla instruktorów
CREATE POLICY "Admins can view all instructors"
  ON instructors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage instructors"
  ON instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Polityki RLS dla kursantów
CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can view assigned students"
  ON students FOR SELECT
  USING (
    instructor_id IN (
      SELECT id FROM instructors 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Polityki RLS dla jazd
CREATE POLICY "Admins can view all lessons"
  ON driving_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can view own lessons"
  ON driving_lessons FOR SELECT
  USING (
    instructor_id IN (
      SELECT id FROM instructors 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON driving_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can manage own lessons"
  ON driving_lessons FOR INSERT WITH CHECK (
    instructor_id IN (
      SELECT id FROM instructors 
      WHERE user_id = auth.uid()
    )
  );

-- UWAGA: Najpierw stwórz konta użytkowników w Supabase Authentication:
-- 1. admin@szkola.pl / admin123
-- 2. instructor@szkola.pl / instr123
-- Potem wykonaj poniższe zapytania używając prawdziwych UUID z auth.users

-- Przykładowi instruktorzy (po stworzeniu kont w Authentication)
-- INSERT INTO instructors (user_id, first_name, last_name, email, phone, license_number, status) VALUES
-- (UUID_Z_AUTH_INSTRUKTORA, 'Anna', 'Nowak', 'instructor@szkola.pl', '+48123456788', 'INSTR/001/2024', 'active')
-- ON CONFLICT (license_number) DO NOTHING;
