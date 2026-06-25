import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GraduationCap, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const StudentActivate = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setMessage('Brakujące dane aktywacyjne. Sprawdź link w e-mailu.')
      return
    }

    const activate = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-student-activation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ token, email })
        })

        let result = {}
        const responseText = await response.text()
        try {
          result = responseText ? JSON.parse(responseText) : {}
        } catch {
          result = { error: responseText || `Błąd HTTP ${response.status}` }
        }

        if (!response.ok) {
          setStatus('error')
          setMessage(result.error || 'Nie udało się aktywować konta')
          toast.error(result.error || 'Nie udało się aktywować konta')
          return
        }

        setStatus('success')
        setMessage(result.message || 'Konto zostało aktywowane.')
        toast.success('Konto zostało aktywowane!')
      } catch (error) {
        console.error('Activation error:', error)
        setStatus('error')
        setMessage(error.message || 'Wystąpił błąd podczas aktywacji')
        toast.error(error.message || 'Wystąpił błąd podczas aktywacji')
      }
    }

    activate()
  }, [token, email])

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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="p-3 bg-primary-100 rounded-xl w-fit mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Aktywacja konta</h1>

            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="text-gray-600">Aktywujemy Twoje konto...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-gray-900 font-medium">{message}</p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Przejdź do logowania
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-700 font-medium">{message}</p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Wróć do logowania
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default StudentActivate
