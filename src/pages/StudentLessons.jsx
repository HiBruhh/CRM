import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  Calendar,
  Clock,
  User,
  Star,
  MessageSquare,
  Loader2,
  X
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatLocalDate, formatLocalTime } from '../utils/timeHelpers'
import toast from 'react-hot-toast'

const StudentLessons = () => {
  const { user } = useAuth()
  const supabase = useSupabase()

  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [ratingLesson, setRatingLesson] = useState(null)
  const [rating, setRating] = useState(0)
  const [whatWasGood, setWhatWasGood] = useState('')
  const [whatWasUnclear, setWhatWasUnclear] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
          instructor:instructors(id, first_name, last_name),
          rating:student_lesson_ratings(id, rating, what_was_good, what_was_unclear)
        `)
        .eq('student_id', user.studentId)
        .in('status', ['completed', 'cancelled', 'rejected'])
        .order('start_time', { ascending: false })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error('Błąd ładowania historii:', error)
      toast.error('Nie udało się załadować historii jazd')
    } finally {
      setLoading(false)
    }
  }

  const openRatingModal = (lesson) => {
    setRatingLesson(lesson)
    const existing = lesson.rating?.[0]
    setRating(existing?.rating || 0)
    setWhatWasGood(existing?.what_was_good || '')
    setWhatWasUnclear(existing?.what_was_unclear || '')
  }

  const handleSaveRating = async () => {
    if (!ratingLesson || rating === 0) {
      toast.error('Wybierz ocenę')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('student_lesson_ratings')
        .upsert({
          lesson_id: ratingLesson.id,
          student_id: user.studentId,
          rating,
          what_was_good: whatWasGood,
          what_was_unclear: whatWasUnclear
        }, {
          onConflict: 'lesson_id,student_id'
        })

      if (error) throw error
      toast.success('Ocena została zapisana')
      setRatingLesson(null)
      await loadLessons()
    } catch (error) {
      console.error('Błąd zapisywania oceny:', error)
      toast.error('Nie udało się zapisać oceny')
    } finally {
      setIsSaving(false)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-6">Historia jazd</h1>

        {lessons.length === 0 ? (
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-dark-500">Brak historii jazd</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => {
              const existingRating = lesson.rating?.[0]
              return (
                <div
                  key={lesson.id}
                  className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                          {formatLocalDate(lesson.start_time)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          lesson.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : lesson.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {lesson.status === 'completed' ? 'Zakończona' : lesson.status === 'cancelled' ? 'Anulowana' : 'Odrzucona'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-dark-600 mb-1">
                        <Clock className="h-4 w-4" />
                        {formatLocalTime(lesson.start_time)} - {formatLocalTime(lesson.end_time)}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-dark-600">
                        <User className="h-4 w-4" />
                        {lesson.instructor?.first_name} {lesson.instructor?.last_name}
                      </div>
                    </div>

                    {lesson.status === 'completed' && (
                      <button
                        onClick={() => openRatingModal(lesson)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200"
                      >
                        <Star className="h-4 w-4" />
                        {existingRating ? 'Edytuj ocenę' : 'Oceń jazdę'}
                      </button>
                    )}
                  </div>

                  {existingRating && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-200">
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= existingRating.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {(existingRating.what_was_good || existingRating.what_was_unclear) && (
                        <div className="space-y-1 text-sm text-gray-600 dark:text-dark-600">
                          {existingRating.what_was_good && (
                            <p><span className="font-medium">Co było dobre:</span> {existingRating.what_was_good}</p>
                          )}
                          {existingRating.what_was_unclear && (
                            <p><span className="font-medium">Co było niejasne:</span> {existingRating.what_was_unclear}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rating modal */}
      {ratingLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Oceń jazdę</h3>
              <button
                onClick={() => setRatingLesson(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-dark-600 mb-4">
              {formatLocalDate(ratingLesson.start_time)} — {ratingLesson.instructor?.first_name} {ratingLesson.instructor?.last_name}
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                  Co było dobre? (opcjonalnie)
                </label>
                <textarea
                  value={whatWasGood}
                  onChange={(e) => setWhatWasGood(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                  Co było niejasne? (opcjonalnie)
                </label>
                <textarea
                  value={whatWasUnclear}
                  onChange={(e) => setWhatWasUnclear(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRatingLesson(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveRating}
                disabled={isSaving || rating === 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Zapisz ocenę'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentLessons
