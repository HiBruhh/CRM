import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'

const ConfirmEmailChange = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Brak tokenu w linku')
      return
    }
    confirmChange()
  }, [token])

  const confirmChange = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-student-email-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Błąd potwierdzania')

      setStatus('success')
      setMessage(result.message || 'Adres e-mail został zmieniony')
      toast.success('Adres e-mail został zmieniony')
    } catch (error) {
      console.error('Błąd potwierdzania:', error)
      setStatus('error')
      setMessage(error.message || 'Nie udało się potwierdzić zmiany e-maila')
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Potwierdzanie zmiany</h1>
              <p className="text-gray-600">Proszę czekać...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Zmiana potwierdzona</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/student/login"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Zaloguj się nowym adresem e-mail
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Błąd</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/student/login"
                className="inline-block px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Przejdź do logowania
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default ConfirmEmailChange
