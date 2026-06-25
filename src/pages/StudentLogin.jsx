import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, ArrowLeft, Mail, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const StudentLogin = () => {
  const navigate = useNavigate()
  const { studentLogin, user } = useAuth()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email') // email | code
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpSent, setOtpSent] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendCode = async (e) => {
    e.preventDefault()
    setFormError('')
    const emailValue = email.trim()

    if (!emailValue) {
      setFormError('Podaj adres e-mail')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setFormError('Podaj poprawny adres e-mail')
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
        body: JSON.stringify({ email: emailValue })
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
        setFormError(errorMessage)
        throw new Error(errorMessage)
      }

      setOtpSent(true)
      setStep('code')
      setCountdown(30)
      toast.success('Kod został wysłany na podany adres e-mail')
    } catch (error) {
      console.error('Błąd wysyłania kodu:', error)
      setFormError(error.message || 'Nie udało się wysłać kodu')
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
    setFormError('')
    if (!code.trim()) {
      setFormError('Podaj kod')
      return
    }

    setIsLoading(true)
    try {
      await studentLogin(email.trim(), code.trim())
      navigate('/student/dashboard', { replace: true })
    } catch (error) {
      console.error('Błąd logowania:', error)
      setFormError(error.message || 'Nieprawidłowy kod')
      toast.error(error.message || 'Nieprawidłowy kod')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="p-2 bg-primary-600 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Cyfrowe OSK</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót do wyboru strefy
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="p-3 bg-primary-100 rounded-xl w-fit mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Strefa Kursanta</h1>
              <p className="text-gray-600">
                {step === 'email'
                  ? 'Zaloguj się bez hasła. Wyślemy Ci kod na e-mail.'
                  : `Wpisz kod, który wysłaliśmy na ${email}`}
              </p>
            </div>

            {formError && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres e-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setFormError('')
                      }}
                      placeholder="twoj@email.pl"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    'Wyślij kod'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kod OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''))
                      setFormError('')
                    }}
                    placeholder="000000"
                    className="w-full text-center text-2xl tracking-[0.5em] py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Logowanie...
                    </>
                  ) : (
                    'Zaloguj się'
                  )}
                </button>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-sm text-gray-500 hover:text-gray-700"
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
                    {countdown > 0
                      ? `Wyślij ponownie za ${countdown}s`
                      : 'Wyślij ponownie'}
                  </button>
                </div>
              </form>
            )}

            {otpSent && step === 'code' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Nie otrzymałeś kodu?</p>
                  <p>Sprawdź folder spam. Jeśli nadal nie ma kodu, kliknij „Wyślij ponownie" lub skontaktuj się z OSK.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default StudentLogin
