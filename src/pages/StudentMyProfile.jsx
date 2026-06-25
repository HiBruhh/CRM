import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const StudentMyProfile = () => {
  const { user } = useAuth()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    phone: '',
    email: ''
  })
  const [originalEmail, setOriginalEmail] = useState('')
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    if (!user?.studentId) return
    loadProfile()
  }, [user?.studentId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('first_name, last_name, birth_date, phone, email')
        .eq('id', user.studentId)
        .single()

      if (error) throw error
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        birth_date: data.birth_date || '',
        phone: data.phone || '',
        email: data.email || ''
      })
      setOriginalEmail(data.email || '')
    } catch (error) {
      console.error('Błąd ładowania profilu:', error)
      toast.error('Nie udało się załadować profilu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (formData.email !== originalEmail) {
      setNewEmail(formData.email)
      setShowEmailConfirm(true)
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          birth_date: formData.birth_date || null,
          phone: formData.phone
        })
        .eq('id', user.studentId)

      if (error) throw error
      toast.success('Profil zaktualizowany')
    } catch (error) {
      console.error('Błąd zapisywania profilu:', error)
      toast.error('Nie udało się zaktualizować profilu')
    } finally {
      setSaving(false)
    }
  }

  const handleEmailChange = async () => {
    setSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-student-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          student_id: user.studentId,
          new_email: newEmail
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Błąd')

      toast.success('Na nowy adres e-mail wysłaliśmy link potwierdzający')
      setShowEmailConfirm(false)
      setFormData({ ...formData, email: originalEmail })
    } catch (error) {
      console.error('Błąd zmiany e-maila:', error)
      toast.error(error.message || 'Nie udało się zainicjować zmiany e-maila')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-6">Mój profil</h1>

        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                Imię
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                Nazwisko
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                Data urodzenia
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                Numer telefonu
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                Adres e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                Zmiana adresu e-mail wymaga potwierdzenia na nowej skrzynce.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Zapisz zmiany
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email change confirmation modal */}
      {showEmailConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Potwierdź zmianę e-maila</h3>
            </div>
            <p className="text-gray-600 dark:text-dark-600 mb-6">
              Na adres <strong>{newEmail}</strong> wyślemy link potwierdzający. Kliknięcie go jest konieczne, aby zmiana została wprowadzona.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmailConfirm(false)
                  setFormData({ ...formData, email: originalEmail })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleEmailChange}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {saving ? 'Wysyłanie...' : 'Wyślij potwierdzenie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentMyProfile
