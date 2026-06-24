import React, { useState, useEffect } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'

const ResetPassword = () => {
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(null)
  const [verifying, setVerifying] = useState(true)
  const [valid, setValid] = useState(false)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)

  const cleanErrorMessage = (message) => {
    if (!message) return 'Link resetujący jest nieprawidłowy, wygasł lub został już użyty.'
    if (message.toLowerCase().includes('non-2xx') || message.toLowerCase().includes('edge function')) {
      return 'Link resetujący wygasł lub został już użyty.'
    }
    return message
  }

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setVerifying(false)
      setError('Brak tokenu resetującego w linku. Link mógł wygasnąć lub zostać już użyty.')
      return
    }
    setToken(tokenParam)
    verifyToken(tokenParam)
  }, [searchParams])

  const verifyToken = async (tokenValue) => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('verify-employee-password-token', {
        body: { token: tokenValue }
      })
      if (invokeError || !data?.valid) throw new Error(invokeError?.message || data?.error || 'Nieprawidłowy token')
      setValid(true)
    } catch (err) {
      setError(cleanErrorMessage(err.message))
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Hasło musi mieć min. 6 znaków')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Hasła nie są takie same')
      return
    }
    setUpdating(true)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('set-employee-password', {
        body: { token, password }
      })
      if (invokeError) throw new Error(invokeError.message)
      if (data?.error) throw new Error(data.error)
      setSuccess(true)
      toast.success('Hasło zostało zmienione')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(cleanErrorMessage(err.message) || 'Błąd zmiany hasła')
    } finally {
      setUpdating(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-dark-600">Weryfikacja linku...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-dark-900 mb-2">Link nieaktywny</h1>
          <p className="text-sm text-gray-600 dark:text-dark-600">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-emerald-200 dark:border-emerald-800 p-6 max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-dark-900 mb-2">Hasło zmienione</h1>
          <p className="text-sm text-gray-600 dark:text-dark-600">Możesz się teraz zalogować. Za chwilę nastąpi przekierowanie.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-200 p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-dark-900">Ustaw nowe hasło</h1>
          <p className="text-sm text-gray-500 dark:text-dark-600 mt-1">Wpisz nowe hasło dla swojego konta.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">Nowe hasło</label>
            <input
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Min. 6 znaków"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">Potwierdź hasło</label>
            <input
              type="password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Powtórz hasło"
            />
          </div>
          <button
            type="submit"
            disabled={updating}
            className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {updating ? 'Zmienianie...' : 'Zmień hasło'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
