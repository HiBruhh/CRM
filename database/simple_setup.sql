-- Tylko struktura bazy (bez INSERT-ów)
-- Wykonaj to najpierw, potem stwórz konta w Authentication

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

-- Indexes dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_students_instructor_id ON students(instructor_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_student_id ON driving_lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_instructor_id ON driving_lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_driving_lessons_start_time ON driving_lessons(start_time);

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
