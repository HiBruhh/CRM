import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  Car,
  Users,
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react'
import toast from 'react-hot-toast'

const LoginChoice = () => {
  const navigate = useNavigate()
  const { login, studentLogin, user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [mode, setMode] = useState('instructor') // 'instructor' | 'student'

  // Instructor form state
  const [instructorEmail, setInstructorEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [instructorLoading, setInstructorLoading] = useState(false)

  // Student form state
  const [studentEmail, setStudentEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email') // email | code
  const [studentLoading, setStudentLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpSent, setOtpSent] = useState(false)
  const [studentError, setStudentError] = useState('')

  useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student/dashboard', { replace: true })
    } else if (user?.role) {
      navigate(user.role === 'instructor' ? '/instructor-panel' : '/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleInstructorSubmit = async (e) => {
    e.preventDefault()
    setInstructorLoading(true)
    try {
      const loggedUser = await login(instructorEmail, password)
      if (loggedUser?.role === 'instructor') {
        navigate('/instructor-panel', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Nieprawidłowy e-mail lub hasło')
    } finally {
      setInstructorLoading(false)
    }
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setStudentError('')
    const email = studentEmail.trim()

    if (!email) {
      setStudentError('Podaj adres e-mail')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStudentError('Podaj poprawny adres e-mail')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-student-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email })
      })

      let result = {}
      const responseText = await response.text()
      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        result = { error: responseText || `Błąd HTTP ${response.status}` }
      }

      if (!response.ok) {
        const errorMessage = result.error || `Błąd ${response.status}: nieznany błąd serwera`
        setStudentError(errorMessage)
        throw new Error(errorMessage)
      }
      setOtpSent(true)
      setStep('code')
      setCountdown(30)
      toast.success('Kod został wysłany na podany adres e-mail')
    } catch (error) {
      console.error('Błąd wysyłania kodu:', error)
      setStudentError(error.message || 'Nie udało się wysłać kodu')
      toast.error(error.message || 'Nie udało się wysłać kodu')
    } finally {
      setIsSending(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    await handleSendCode({ preventDefault: () => {} })
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setStudentError('')
    if (!code.trim()) {
      setStudentError('Podaj kod')
      return
    }
    setStudentLoading(true)
    try {
      await studentLogin(studentEmail.trim(), code.trim())
      navigate('/student/dashboard', { replace: true })
    } catch (error) {
      console.error('Błąd logowania:', error)
      setStudentError(error.message || 'Nieprawidłowy kod')
      toast.error(error.message || 'Nieprawidłowy kod')
    } finally {
      setStudentLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-transform">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">Cyfrowe OSK</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Wybierz strefę</h1>
            <p className="text-gray-600 dark:text-gray-400">Zaloguj się jako instruktor lub kursant</p>
          </div>

          {/* Animated mode toggle */}
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 mb-8 flex">
            <div
              className="absolute top-1.5 bottom-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 6px)',
                transform: mode === 'student' ? 'translateX(calc(100% + 12px))' : 'translateX(0)'
              }}
            />
            <button
              onClick={() => setMode('instructor')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-colors duration-300 ${
                mode === 'instructor' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Instruktor
            </button>
            <button
              onClick={() => setMode('student')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-colors duration-300 ${
                mode === 'student' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Kursant
            </button>
          </div>

          {/* Card with animated content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: mode === 'student' ? 'translateX(-100%)' : 'translateX(0)' }}
            >
              {/* Instructor panel */}
              <div className="w-full flex-shrink-0 p-8">
                <div className="text-center mb-6">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl w-fit mx-auto mb-4">
                    <Users className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Strefa Instruktora</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dla instruktorów, adminów i właścicieli OSK</p>
                </div>

                <form onSubmit={handleInstructorSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={instructorEmail}
                        onChange={(e) => setInstructorEmail(e.target.value)}
                        placeholder="admin@szkola.pl"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasło</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={instructorLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {instructorLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Logowanie...
                      </>
                    ) : (
                      <>
                        Zaloguj się
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-center text-gray-500 dark:text-gray-500 mb-2">Demo credentials</p>
                  <div className="text-xs text-center text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Admin: admin@szkola.pl / admin123</p>
                    <p>Instruktor: instructor@szkola.pl / instr123</p>
                  </div>
                </div>
              </div>

              {/* Student panel */}
              <div className="w-full flex-shrink-0 p-8">
                <div className="text-center mb-6">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl w-fit mx-auto mb-4">
                    <GraduationCap className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Strefa Kursanta</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {step === 'email' ? 'Logowanie bez hasła. Wyślemy Ci kod OTP.' : `Kod wysłany na ${studentEmail}`}
                  </p>
                </div>

                {studentError && (
                  <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {studentError}
                  </div>
                )}

                {step === 'email' ? (
                  <form onSubmit={handleSendCode} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adres e-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={studentEmail}
                          onChange={(e) => {
                            setStudentEmail(e.target.value)
                            setStudentError('')
                          }}
                          placeholder="twoj@email.pl"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Wysyłanie...
                        </>
                      ) : (
                        <>
                          Wyślij kod
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kod OTP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, ''))
                          setStudentError('')
                        }}
                        placeholder="000000"
                        className="w-full text-center text-2xl tracking-[0.5em] py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={studentLoading || code.length !== 6}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {studentLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Logowanie...
                        </>
                      ) : (
                        'Zaloguj się'
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                      >
                        Zmień e-mail
                      </button>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={countdown > 0 || isSending}
                        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
                      >
                        <RefreshCw className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
                        {countdown > 0 ? `Wyślij ponownie za ${countdown}s` : 'Wyślij ponownie'}
                      </button>
                    </div>
                  </form>
                )}

                {otpSent && step === 'code' && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Nie otrzymałeś kodu?</p>
                      <p>Sprawdź folder spam. Jeśli nadal nie ma kodu, kliknij „Wyślij ponownie" lub skontaktuj się z OSK.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              ← Wróć na stronę główną
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default LoginChoice
