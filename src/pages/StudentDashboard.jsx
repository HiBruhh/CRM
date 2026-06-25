import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  Calendar,
  Clock,
  FileText,
  Settings,
  User,
  ChevronRight,
  Star,
  Bell,
  BellOff,
  Loader2
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatLocalDate, formatLocalTime } from '../utils/timeHelpers'
import toast from 'react-hot-toast'

const StudentDashboard = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    completedHours: 0,
    requiredHours: 0,
    progressPercent: 0,
    upcomingLessons: 0,
    pendingProposals: 0
  })
  const [nextLesson, setNextLesson] = useState(null)
  const [notificationEnabled, setNotificationEnabled] = useState(user?.notificationEnabled !== false)

  useEffect(() => {
    if (!user?.studentId) return
    loadDashboard()
  }, [user?.studentId])

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const { data: student } = await supabase
        .from('students')
        .select('completed_hours, required_hours, notification_enabled')
        .eq('id', user.studentId)
        .single()

      const completed = student?.completed_hours || 0
      const required = student?.required_hours || 30
      const progress = required > 0 ? Math.round((completed / required) * 100) : 0

      const { count: upcomingCount } = await supabase
        .from('driving_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.studentId)
        .in('status', ['pending', 'proposed'])
        .gte('start_time', new Date().toISOString())

      const { count: proposalsCount } = await supabase
        .from('driving_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.studentId)
        .eq('status', 'proposed')

      const { data: next } = await supabase
        .from('driving_lessons')
        .select(`
          *,
          instructor:instructors(id, first_name, last_name)
        `)
        .eq('student_id', user.studentId)
        .in('status', ['pending', 'proposed'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()

      setStats({
        completedHours: completed,
        requiredHours: required,
        progressPercent: progress,
        upcomingLessons: upcomingCount || 0,
        pendingProposals: proposalsCount || 0
      })
      setNextLesson(next)
      setNotificationEnabled(student?.notification_enabled !== false)
    } catch (error) {
      console.error('Błąd ładowania dashboardu:', error)
      toast.error('Nie udało się załadować danych')
    } finally {
      setLoading(false)
    }
  }

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationEnabled
      const { error } = await supabase
        .from('students')
        .update({ notification_enabled: newValue })
        .eq('id', user.studentId)

      if (error) throw error
      setNotificationEnabled(newValue)
      toast.success(newValue ? 'Powiadomienia włączone' : 'Powiadomienia wyłączone')
    } catch (error) {
      console.error('Błąd zmiany powiadomień:', error)
      toast.error('Nie udało się zmienić ustawień')
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
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              Witaj, {user?.firstName || 'Kursancie'}!
            </h1>
            <p className="text-gray-500 dark:text-dark-500">
              Oto Twój postęp i najbliższe planowane jazdy.
            </p>
          </div>
          <button
            onClick={toggleNotifications}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              notificationEnabled
                ? 'border-primary-300 text-primary-700 bg-primary-50'
                : 'border-gray-300 text-gray-600 bg-white'
            }`}
          >
            {notificationEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {notificationEnabled ? 'Powiadomienia włączone' : 'Powiadomienia wyłączone'}
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Postęp kursu</h2>
            <span className="text-2xl font-bold text-primary-600">{stats.progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-200 rounded-full h-4 mb-4">
            <div
              className="bg-primary-600 h-4 rounded-full transition-all"
              style={{ width: `${Math.min(stats.progressPercent, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-dark-500">Wyjeźdzone</p>
              <p className="font-semibold text-gray-900 dark:text-dark-900">{stats.completedHours} h</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-dark-500">Wymagane</p>
              <p className="font-semibold text-gray-900 dark:text-dark-900">{stats.requiredHours} h</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-dark-500">Brakuje</p>
              <p className="font-semibold text-gray-900 dark:text-dark-900">
                {Math.max(stats.requiredHours - stats.completedHours, 0)} h
              </p>
            </div>
          </div>
        </div>

        {/* Next lesson */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Najbliższa jazda</h2>
            <button
              onClick={() => navigate('/student/schedule')}
              className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              Zobacz wszystkie
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {nextLesson ? (
            <div className="flex items-start gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-dark-900">
                  {formatLocalDate(nextLesson.start_time)}
                </p>
                <p className="text-gray-600 dark:text-dark-600">
                  {formatLocalTime(nextLesson.start_time)} - {formatLocalTime(nextLesson.end_time)}
                </p>
                <p className="text-sm text-gray-500 dark:text-dark-500">
                  Instruktor: {nextLesson.instructor?.first_name} {nextLesson.instructor?.last_name}
                </p>
                {nextLesson.status === 'proposed' && (
                  <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    Oczekuje na akceptację
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-dark-500 text-center py-4">
              Brak zaplanowanych jazd
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/student/schedule')}
            className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <Calendar className="h-6 w-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-dark-900">Mój grafik</h3>
            <p className="text-sm text-gray-500 dark:text-dark-500">
              {stats.upcomingLessons} nadchodzących jazd
              {stats.pendingProposals > 0 && `, ${stats.pendingProposals} propozycji`}
            </p>
          </button>

          <button
            onClick={() => navigate('/student/lessons')}
            className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <Clock className="h-6 w-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-dark-900">Historia jazd</h3>
            <p className="text-sm text-gray-500 dark:text-dark-500">Przeglądaj i oceniaj jazdy</p>
          </button>

          <button
            onClick={() => navigate('/student/documents')}
            className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <FileText className="h-6 w-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-dark-900">Dokumenty</h3>
            <p className="text-sm text-gray-500 dark:text-dark-500">Wymiana dokumentów z OSK</p>
          </button>

          <button
            onClick={() => navigate('/student/profile')}
            className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <User className="h-6 w-6 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-dark-900">Profil</h3>
            <p className="text-sm text-gray-500 dark:text-dark-500">Edytuj swoje dane</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
