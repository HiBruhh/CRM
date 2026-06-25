import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Car,
  Calendar,
  Users,
  FileText,
  Bell,
  Star,
  Shield,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  Zap,
  Camera,
  Fuel,
  MapPin,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  Lock,
  Mail
} from 'lucide-react'

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [hoveredLesson, setHoveredLesson] = useState(null)

  const todayLessons = [
    { time: '08:00', student: 'Anna K.', instructor: 'M. Nowak', status: 'completed', label: 'zakończona' },
    { time: '10:00', student: 'Piotr W.', instructor: 'M. Nowak', status: 'in_progress', label: 'trwa' },
    { time: '12:30', student: 'Kasia L.', instructor: 'J. Wiśniewski', status: 'pending', label: 'zaplanowana' },
    { time: '15:00', student: 'Tomek R.', instructor: 'J. Wiśniewski', status: 'pending', label: 'zaplanowana' }
  ]

  const demoSchedule = [
    { day: 'Pon', lessons: 4, hours: 6 },
    { day: 'Wt', lessons: 5, hours: 7.5 },
    { day: 'Śr', lessons: 3, hours: 4.5 },
    { day: 'Czw', lessons: 6, hours: 9 },
    { day: 'Pt', lessons: 4, hours: 6 },
    { day: 'Sob', lessons: 2, hours: 3 },
    { day: 'Ndz', lessons: 0, hours: 0 }
  ]

  const featureTabs = [
    {
      icon: Sparkles,
      title: 'AI & OCR',
      subtitle: 'Zrób zdjęcie. Reszta dzieje się sama.',
      description: 'Wbudowane OCR rozpoznaje dowody rejestracyjne i paragony paliwowe. Wypełnia formularze za instruktora — marka, model, VIN, OC, przegląd, pozycje paliwowe.'
    },
    {
      icon: Calendar,
      title: 'Grafik',
      subtitle: 'Kalendarz, który sam wie co się dzieje.',
      description: 'FullCalendar po polsku, timeline instruktorów jako zasobów, drag & drop i zmiana czasu trwania. Statusy aktualizują się automatycznie.'
    },
    {
      icon: Users,
      title: 'Kursanci',
      subtitle: 'Postęp kursanta, policzony.',
      description: '13 mierzonych umiejętności, ocena 0–5 po każdej jeździe. Średnia liczona automatycznie, historia w karcie kursanta.'
    },
    {
      icon: Car,
      title: 'Flota',
      subtitle: 'Cała flota na jednej karcie. Z alarmem.',
      description: 'Czerwone = przeterminowane OC lub przegląd. Żółte = mniej niż 14 dni. Historia tankowania per pojazd i koszt paliwa.'
    }
  ]

  const moreFeatures = [
    { icon: Bell, title: 'Powiadomienia real-time', desc: 'Supabase Channels — nowa jazda, checklista, raport. Licznik w nawigacji, ustawienia per typ i kanał.' },
    { icon: Shield, title: 'Role i RLS', desc: 'super_admin · org_admin · admin · instructor · student. Dane izolowane na poziomie bazy dzięki organization_id.' },
    { icon: Zap, title: 'Auto-statusy jazd', desc: 'pending → in_progress → completed bez kliknięcia. Auto-aktualizacja completed_hours kursanta.' },
    { icon: FileText, title: 'Dokumenty', desc: 'Wymiana dokumentów PDF/JPG/PNG między kursantem a OSK. Akceptacja, odrzucenie, komentarze.' },
    { icon: Star, title: 'Oceny i feedback', desc: 'Kursant ocenia jazdę 1–5 gwiazdek i zostawia opinię. Historia ocen w panelu instruktora.' },
    { icon: Lock, title: 'Logowanie OTP', desc: 'Kursant loguje się wyłącznie e-mailem. Jednorazowy kod przy każdym logowaniu. Bez haseł do zapamiętania.' },
    { icon: Mail, title: 'E-maile', desc: 'Aktywacja konta, OTP, propozycje jazd, zmiana e-maila, przypomnienia — wszystko via Resend.' },
    { icon: BarChart3, title: 'Audyt zmian', desc: 'Tabela change_history loguje każdy INSERT, UPDATE i DELETE. Pełna ścieżka kto, co i kiedy zmienił.' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % featureTabs.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [featureTabs.length])

  const statusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      default: return 'bg-yellow-500'
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-transform">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                Cyfrowe OSK
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#ai" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">AI & OCR</a>
              <a href="#grafik" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Grafik</a>
              <a href="#flota" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Flota</a>
              <a href="#funkcje" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Funkcje</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary-600/25"
              >
                Zaloguj się
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-gray-600 dark:text-gray-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="px-4 py-4 space-y-3">
              <a href="#ai" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-400">AI & OCR</a>
              <a href="#grafik" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-400">Grafik</a>
              <a href="#flota" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-400">Flota</a>
              <a href="#funkcje" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-400">Funkcje</a>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold">Zaloguj się</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-primary-950/30 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary-400/10 dark:bg-primary-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold mb-6 border border-primary-200 dark:border-primary-800">
                <Sparkles className="h-3.5 w-3.5" />
                Nowa wersja ze Strefą Kursanta
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Twoja szkoła jazdy.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">
                  Bez papieru. Bez chaosu.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Cyfrowe OSK łączy grafik, kursantów, flotę i raporty paliwa w jeden żywy panel.
                Z AI, które czyta paragony i dowody rejestracyjne za Ciebie.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary-600/25 hover:-translate-y-0.5"
                >
                  Zaloguj się
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Logowanie instruktora / admina</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Logowanie kursanta OTP</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Wsparcie po polsku</span>
              </div>
            </div>

            {/* Live schedule preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-600 to-blue-600 rounded-3xl opacity-20 blur-2xl" />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Grafik — dziś</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                    live
                  </span>
                </div>
                <div className="space-y-3">
                  {todayLessons.map((lesson, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-default group"
                      onMouseEnter={() => setHoveredLesson(index)}
                      onMouseLeave={() => setHoveredLesson(null)}
                    >
                      <div className="flex flex-col items-center min-w-[3.5rem]">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{lesson.time}</span>
                        <div className={`w-2 h-2 rounded-full mt-1 ${statusColor(lesson.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {lesson.student} · {lesson.instructor}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            lesson.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : lesson.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {lesson.label}
                          </span>
                        </div>
                        <div className={`h-1 mt-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden transition-all ${hoveredLesson === index ? 'opacity-100' : 'opacity-0'}`}>
                          <div className={`h-full rounded-full ${statusColor(lesson.status)}`} style={{ width: lesson.status === 'completed' ? '100%' : lesson.status === 'in_progress' ? '60%' : '30%' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">4 jazdy · 6 godzin</span>
                  <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Otwórz grafik →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI & OCR Section */}
      <section id="ai" className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-primary-500 rounded-3xl opacity-15 blur-2xl" />
                <div className="relative grid gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800 transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Dowód rejestracyjny</h4>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">OCR</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Marka / model</span><span className="font-medium text-gray-900 dark:text-white">Skoda Octavia</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">VIN</span><span className="font-medium text-gray-900 dark:text-white">TMB...2847</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">OC ważne do</span><span className="font-medium text-gray-900 dark:text-white">2026-08-12</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Przegląd do</span><span className="font-medium text-gray-900 dark:text-white">2027-02-03</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800 transform hover:scale-[1.02] transition-transform ml-8">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Fuel className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Paragon paliwowy</h4>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">OCR</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Paliwo</span><span className="font-medium text-gray-900 dark:text-white">Diesel</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Litry</span><span className="font-medium text-gray-900 dark:text-white">42.35 L</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Cena / L</span><span className="font-medium text-gray-900 dark:text-white">6.12 zł</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Suma</span><span className="font-medium text-gray-900 dark:text-white">258.98 zł</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-6 border border-purple-200 dark:border-purple-800">
                <Sparkles className="h-3.5 w-3.5" />
                AI & OCR
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Zrób zdjęcie.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-primary-600">
                  Reszta dzieje się sama.
                </span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Wbudowany model wizualny rozpoznaje dowody rejestracyjne i paragony paliwowe —
                wypełnia formularze za instruktora. Bez przepisywania, bez błędów.
              </p>
              <ul className="space-y-4">
                {[
                  'Marka, model, VIN, OC, przegląd — wszystko z jednego zdjęcia',
                  'Pozycje paliwowe z paragonu: rodzaj, litry, cena, suma',
                  'Edycja ręczna zawsze możliwa — AI proponuje, Ty zatwierdzasz'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Tabs */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Wszystko, czego potrzebuje szkoła jazdy</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Przełączaj się między kluczowymi modułami i zobacz, co może Twoja szkoła.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-3">
              {featureTabs.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 shadow-md'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-colors ${
                      activeFeature === index
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${activeFeature === index ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.subtitle}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-8">
              <div className="relative h-full min-h-[420px] bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 lg:p-12 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary-600 text-white rounded-xl">
                      {React.createElement(featureTabs[activeFeature].icon, { className: 'h-6 w-6' })}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{featureTabs[activeFeature].title}</h3>
                  </div>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl">
                    {featureTabs[activeFeature].description}
                  </p>

                  {/* Dynamic preview based on active feature */}
                  {activeFeature === 0 && (
                    <div className="grid sm:grid-cols-3 gap-4">
                      {['Skan dowodu', 'Skan paragonu', 'Weryfikacja'].map((step, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {i + 1}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeFeature === 1 && (
                    <div className="flex items-end gap-3 h-40">
                      {demoSchedule.map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="w-full bg-primary-200 dark:bg-primary-900/30 rounded-t-lg relative overflow-hidden" style={{ height: `${(day.hours / 9) * 100}%` }}>
                            <div className="absolute bottom-0 left-0 right-0 bg-primary-600 transition-all duration-500 group-hover:bg-primary-500" style={{ height: `${(day.hours / 9) * 100}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{day.day}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeFeature === 2 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-semibold text-gray-900 dark:text-white">Anna Kowalska</span>
                        <span className="text-2xl font-bold text-primary-600">78%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" style={{ width: '78%' }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {['Ruszanie', 'Skrzyżowania', 'Parkowanie', 'Płynność'].map((skill, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{skill}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{4 + (i % 2)} / 5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeFeature === 3 && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Skoda Octavia', status: 'OK', color: 'green' },
                        { label: 'VW Golf', status: 'OC 7 dni', color: 'yellow' },
                        { label: 'Ford Focus', status: 'Przegląd zaległy', color: 'red' },
                        { label: 'Toyota Yaris', status: 'OK', color: 'green' }
                      ].map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                          <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{v.label}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            v.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            v.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>{v.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Zone Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-blue-700 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-6 border border-white/30">
                <Users className="h-3.5 w-3.5" />
                Strefa Kursanta
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Daj kursantom własny dostęp.
              </h2>
              <p className="text-lg text-primary-100 mb-8 leading-relaxed">
                Kursant loguje się wyłącznie e-mailem i jednorazowym kodem. Widzi grafik, akceptuje
                propozycje jazd, przegląda dokumenty, ocenia instruktorów i edytuje swoje dane.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  'Logowanie OTP bez haseł',
                  'Akceptacja / odrzucenie propozycji',
                  'Wymiana dokumentów',
                  'Oceny i historia jazd',
                  'Edycja profilu',
                  'Przypomnienia e-mail'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary-200 flex-shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                >
                  Przejdź do logowania
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-white/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 text-gray-900">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <LayoutDashboard className="h-5 w-5 text-primary-600" />
                  </div>
                  <h3 className="font-semibold">Panel kursanta</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg"><Calendar className="h-4 w-4 text-green-600" /></div>
                      <span className="text-sm font-medium">Następna jazda</span>
                    </div>
                    <span className="text-sm font-bold">Jutro, 10:00</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-4 w-4 text-yellow-600" /></div>
                      <span className="text-sm font-medium">Godziny zrealizowane</span>
                    </div>
                    <span className="text-sm font-bold">18 / 30</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg"><Star className="h-4 w-4 text-blue-600" /></div>
                      <span className="text-sm font-medium">Średnia ocen</span>
                    </div>
                    <span className="text-sm font-bold">4.6 / 5</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg"><FileText className="h-4 w-4 text-purple-600" /></div>
                      <span className="text-sm font-medium">Dokumenty</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-600">2 oczekują</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section id="funkcje" className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Reszta funkcji, które po prostu działają.</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Od audytu zmian po SaaS — mamy to, czego potrzebuje nowoczesna szkoła jazdy.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {moreFeatures.map((feature, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-lg hover:shadow-primary-600/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl w-fit mb-4 group-hover:bg-primary-600 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary-600 dark:text-primary-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SaaS / Multitenancy */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Jedna platforma.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">
                  Tysiąc szkół.
                </span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Tryb SaaS — super_admin zarządza wszystkimi organizacjami, limity instruktorów i kursantów,
                plany subskrypcyjne, branding per klient. Row Level Security gwarantuje, że dane jednej szkoły
                nigdy nie wyciekną do drugiej.
              </p>
              <div className="space-y-4">
                {[
                  'Branding organizacji: logo i kolor primary per szkoła',
                  'Role: super_admin, org_admin, admin, instructor, student',
                  'RLS na poziomie każdej tabeli i storage',
                  'Onboarding instruktora: konto, e-mail, organizacja w 3 kliknięcia'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="p-1 bg-primary-100 dark:bg-primary-900/30 rounded-full mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-600 to-blue-600 rounded-3xl opacity-15 blur-2xl" />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                    <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Izolacja danych</h3>
                </div>
                <div className="space-y-4">
                  {['organizacja_a', 'organizacja_b', 'organizacja_c'].map((org, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {org[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">{org.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Własna organizacja</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                        <Lock className="h-3.5 w-3.5" />
                        RLS
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map / Location vibe */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white p-12 lg:p-16">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-6 border border-white/20">
                  <MapPin className="h-3.5 w-3.5" />
                  Polska szkoła jazdy
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Zaprojektowane pod polskie OSK.
                </h2>
                <p className="text-lg text-gray-300 mb-8">
                  Polskie nazwy, polskie kategorie prawa jazdy, lokalne formaty dat i godzin,
                  wsparcie po polsku. Działa na każdym urządzeniu.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['AM', 'A1', 'A2', 'A', 'B', 'B+E', 'C', 'C+E'].map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-64 h-64 rounded-full border-2 border-white/10 flex items-center justify-center animate-pulse">
                    <div className="w-48 h-48 rounded-full border-2 border-white/20 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-primary-600/20 flex items-center justify-center">
                        <Car className="h-16 w-16 text-primary-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Gotowy zostawić papier w przeszłości?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
            14 dni bez karty. Pełna funkcjonalność, własne dane, brak limitów na start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-primary-600/25 hover:-translate-y-0.5"
            >
              Zaloguj się
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            wybierz strefę kursanta lub instruktora na następnej stronie
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Cyfrowe OSK</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/" className="hover:text-gray-900 dark:hover:text-white">Polityka prywatności</Link>
              <Link to="/" className="hover:text-gray-900 dark:hover:text-white">Regulamin</Link>
              <Link to="/" className="hover:text-gray-900 dark:hover:text-white">Kontakt</Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2026 Cyfrowe OSK. Wszystkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
