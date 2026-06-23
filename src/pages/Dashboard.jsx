import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { Car, Users, Calendar, Clock, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import NotificationsPanel from '../components/NotificationsPanel'
import { formatLocalTime, formatLocalDate, isNowBetween } from '../utils/timeHelpers'

const Dashboard = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayLessons: 0,
    weeklyHours: 0,
    totalInstructors: 0
  })
  const [weekLessons, setWeekLessons] = useState([])

  const isAdmin = user?.role === 'super_admin' || user?.role === 'org_admin'
  const isOrgAdmin = user?.role === 'org_admin' && user?.organizationId

  // Pobieranie danych statystyk z Supabase
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching dashboard stats...')
        
        // Pobieramy liczbę kursantów
        let studentsQuery = supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
        if (isOrgAdmin) studentsQuery = studentsQuery.eq('organization_id', user.organizationId)
        const { count: studentsCount } = await studentsQuery

        // Pobieramy dzisiejsze jazdy
        const today = new Date().toISOString().split('T')[0]
        let todayLessonsQuery = supabase
          .from('driving_lessons')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', today)
          .lt('start_time', new Date(new Date(today).setDate(new Date(today).getDate() + 1)).toISOString())
        if (isOrgAdmin) todayLessonsQuery = todayLessonsQuery.eq('organization_id', user.organizationId)
        const { count: todayLessonsCount } = await todayLessonsQuery

        // Pobieramy liczbę instruktorów
        let instructorsQuery = supabase
          .from('instructors')
          .select('*', { count: 'exact', head: true })
        if (isOrgAdmin) instructorsQuery = instructorsQuery.eq('organization_id', user.organizationId)
        const { count: instructorsCount } = await instructorsQuery

        // Obliczamy godziny w tym tygodniu
        const weekStart = new Date()
        const dayOfWeek = weekStart.getDay()
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        weekStart.setDate(diff)
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        let weekHoursQuery = supabase
          .from('driving_lessons')
          .select('duration_minutes')
          .gte('start_time', weekStart.toISOString())
          .lte('start_time', weekEnd.toISOString())
          .eq('status', 'completed')
        if (isOrgAdmin) weekHoursQuery = weekHoursQuery.eq('organization_id', user.organizationId)
        const { data: weekLessonsData } = await weekHoursQuery

        const weeklyHours = weekLessonsData?.reduce((total, lesson) => {
          return total + (lesson.duration_minutes || 0)
        }, 0) / 60

        // Pobieramy jazdy z tego tygodnia z danymi o kursantach i instruktorach
        let weekDetailsQuery = supabase
          .from('driving_lessons')
          .select(`
            *,
            student:students(id, first_name, last_name, student_id),
            instructor:instructors(id, first_name, last_name)
          `)
          .gte('start_time', weekStart.toISOString())
          .lte('start_time', weekEnd.toISOString())
        if (isOrgAdmin) weekDetailsQuery = weekDetailsQuery.eq('organization_id', user.organizationId)
        const { data: lessonsWithDetails } = await weekDetailsQuery.order('start_time', { ascending: true })

        // Korekta statusów - zmień confirmed/pending na in_progress jeśli lekcja się zaczęła
        // oraz na completed jeśli lekcja się zakończyła
        const now = new Date()
        for (const lesson of (lessonsWithDetails || [])) {
          if (lesson.status === 'confirmed' || lesson.status === 'pending') {
            const lessonStart = new Date(lesson.start_time)
            const lessonEnd = new Date(lesson.end_time)
            // Dane w bazie są TIMESTAMP WITHOUT TIME ZONE (czas lokalny)
            // Nie potrzebujemy korekcji timezone
            
            if (lessonStart <= now) {
              // Jeśli lekcja się zakończyła, zmień na completed
              if (lessonEnd <= now) {
                lesson.status = 'completed'
              } else {
                // Jeśli się zaczęła, zmień na in_progress
                lesson.status = 'in_progress'
              }
            }
          }
        }

        // Sortowanie według statusu: w trakcie > oczekujące > zakończone
        const statusPriority = {
          'in_progress': 0,
          'pending': 1,
          'confirmed': 1,
          'completed': 2,
          'cancelled': 3
        }
        
        const sortedLessons = (lessonsWithDetails || []).sort((a, b) => {
          const priorityA = statusPriority[a.status] ?? 999
          const priorityB = statusPriority[b.status] ?? 999
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }
          return new Date(a.start_time) - new Date(b.start_time)
        })

        console.log('Week lessons with statuses:')
        sortedLessons.forEach(l => {
          console.log(`- ID: ${l.id}, Status: ${l.status}, Student: ${l.student?.first_name} ${l.student?.last_name}, Start: ${l.start_time}`)
        })

        setStats({
          totalStudents: studentsCount || 0,
          todayLessons: todayLessonsCount || 0,
          weeklyHours: Math.round(weeklyHours * 10) / 10,
          totalInstructors: instructorsCount || 0
        })
        
        setWeekLessons(sortedLessons)

        console.log('Stats loaded:', {
          totalStudents: studentsCount,
          todayLessons: todayLessonsCount,
          weeklyHours: Math.round(weeklyHours * 10) / 10,
          totalInstructors: instructorsCount
        })

      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Odśwież dane gdy użytkownik wróci na stronę (focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) return 'Dziś'
    if (date.toDateString() === tomorrow.toDateString()) return 'Jutro'
    
    return formatLocalDate(dateString)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700'
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-dark-200 dark:text-dark-900 dark:border-dark-300'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Oczekuje'
      case 'confirmed': return 'Potwierdzona'
      case 'in_progress': return 'W trakcie'
      case 'completed': return 'Zakończona'
      case 'cancelled': return 'Anulowana'
      default: return status
    }
  }

  const getLessonBackgroundColor = (status) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 dark:bg-blue-900/40'
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/40'
      case 'confirmed': return 'bg-yellow-100 dark:bg-yellow-900/40'
      case 'completed': return 'bg-green-100 dark:bg-green-900/40'
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/40'
      default: return 'bg-gray-100 dark:bg-dark-200'
    }
  }

  const displayLessons = weekLessons

  if (loading) {
    return <LoadingSpinner text="Ładowanie danych..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-900">Panel główny</h2>
          <p className="mt-1 text-gray-600 dark:text-dark-600">
            Witaj {isAdmin ? 'Administratorze' : 'Instruktorze'}! Oto przegląd systemu.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            onClick={() => navigate('/students')}
            className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-dark-200 transition-all duration-200 hover:shadow-xl cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Kursanci</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.totalStudents}</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/students'); }}
              className="mt-4 w-full text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Zarządzaj kursantami →
            </button>
          </div>

          <div
            onClick={() => navigate('/schedule')}
            className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-dark-200 transition-all duration-200 hover:shadow-xl cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Jazdy dziś</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.todayLessons}</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/schedule'); }}
              className="mt-4 w-full text-sm text-green-600 dark:text-green-400 font-medium hover:underline"
            >
              Zobacz grafik →
            </button>
          </div>

          <div
            onClick={() => navigate('/schedule')}
            className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-dark-200 transition-all duration-200 hover:shadow-xl cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-lg p-3">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Godziny w tygodniu</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.weeklyHours}</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/schedule'); }}
              className="mt-4 w-full text-sm text-yellow-600 dark:text-yellow-400 font-medium hover:underline"
            >
              Zobacz grafik →
            </button>
          </div>

          <div
            onClick={() => isAdmin ? navigate('/instructors') : null}
            className={`bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-dark-200 transition-all duration-200 hover:shadow-xl ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900 rounded-lg p-3">
                <Car className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Instruktorzy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.totalInstructors}</p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/instructors'); }}
                className="mt-4 w-full text-sm text-purple-600 dark:text-purple-400 font-medium hover:underline"
              >
                Zarządzaj instruktorami →
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Szybkie akcje</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/schedule')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-600 mr-3" />
                  Grafik jazd
                </span>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => navigate('/students')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center">
                  <Users className="h-5 w-5 text-gray-600 mr-3" />
                  Zarządzaj kursantami
                </span>
                <span className="text-gray-400">→</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => navigate('/instructors')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center">
                    <User className="h-5 w-5 text-gray-600 mr-3" />
                    Zarządzaj instruktorami
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4">Jazdy w tym tygodniu</h3>
            {displayLessons.length === 0 ? (
              <p className="text-gray-500 dark:text-dark-500">Brak zaplanowanych jazd w tym tygodniu</p>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {displayLessons.map((lesson) => (
                  <div key={lesson.id} className={`relative flex items-center justify-between p-3 rounded-lg ${getLessonBackgroundColor(lesson.status)} ${lesson.status === 'in_progress' ? 'border-2 border-red-500 animate-pulse-border' : ''}`}>
                    {lesson.status === 'in_progress' && (
                      <div className="absolute top-2 right-2">
                        <div className="relative">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-dark-900 truncate">
                        {lesson.student?.first_name} {lesson.student?.last_name} ({lesson.student?.student_id || 'N/A'})
                      </p>
                      <p className="text-xs text-gray-600 dark:text-dark-600 truncate">
                        Instruktor: {lesson.instructor?.first_name} {lesson.instructor?.last_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-dark-600">
                        {formatDate(lesson.start_time)} • {formatLocalTime(lesson.start_time)} - {formatLocalTime(lesson.end_time)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(lesson.status)}`}>
                        {getStatusLabel(lesson.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <NotificationsPanel />
        </div>
      </main>
    </div>
  )
}

export default Dashboard
