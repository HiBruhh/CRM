import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { Bell, Check, Calendar, User, Car, X } from 'lucide-react'
import { formatLocalDate, formatLocalTime } from '../utils/timeHelpers'
import toast from 'react-hot-toast'

const NotificationsPanel = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('dismissed', false)
          .order('created_at', { ascending: false })

        if (error) throw error

        setNotifications(data || [])
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`notifications-panel:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      toast.error('Błąd oznaczania powiadomienia')
      console.error(error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      )
      toast.success('Wszystkie powiadomienia oznaczone jako przeczytane')
    } catch (error) {
      toast.error('Błąd oznaczania powiadomień')
      console.error(error)
    }
  }

  const deleteAllNotifications = async () => {
    try {
      // First mark all as read, then dismiss
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, dismissed: true })
        .eq('user_id', user.id)
        .eq('dismissed', false)

      if (error) throw error

      setNotifications([])
      toast.success('Wszystkie powiadomienia usunięte')
    } catch (error) {
      toast.error('Błąd usuwania powiadomień')
      console.error(error)
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }

    if (notification.type === 'checklist_reminder' && notification.entity_type === 'lesson' && notification.entity_id) {
      // Save lesson ID to localStorage so Schedule can open checklist modal
      localStorage.setItem('openChecklistForLesson', notification.entity_id)
      window.location.href = '/schedule'
    } else if (notification.type === 'checklist_completed' && notification.metadata?.instructor_id) {
      // For instructors: go to recent lessons
      // For admins: go to instructor profile
      if (user?.role === 'instructor') {
        window.location.href = '/instructor/recent-lessons'
      } else {
        window.location.href = `/instructors/${notification.metadata.instructor_id}`
      }
    } else if (notification.entity_type && notification.entity_id) {
      if (notification.entity_type === 'lesson') {
        window.location.href = '/schedule'
      } else if (notification.entity_type === 'student') {
        window.location.href = `/students/${notification.entity_id}`
      } else if (notification.entity_type === 'instructor') {
        window.location.href = `/instructors/${notification.entity_id}`
      }
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'lesson_created':
      case 'lesson_updated':
      case 'lesson_cancelled':
      case 'lesson_completed':
      case 'lesson_deleted':
        return <Calendar className="h-5 w-5" />
      case 'student_assigned':
      case 'student_removed':
        return <User className="h-5 w-5" />
      case 'instructor_created':
      case 'instructor_updated':
      case 'instructor_deleted':
        return <Car className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'lesson_created':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
      case 'lesson_updated':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
      case 'lesson_cancelled':
        return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
      case 'lesson_completed':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
      case 'lesson_deleted':
        return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
      case 'student_assigned':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
      case 'student_removed':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
      case 'instructor_created':
        return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
      case 'instructor_updated':
        return 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300'
      case 'instructor_deleted':
        return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900">Powiadomienia</h3>
          <Bell className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-dark-500 text-sm">Ładowanie powiadomień...</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900">Powiadomienia</h3>
        <Bell className="h-5 w-5 text-gray-400" />
      </div>
      {notifications.length === 0 ? (
        <p className="text-gray-500 dark:text-dark-500 text-sm">Brak powiadomień</p>
      ) : (
        <>
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  notification.read
                    ? 'bg-gray-50 dark:bg-dark-200 opacity-60'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                } hover:bg-gray-100 dark:hover:bg-dark-300`}
              >
                <div className={`flex-shrink-0 p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notification.read ? 'text-gray-600 dark:text-dark-600' : 'text-gray-900 dark:text-dark-900'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-400 mt-2">
                    {formatLocalDate(notification.created_at)} • {formatLocalTime(notification.created_at)}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      markAsRead(notification.id)
                    }}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Oznacz jako przeczytane"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {notifications.some(n => !n.read) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="flex-1 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors rounded-lg border border-gray-200 dark:border-dark-300"
              >
                Oznacz jako przeczytane
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteAllNotifications()
              }}
              className="flex-1 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg border border-red-200 dark:border-red-800"
            >
              Usuń wszystkie
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationsPanel
