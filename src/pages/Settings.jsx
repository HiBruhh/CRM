import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { useTheme } from '../contexts/ThemeContext'
import { Settings as SettingsIcon, Bell, Smartphone, Mail, Save, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Settings = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [notificationSettings, setNotificationSettings] = useState({
    // App notifications
    lesson_created_app: true,
    lesson_updated_app: true,
    lesson_cancelled_app: true,
    lesson_completed_app: true,
    lesson_deleted_app: true,
    student_assigned_app: true,
    student_removed_app: true,
    instructor_created_app: true,
    instructor_updated_app: true,
    instructor_removed_app: true,
    checklist_completed_app: true,
    checklist_overdue_app: true,
    checklist_reminder_app: true,
    
    // SMS notifications
    lesson_created_sms: false,
    lesson_updated_sms: false,
    lesson_cancelled_sms: true,
    lesson_completed_sms: false,
    lesson_deleted_sms: false,
    student_assigned_sms: false,
    student_removed_sms: false,
    instructor_created_sms: false,
    instructor_updated_sms: false,
    instructor_removed_sms: false,
    checklist_completed_sms: false,
    checklist_overdue_sms: false,
    checklist_reminder_sms: true,
    
    // Email notifications
    lesson_created_email: true,
    lesson_updated_email: true,
    lesson_cancelled_email: true,
    lesson_completed_email: true,
    lesson_deleted_email: true,
    student_assigned_email: true,
    student_removed_email: true,
    instructor_created_email: true,
    instructor_updated_email: true,
    instructor_removed_email: true,
    checklist_completed_email: true,
    checklist_overdue_email: true,
    checklist_reminder_email: true,
  })

  const notificationTypes = [
    { key: 'lesson_created', label: 'Nowa jazda utworzona', description: 'Powiadomienie gdy zostanie utworzona nowa jazda' },
    { key: 'lesson_updated', label: 'Jazda zaktualizowana', description: 'Powiadomienie gdy zostanie zaktualizowana jazda' },
    { key: 'lesson_cancelled', label: 'Jazda anulowana', description: 'Powiadomienie gdy zostanie anulowana jazda' },
    { key: 'lesson_completed', label: 'Jazda zakończona', description: 'Powiadomienie gdy zostanie zakończona jazda' },
    { key: 'lesson_deleted', label: 'Jazda usunięta', description: 'Powiadomienie gdy zostanie usunięta jazda' },
    { key: 'student_assigned', label: 'Kursant przypisany', description: 'Powiadomienie gdy kursant zostanie przypisany' },
    { key: 'student_removed', label: 'Kursant usunięty', description: 'Powiadomienie gdy kursant zostanie usunięty' },
    { key: 'instructor_created', label: 'Instruktor utworzony', description: 'Powiadomienie gdy zostanie utworzony nowy instruktor' },
    { key: 'instructor_updated', label: 'Instruktor zaktualizowany', description: 'Powiadomienie gdy zostanie zaktualizowany instruktor' },
    { key: 'instructor_removed', label: 'Instruktor usunięty', description: 'Powiadomienie gdy zostanie usunięty instruktor' },
    { key: 'checklist_completed', label: 'Checklista zakończona', description: 'Powiadomienie gdy zostanie zakończona checklista' },
    { key: 'checklist_overdue', label: 'Checklista zaległa', description: 'Powiadomienie gdy checklista jest zaległa' },
    { key: 'checklist_reminder', label: 'Przypomnienie o checkliście', description: 'Przypomnienie o wypełnieniu checklisty' },
  ]

  useEffect(() => {
    if (!user?.id) return
    fetchNotificationSettings()
  }, [user?.id])

  const fetchNotificationSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // If no settings exist, create default settings
        if (error.code === 'PGRST116') {
          await createDefaultSettings()
        } else {
          throw error
        }
      } else if (data) {
        setNotificationSettings(data)
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDefaultSettings = async () => {
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .insert({
          user_id: user.id,
          ...notificationSettings
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating default settings:', error)
    }
  }

  const handleNotificationToggle = (key, channel) => {
    const settingKey = `${key}_${channel}`
    setNotificationSettings(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey]
    }))
  }

  const handleSaveNotificationSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          ...notificationSettings
        })

      if (error) throw error

      toast.success('Ustawienia powiadomień zapisane pomyślnie')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Błąd podczas zapisywania ustawień powiadomień')
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    toast.success(`Motyw zmieniony na ${newTheme === 'light' ? 'jasny' : 'ciemny'}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      {/* Header */}
      <div className="bg-white dark:bg-dark-100 shadow-sm border-b dark:border-dark-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-dark-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">Ustawienia</h1>
                <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
                  Zarządzaj preferencjami konta
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b dark:border-dark-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-dark-600 hover:text-gray-700 dark:hover:text-dark-700 hover:border-gray-300'
                }`}
              >
                Ogólne
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-dark-600 hover:text-gray-700 dark:hover:text-dark-700 hover:border-gray-300'
                }`}
              >
                Powiadomienia
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">Wygląd</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-dark-900">Motyw aplikacji</h3>
                    <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
                      Wybierz preferowany motyw aplikacji
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        theme === 'light'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-dark-300 text-gray-700 dark:text-dark-700 hover:bg-gray-300 dark:hover:bg-dark-400'
                      }`}
                    >
                      Jasny
                    </button>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-dark-300 text-gray-700 dark:text-dark-700 hover:bg-gray-300 dark:hover:bg-dark-400'
                      }`}
                    >
                      Ciemny
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-dark-900">Język</h3>
                    <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
                      Wybierz język interfejsu
                    </p>
                  </div>
                  <select
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    defaultValue="pl"
                  >
                    <option value="pl">Polski</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow">
            <div className="p-6 border-b dark:border-dark-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Ustawienia powiadomień</h2>
                  <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
                    Wybierz jakie powiadomienia chcesz otrzymywać i przez jakie kanały
                  </p>
                </div>
                <button
                  onClick={handleSaveNotificationSettings}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Zapisywanie...' : 'Zapisz'}</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Channel Headers */}
              <div className="grid grid-cols-4 gap-4 mb-4 text-sm font-medium text-gray-700 dark:text-dark-700">
                <div className="col-span-1">Typ powiadomienia</div>
                <div className="flex items-center justify-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Aplikacja</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>SMS</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-3">
                {notificationTypes.map((type) => (
                  <div
                    key={type.key}
                    className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-dark-200 rounded-lg items-center"
                  >
                    <div className="col-span-1">
                      <h3 className="font-medium text-gray-900 dark:text-dark-900">{type.label}</h3>
                      <p className="text-xs text-gray-600 dark:text-dark-600 mt-1">{type.description}</p>
                    </div>
                    
                    {/* App Toggle */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleNotificationToggle(type.key, 'app')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings[`${type.key}_app`] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-dark-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings[`${type.key}_app`] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* SMS Toggle */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleNotificationToggle(type.key, 'sms')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings[`${type.key}_sms`] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-dark-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings[`${type.key}_sms`] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Email Toggle */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleNotificationToggle(type.key, 'email')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationSettings[`${type.key}_email`] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-dark-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationSettings[`${type.key}_email`] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Settings
