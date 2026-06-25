import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Check,
  X,
  AlertCircle,
  Loader2,
  MessageSquare
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatLocalDate, formatLocalTime } from '../utils/timeHelpers'
import { sendLessonEmail } from '../services/studentNotificationService'
import toast from 'react-hot-toast'

const StudentSchedule = () => {
  const { user } = useAuth()
  const supabase = useSupabase()

  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [cancellationNote, setCancellationNote] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    if (!user?.studentId) return
    loadLessons()
  }, [user?.studentId])

  const loadLessons = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('driving_lessons')
        .select(`
          *,
          instructor:instructors(id, first_name, last_name)
        `)
        .eq('student_id', user.studentId)
        .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in('status', ['pending', 'proposed'])
        .order('start_time', { ascending: true })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error('Błąd ładowania grafiku:', error)
      toast.error('Nie udało się załadować grafiku')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (lessonId) => {
    setProcessingId(lessonId)
    try {
      const { error } = await supabase
        .from('driving_lessons')
        .update({ status: 'pending' })
        .eq('id', lessonId)
        .eq('student_id', user.studentId)
        .eq('status', 'proposed')

      if (error) throw error
      toast.success('Propozycja jazdy zaakceptowana')
      try {
        await sendLessonEmail(lessonId, 'proposal_accepted')
      } catch (emailError) {
        console.error('Błąd wysyłania powiadomienia:', emailError)
      }
      await loadLessons()
    } catch (error) {
      console.error('Błąd akceptacji:', error)
      toast.error('Nie udało się zaakceptować propozycji')
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectModal = (lesson) => {
    setSelectedLesson(lesson)
    setRejectionNote('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!selectedLesson) return
    setProcessingId(selectedLesson.id)
    try {
      const { error } = await supabase
        .from('driving_lessons')
        .update({
          status: 'rejected',
          student_comment: rejectionNote,
          student_visible: true
        })
        .eq('id', selectedLesson.id)
        .eq('student_id', user.studentId)
        .eq('status', 'proposed')

      if (error) throw error
      toast.success('Propozycja odrzucona')
      try {
        await sendLessonEmail(selectedLesson.id, 'proposal_rejected')
      } catch (emailError) {
        console.error('Błąd wysyłania powiadomienia:', emailError)
      }
      setShowRejectModal(false)
      await loadLessons()
    } catch (error) {
      console.error('Błąd odrzucenia:', error)
      toast.error('Nie udało się odrzucić propozycji')
    } finally {
      setProcessingId(null)
    }
  }

  const openCancelModal = (lesson) => {
    setSelectedLesson(lesson)
    setCancellationNote('')
    setShowCancelModal(true)
  }

  const handleCancelRequest = async () => {
    if (!selectedLesson) return
    setProcessingId(selectedLesson.id)
    try {
      const { error } = await supabase
        .from('driving_lessons')
        .update({
          cancellation_requested: true,
          cancellation_reason: cancellationNote,
          cancellation_status: 'pending'
        })
        .eq('id', selectedLesson.id)
        .eq('student_id', user.studentId)

      if (error) throw error
      toast.success('Wniosek o anulowanie wysłany')
      setShowCancelModal(false)
      await loadLessons()
    } catch (error) {
      console.error('Błąd anulowania:', error)
      toast.error('Nie udało się wysłać wniosku')
    } finally {
      setProcessingId(null)
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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-6">Mój grafik</h1>

        {lessons.length === 0 ? (
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-dark-500">Brak zaplanowanych jazd</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className={`bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 border-l-4 ${
                  lesson.status === 'proposed'
                    ? 'border-yellow-400'
                    : lesson.cancellation_requested
                    ? 'border-red-400'
                    : 'border-primary-500'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                        {formatLocalDate(lesson.start_time)}
                      </span>
                      {lesson.status === 'proposed' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Propozycja
                        </span>
                      )}
                      {lesson.cancellation_requested && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          Wniosek o anulowanie
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-dark-600 mb-1">
                      <Clock className="h-4 w-4" />
                      {formatLocalTime(lesson.start_time)} - {formatLocalTime(lesson.end_time)}
                    </div>
                    {lesson.location && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-dark-600 mb-1">
                        <MapPin className="h-4 w-4" />
                        {lesson.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-dark-600">
                      <User className="h-4 w-4" />
                      {lesson.instructor?.first_name} {lesson.instructor?.last_name}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {lesson.status === 'proposed' ? (
                      <>
                        <button
                          onClick={() => handleAccept(lesson.id)}
                          disabled={processingId === lesson.id}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingId === lesson.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Akceptuj
                        </button>
                        <button
                          onClick={() => openRejectModal(lesson)}
                          disabled={processingId === lesson.id}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Odrzuć
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openCancelModal(lesson)}
                        disabled={processingId === lesson.id || lesson.cancellation_requested}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {lesson.cancellation_requested ? 'Wniosek wysłany' : 'Anuluj jazdę'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">
              Odrzuć propozycję jazdy
            </h3>
            <p className="text-gray-600 dark:text-dark-600 mb-4">
              Podaj powód odrzucenia (opcjonalnie):
            </p>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 mb-4"
              placeholder="Np. Nie mogę w tym terminie..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === selectedLesson?.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === selectedLesson?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Odrzuć'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">
              Wnioskuj o anulowanie jazdy
            </h3>
            <p className="text-gray-600 dark:text-dark-600 mb-4">
              Podaj powód (opcjonalnie):
            </p>
            <textarea
              value={cancellationNote}
              onChange={(e) => setCancellationNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 mb-4"
              placeholder="Np. Nie mogę w tym terminie..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={processingId === selectedLesson?.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === selectedLesson?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Wyślij wniosek'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentSchedule
