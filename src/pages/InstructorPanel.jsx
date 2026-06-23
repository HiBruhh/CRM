import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { Car, Calendar, Users, FileText } from 'lucide-react'
import NotificationsPanel from '../components/NotificationsPanel'
import { formatLocalTime, formatLocalDate } from '../utils/timeHelpers'

const InstructorPanel = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [lessons, setLessons] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Oblicz początek i koniec tygodnia
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      let lessonsQuery = supabase
        .from('driving_lessons')
        .select(`
          *,
          student:students(id, first_name, last_name, student_id),
          instructor:instructors(id, first_name, last_name)
        `)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .order('start_time', { ascending: true })

      // Jeśli użytkownik to instruktor, filtruj tylko jego jazdy
      if (user?.role === 'instructor') {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (instructorData) {
          lessonsQuery = lessonsQuery.eq('instructor_id', instructorData.id)
        }
      }

      const { data: lessonsData, error: lessonsError } = await lessonsQuery
      
      if (lessonsError) throw lessonsError
      
      // Sortuj lekcje wg statusu: in_progress, pending, completed, cancelled
      const statusPriority = {
        'in_progress': 4,
        'pending': 3,
        'completed': 2,
        'cancelled': 1
      }
      
      const sortedLessons = (lessonsData || []).sort((a, b) => {
        const priorityA = statusPriority[a.status] || 0
        const priorityB = statusPriority[b.status] || 0
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA
        }
        
        // W ramach tego samego statusu, sortuj po dacie malejąco (najnowsze na górze)
        return new Date(b.start_time) - new Date(a.start_time)
      })
      
      setLessons(sortedLessons)

      // Pobierz kursantów dla statystyk
      let studentsQuery = supabase
        .from('students')
        .select('id, first_name, last_name, student_id, status, required_hours, completed_hours')
        .eq('status', 'active')

      if (user?.role === 'instructor') {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (instructorData) {
          studentsQuery = studentsQuery.eq('instructor_id', instructorData.id)
        }
      }

      const { data: studentsData } = await studentsQuery
      
      // Pobierz ostatnie jazdy dla każdego kursanta
      const studentsWithLastLesson = await Promise.all(
        (studentsData || []).map(async (student) => {
          let lessonsQuery = supabase
            .from('driving_lessons')
            .select('start_time')
            .eq('student_id', student.id)
            .neq('status', 'cancelled')
            .order('start_time', { ascending: false })
            .limit(1)

          if (user?.role === 'instructor') {
            const { data: instructorData } = await supabase
              .from('instructors')
              .select('id')
              .eq('auth_id', user.id)
              .single()

            if (instructorData) {
              lessonsQuery = lessonsQuery.eq('instructor_id', instructorData.id)
            }
          }

          const { data: lastLesson } = await lessonsQuery
          return {
            ...student,
            last_lesson_date: lastLesson && lastLesson.length > 0 ? lastLesson[0].start_time : null
          }
        })
      )
      
      setStudents(studentsWithLastLesson || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    fetchDashboardData()
  }, [user?.id])

  const getWeekStats = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const weekLessons = lessons.filter(l => new Date(l.start_time) >= startOfWeek)
    const totalMinutes = weekLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
    
    return {
      studentCount: students.length,
      todayLessons: lessons.filter(l => {
        const lessonDate = new Date(l.start_time)
        const today = new Date()
        return lessonDate.toDateString() === today.toDateString()
      }).length,
      weeklyHours: (totalMinutes / 60).toFixed(1)
    }
  }

  const stats = getWeekStats()

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
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Oczekuje'
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
      case 'completed': return 'bg-green-100 dark:bg-green-900/40'
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/40'
      default: return 'bg-gray-100 dark:bg-dark-200'
    }
  }

  const displayLessons = lessons.slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
            {user?.role === 'admin' ? 'Panel administratora' : 'Twój panel'}
          </h2>
          <p className="mt-1 text-gray-600 dark:text-dark-600">
            {user?.role === 'admin' ? 'Zarządzaj szkołą jazdy' : 'Zarządzaj swoim grafikiem i kursantami'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Przypisani kursanci</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.studentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Jazdy dziś</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.todayLessons}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-lg p-3">
                <Car className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-dark-600">Godziny w tygodniu</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-900">{stats.weeklyHours}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4">Szybkie akcje</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/schedule')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
              >
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-600 dark:text-dark-600 mr-3" />
                  {user?.role === 'admin' ? 'Grafik' : 'Mój grafik'}
                </span>
                <span className="text-gray-400 dark:text-dark-400">→</span>
              </button>

              <button
                onClick={() => navigate('/students')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
              >
                <span className="flex items-center">
                  <Users className="h-5 w-5 text-gray-600 dark:text-dark-600 mr-3" />
                  {user?.role === 'admin' ? 'Kursanci' : 'Moi kursanci'}
                </span>
                <span className="text-gray-400 dark:text-dark-400">→</span>
              </button>

              <button
                onClick={() => navigate('/instructor/recent-lessons')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
              >
                <span className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-600 dark:text-dark-600 mr-3" />
                  Ostatnie jazdy
                </span>
                <span className="text-gray-400 dark:text-dark-400">→</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/instructors')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
                >
                  <span className="flex items-center">
                    <Car className="h-5 w-5 text-gray-600 dark:text-dark-600 mr-3" />
                    Instruktorzy
                  </span>
                  <span className="text-gray-400 dark:text-dark-400">→</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4">
              {user?.role === 'admin' ? 'Jazdy w tym tygodniu' : 'Twoje jazdy w tym tygodniu'}
            </h3>
            {loading ? (
              <p className="text-gray-500 dark:text-dark-500">Ładowanie...</p>
            ) : displayLessons.length === 0 ? (
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
                      {user?.role === 'admin' && lesson.instructor && (
                        <p className="text-xs text-gray-600 dark:text-dark-600 truncate">
                          Instruktor: {lesson.instructor.first_name} {lesson.instructor.last_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-dark-600">
                        {formatDate(lesson.start_time)} • {formatLocalTime(lesson.start_time)} - {formatLocalTime(lesson.end_time)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(lesson.status).replace('bg-', 'border-').replace('text-', 'text-')}`}>
                      {getStatusLabel(lesson.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <NotificationsPanel />
        </div>

        {/* Students Table */}
        <div className="mt-8 bg-white dark:bg-dark-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900 mb-4">
            {user?.role === 'admin' ? 'Kursanci' : 'Moi kursanci'}
          </h3>
          {loading ? (
            <p className="text-gray-500 dark:text-dark-500">Ładowanie...</p>
          ) : students.length === 0 ? (
            <p className="text-gray-500 dark:text-dark-500">Brak kursantów</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-300">
                <thead className="bg-gray-50 dark:bg-dark-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                      Kursant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                      Godziny
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                      Ostatnia jazda
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-dark-300">
                  {students.slice(0, 5).map((student) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-dark-900">{student.first_name} {student.last_name}</div>
                          <div className="text-sm text-gray-500 dark:text-dark-500">{student.student_id || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                          {student.status === 'active' ? 'Aktywny' : student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-900">
                        {student.completed_hours !== null && student.completed_hours !== undefined 
                          ? `${student.completed_hours}/${student.required_hours || 30}h` 
                          : student.required_hours ? `0/${student.required_hours}h` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-500">
                        {student.last_lesson_date ? `${formatDate(student.last_lesson_date)} ${formatLocalTime(student.last_lesson_date)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default InstructorPanel
