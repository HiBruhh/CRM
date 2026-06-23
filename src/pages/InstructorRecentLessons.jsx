import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowLeft, Calendar, Clock, User, FileText, X, CheckCircle, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatLocalTime, formatLocalDate } from '../utils/timeHelpers'

const InstructorRecentLessons = () => {
  const navigate = useNavigate()
  const supabase = useSupabase()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [checklistData, setChecklistData] = useState({
    vehicle_preparation: 0,
    controls_familiarity: 0,
    steering_control: 0,
    acceleration_braking: 0,
    gear_shifting: 0,
    mirror_use: 0,
    blind_spot_check: 0,
    lane_positioning: 0,
    turning: 0,
    parking: 0,
    traffic_rules: 0,
    road_signs: 0,
    emergency_procedures: 0,
    instructor_notes: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(null)

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      // Get instructor ID from user metadata
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (instructorError) throw instructorError

      const { data, error } = await supabase
        .from('driving_lessons')
        .select(`
          *,
          students (
            student_id,
            first_name,
            last_name
          )
        `)
        .eq('instructor_id', instructorData.id)
        .order('start_time', { ascending: false })
        .limit(50)

      if (error) throw error
      setLessons(data)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      toast.error('Błąd podczas pobierania jazd')
    } finally {
      setLoading(false)
    }
  }

  const openChecklistModal = (lesson) => {
    setSelectedLesson(lesson)
    if (lesson.checklist) {
      setChecklistData(lesson.checklist)
    } else {
      setChecklistData({
        vehicle_preparation: 0,
        controls_familiarity: 0,
        steering_control: 0,
        acceleration_braking: 0,
        gear_shifting: 0,
        mirror_use: 0,
        blind_spot_check: 0,
        lane_positioning: 0,
        turning: 0,
        parking: 0,
        traffic_rules: 0,
        road_signs: 0,
        emergency_procedures: 0,
        instructor_notes: ''
      })
    }
    setShowChecklistModal(true)
  }

  const handleSaveChecklist = async () => {
    if (!selectedLesson) return
    setIsSaving(true)

    const totalScore = Object.keys(checklistData).reduce((sum, key) => {
      if (key !== 'instructor_notes') {
        return sum + checklistData[key]
      }
      return sum
    }, 0)

    const normalizedScore = Math.round((totalScore / 130) * 100)

    try {
      const { error } = await supabase
        .from('driving_lessons')
        .update({
          checklist: checklistData,
          score: normalizedScore
        })
        .eq('id', selectedLesson.id)

      if (error) throw error

      toast.success('Checklist zapisany pomyślnie')
      setShowSuccessAnimation(selectedLesson.id)
      setTimeout(() => setShowSuccessAnimation(null), 2000)
      setShowChecklistModal(false)
      fetchLessons()
    } catch (error) {
      console.error('Error saving checklist:', error)
      toast.error('Błąd podczas zapisywania checklisty')
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Zakończona'
      case 'cancelled':
        return 'Anulowana'
      case 'in_progress':
        return 'W trakcie'
      case 'confirmed':
        return 'Potwierdzona'
      default:
        return status
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/instructor-panel')}
            className="flex items-center text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Powrót do panelu
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900">Ostatnie jazdy</h1>
          <p className="text-gray-600 dark:text-dark-600 mt-2">Przeglądaj swoje ostatnie jazdy i wypełniaj checklisty</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white dark:bg-dark-100 rounded-lg shadow">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-dark-500">Brak jazd do wyświetlenia</p>
            </div>
          ) : (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white dark:bg-dark-100 rounded-lg shadow hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {showSuccessAnimation === lesson.id && (
                  <div className="absolute inset-0 bg-green-50 dark:bg-green-900/20 flex items-center justify-center z-10 animate-in fade-in duration-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 animate-bounce" />
                      <span className="text-green-600 dark:text-green-400 font-medium">Checklista wypełniona!</span>
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-900">
                          {lesson.students?.first_name} {lesson.students?.last_name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-dark-500">
                          {lesson.students?.student_id}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lesson.status)}`}>
                      {getStatusLabel(lesson.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{formatLocalDate(lesson.start_time)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-600">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{formatLocalTime(lesson.start_time)} • {lesson.duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-200">
                    {lesson.checklist ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">Wypełniona</span>
                        {lesson.score && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            {lesson.score}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openChecklistModal(lesson)}
                        className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Wypełnij checklistę
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Checklist Modal */}
      {showChecklistModal && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-dark-900">
                  Checklisty - {selectedLesson.students?.first_name} {selectedLesson.students?.last_name}
                </h3>
                <button
                  onClick={() => setShowChecklistModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {Object.keys(checklistData).map((key) => {
                  if (key === 'instructor_notes') {
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                          Notatki instruktora
                        </label>
                        <textarea
                          value={checklistData[key]}
                          onChange={(e) => setChecklistData({ ...checklistData, [key]: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-200 dark:text-dark-900"
                          placeholder="Dodaj uwagi o lekcji..."
                        />
                      </div>
                    )
                  }

                  const labels = {
                    vehicle_preparation: 'Przygotowanie pojazdu',
                    controls_familiarity: 'Znajomość sterowania',
                    steering_control: 'Kierowanie',
                    acceleration_braking: 'Przyspieszanie i hamowanie',
                    gear_shifting: 'Zmiana biegów',
                    mirror_use: 'Korzystanie z lusterek',
                    blind_spot_check: 'Kontrola martwego pola',
                    lane_positioning: 'Pozycjonowanie na pasie',
                    turning: 'Skręcanie',
                    parking: 'Parkowanie',
                    traffic_rules: 'Przepisy ruchu',
                    road_signs: 'Znaki drogowe',
                    emergency_procedures: 'Procedury awaryjne'
                  }

                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                        {labels[key] || key}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={checklistData[key]}
                        onChange={(e) => setChecklistData({ ...checklistData, [key]: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-dark-500">
                        <span>0</span>
                        <span>{checklistData[key]}</span>
                        <span>10</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowChecklistModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveChecklist}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstructorRecentLessons
