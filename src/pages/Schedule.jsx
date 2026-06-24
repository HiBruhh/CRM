import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import plLocale from '@fullcalendar/core/locales/pl'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSupabase } from '../contexts/SupabaseContext'
import LessonForm from '../components/LessonForm'
import toast from 'react-hot-toast'
import { X, Plus, Minus } from 'lucide-react'
import '../styles/calendar.css'

const Schedule = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lastSelection, setLastSelection] = useState(null)
  const [calendarKey, setCalendarKey] = useState(0)
  const [currentView, setCurrentView] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const calendarRef = useRef(null)
  const intervalRef = useRef(null)
  const lessonFormRef = useRef(null)
  
  // Checklist modal states
  const [showChecklistModal, setShowChecklistModal] = useState(false)
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
  const [selectedLessonForChecklist, setSelectedLessonForChecklist] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    fetchSchedule()
    fetchResources()
    
    // Zablokuj scrollbar całej strony tylko dla Schedule
    document.body.style.overflow = 'hidden'

    // Automatyczne odświeżanie kalendarza co 2 minuty
    intervalRef.current = setInterval(() => {
      fetchSchedule()
    }, 120000)

    // Odśwież dane gdy użytkownik wróci na stronę (focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchSchedule()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Obsługa klawisza Delete do usuwania zaznaczonych jazd
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedLesson?.id && lessonFormRef.current) {
        lessonFormRef.current.handleDelete()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      // Przywróć scrollbar przy odmontowaniu
      document.body.style.overflow = ''
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [user?.id, selectedLesson])

  const fetchResources = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, first_name, last_name')

      // Szef organizacji widzi tylko instruktorów ze swojej organizacji
      if (user?.role === 'org_admin' && user?.organizationId) {
        query = query.eq('organization_id', user.organizationId)
      }

      // Instruktor widzi tylko siebie jako zasób
      if (user?.role === 'instructor') {
        query = query.eq('auth_id', user.id)
      }

      const { data: instructors } = await query

      const formattedResources = instructors?.map(instructor => ({
        id: instructor.id.toString(),
        title: `${instructor.first_name} ${instructor.last_name}`
      })) || []
      
      setResources(formattedResources)
    } catch (error) {
      console.error('Error fetching resources:', error)
    }
  }


  const fetchSchedule = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('driving_lessons')
        .select(`
          *,
          student:students(id, first_name, last_name, student_id),
          instructor:instructors(id, first_name, last_name)
        `)

      // Szef organizacji widzi tylko jazdy ze swojej organizacji
      if (user?.role === 'org_admin' && user?.organizationId) {
        query = query.eq('organization_id', user.organizationId)
      }

      // Jeśli użytkownik to instruktor, filtruj tylko jego jazdy
      if (user?.role === 'instructor') {
        // Pobierz instruktora po auth_id
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (instructorData) {
          query = query.eq('instructor_id', instructorData.id)
        }
      }

      const { data, error } = await query.order('start_time', { ascending: true })

      if (error) throw error

      const formattedEvents = data.map(lesson => {
        // FullCalendar z timeZone={'local'} automatycznie konwertuje czasy UTC na lokalny
        const startTime = new Date(lesson.start_time)
        const endTime = new Date(lesson.end_time)
        
        // Formatowanie tytułu z ikonami i informacjami
        const instructorIcon = '👨‍🏫'
        const studentIcon = '👨‍🎓'
        const notesIcon = '📝'
        
        const instructorName = lesson.instructor ? 
          `${lesson.instructor.first_name} ${lesson.instructor.last_name}` : 'Brak instruktora'
        const studentName = lesson.student ? 
          `${lesson.student.first_name} ${lesson.student.last_name}` : 'Brak kursanta'
        const studentId = lesson.student ? lesson.student.student_id : 'Brak ID'
        
        // Skróć imiona i nazwiska dla lepszej czytelności w grafiku
        const shortInstructorName = lesson.instructor ? 
          `${lesson.instructor.first_name.charAt(0)}. ${lesson.instructor.last_name}` : 'Brak'
        const shortStudentName = lesson.student ? 
          `${lesson.student.first_name.charAt(0)}. ${lesson.student.last_name}` : 'Brak'
        
        // Formatuj tytuł w zależności od statusu
        let title = ''
        if (lesson.status === 'pending') {
          title = `${instructorIcon} ${shortInstructorName}\n${studentIcon} ${shortStudentName}`
        } else if (lesson.status === 'in_progress') {
          title = `🚗 ${shortInstructorName} + ${shortStudentName}`
        } else if (lesson.status === 'completed') {
          title = `✅ ${shortInstructorName} + ${shortStudentName}`
        } else {
          title = `${shortInstructorName} + ${shortStudentName}`
        }
        
        // Dodaj notatkę jeśli istnieje i jest krótka
        if (lesson.notes && lesson.notes.length <= 20) {
          title += `\n${notesIcon} ${lesson.notes}`
        } else if (lesson.notes && lesson.notes.length > 20) {
          title += `\n${notesIcon} ${lesson.notes.substring(0, 17)}...`
        }
        
        return {
          id: lesson.id,
          title: title,
          start: startTime,
          end: endTime,
          resourceId: lesson.instructor_id?.toString(),
          backgroundColor: getStatusColor(lesson.status),
          borderColor: getStatusColor(lesson.status),
          textColor: '#ffffff',
          classNames: ['calendar-event'],
          extendedProps: {
            student: lesson.student,
            instructor: lesson.instructor,
            status: lesson.status,
            notes: lesson.notes,
            fullInstructorName: instructorName,
            fullStudentName: studentName,
            studentId: studentId
          }
        }
      })

      setEvents(formattedEvents)
      
      // Odśwież kalendarz
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi()
        calendarApi.refetchEvents()
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'in_progress': return '#3b82f6'
      case 'completed': return '#10b981'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleDateSelect = (selectInfo) => {
    console.log('handleDateSelect wywołane!', selectInfo)
    
    // Oblicz czas trwania i przygotuj dane dla nowej jazdy
    const startTime = selectInfo.start
    const endTime = selectInfo.end
    const durationMinutes = Math.round((endTime - startTime) / 60000)
    
    // Debugowanie - pokaż w konsoli obliczony czas
    console.log('handleDateSelect - durationMinutes:', durationMinutes)
    console.log('startTime:', startTime)
    console.log('endTime:', endTime)
    console.log('Różnica w ms:', endTime - startTime)
    
    // Przygotuj datę i godzinę w nowym formacie
    const startDate = new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    const timeStr = new Date(startTime).toTimeString().slice(0, 5)
    
    // Walidacja - max 6 godzin (360 minut)
    if (durationMinutes > 360) {
      toast.error(`Maksymalny czas trwania jazdy to 6 godzin. Wybrano ${Math.round(durationMinutes / 60)} godzin.`)
      console.log('Blokowanie - czas trwania za długi')
      
      // Wyczyść zaznaczenie po błędzie
      selectInfo.view.calendar.unselect()
      return
    }
    
    console.log('Kontynuowanie - czas trwania OK')
    
    // Zapamiętaj zaznaczenie
    setLastSelection({ start: startTime, end: endTime })
    
    // Ustaw dane dla nowej jazdy w formularzu po prawej stronie
    setSelectedLesson({
      start_date: startDate,
      start_time: timeStr,
      duration_minutes: durationMinutes || 30,
      status: 'pending',
      notes: '',
      student_id: '',
      instructor_id: ''
    })
  }


  const handleEventClick = (clickInfo) => {
    // Znajdź pełne dane lekcji
    const lessonData = clickInfo.event.extendedProps
    setSelectedLesson({
      id: clickInfo.event.id,
      student_id: lessonData.student?.id || '',
      instructor_id: lessonData.instructor?.id || '',
      start_time: new Date(clickInfo.event.start.getTime() - clickInfo.event.start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      end_time: new Date(clickInfo.event.end.getTime() - clickInfo.event.end.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      duration_minutes: Math.round((clickInfo.event.end - clickInfo.event.start) / 60000),
      status: lessonData.status || 'pending',
      notes: lessonData.notes || '',
    })
  }

  const handleSaveLesson = async () => {
    setIsSaving(true)
    setSelectedLesson(null)
    setLastSelection(null)
    
    // Aktualizuj statusy w bazie danych natychmiast po zapisaniu
    await supabase.rpc('bulk_update_lesson_statuses')
    
    // Odśwież kalendarz
    await fetchSchedule()
    
    // Wymuś pełny rerender kalendarza przez zmianę key
    setCalendarKey(prev => prev + 1)
    
    // Odśwież tylko wydarzenia bez zmiany widoku
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.refetchEvents()
    }
    setIsSaving(false)
  }

  const handleDurationChange = (newDurationMinutes) => {
    // Jeśli nie ma zaznaczenia lub nie jest to nowa jazda (bez ID), nie aktualizuj selection
    if (!lastSelection || selectedLesson?.id) return
    
    const startTime = lastSelection.start
    const oldEndTime = lastSelection.end
    const newEndTime = new Date(startTime.getTime() + newDurationMinutes * 60000)
    
    if (!calendarRef.current) return
    
    const calendarApi = calendarRef.current.getApi()
    
    // Jeśli różnica jest mała (mniej niż 1 slot), zmień od razu bez animacji
    const timeDiff = Math.abs(newEndTime - oldEndTime)
    if (timeDiff < 30000) { // 30 sekund
      calendarApi.select(startTime, newEndTime)
      setLastSelection({ start: startTime, end: newEndTime })
      return
    }
    
    // Animacja interpolacji przez requestAnimationFrame
    const animationDuration = 150 // ms
    const startTimeAnim = performance.now()
    const startEndTime = oldEndTime.getTime()
    const endEndTime = newEndTime.getTime()
    
    const animateSelection = (currentTime) => {
      const elapsed = currentTime - startTimeAnim
      const progress = Math.min(elapsed / animationDuration, 1)
      
      // Ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      const currentEndTime = new Date(
        startEndTime + (endEndTime - startEndTime) * easeProgress
      )
      
      calendarApi.select(startTime, currentEndTime)
      
      if (progress < 1) {
        requestAnimationFrame(animateSelection)
      } else {
        setLastSelection({ start: startTime, end: newEndTime })
      }
    }
    
    requestAnimationFrame(animateSelection)
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'org_admin' || user?.role === 'super_admin'

  // Zoom functionality - zmiana slotDuration (rozmiar elementów)
  useEffect(() => {
    // Odczytaj zoom z localStorage dla danego użytkownika
    const savedZoom = localStorage.getItem(`calendar_zoom_${user?.id}`)
    if (savedZoom) {
      setZoomLevel(parseInt(savedZoom))
    } else if (!isAdmin) {
      // Dla instruktorów ustaw domyślny zoom (mniejsze elementy, więcej godzin)
      setZoomLevel(2)
    }
  }, [user?.id, isAdmin])

  useEffect(() => {
    // Zapisz zoom do localStorage przy zmianie
    if (user?.id) {
      localStorage.setItem(`calendar_zoom_${user.id}`, zoomLevel.toString())
    }
    
    // Zaktualizuj slotDuration w kalendarzu bez zmiany widoku
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.setOption('slotDuration', getSlotDuration())
    }
  }, [zoomLevel, user?.id])

  // Check localStorage for checklist reminder and open modal
  useEffect(() => {
    const openChecklistForLesson = localStorage.getItem('openChecklistForLesson')
    if (openChecklistForLesson) {
      // Remove from localStorage to prevent reopening
      localStorage.removeItem('openChecklistForLesson')
      
      // Fetch lesson data
      const fetchLessonAndOpenChecklist = async () => {
        try {
          const { data: lesson } = await supabase
            .from('driving_lessons')
            .select('*')
            .eq('id', openChecklistForLesson)
            .single()
          
          if (lesson) {
            setSelectedLessonForChecklist(lesson)
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
        } catch (error) {
          console.error('Error fetching lesson for checklist:', error)
        }
      }
      
      fetchLessonAndOpenChecklist()
    }
  }, [supabase])

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 0))
  }

  const getSlotDuration = () => {
    const durations = ['02:00:00', '01:30:00', '01:00:00', '00:30:00']
    return durations[zoomLevel] || '00:30:00'
  }

  const getZoomLabel = () => {
    const labels = ['2h', '1.5h', '1h', '30m']
    return labels[zoomLevel] || '30m'
  }

  const openChecklistModal = (lesson) => {
    setSelectedLessonForChecklist(lesson)
    // Load existing checklist if exists
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
    setIsSaving(true)
    try {
      // Calculate score from checklist sliders
      const scoreKeys = ['vehicle_preparation', 'controls_familiarity', 'steering_control', 
                        'acceleration_braking', 'gear_shifting', 'mirror_use', 
                        'blind_spot_check', 'lane_positioning', 'turning', 'parking', 
                        'traffic_rules', 'road_signs', 'emergency_procedures']
      
      let totalScore = 0
      scoreKeys.forEach(key => {
        if (typeof checklistData[key] === 'number') {
          totalScore += checklistData[key]
        }
      })
      
      // Normalize to 100 points (13 sliders * 10 points = 130 max, normalize to 100)
      const normalizedScore = Math.round((totalScore / 130) * 100)

      const { error } = await supabase
        .from('driving_lessons')
        .update({
          checklist: checklistData,
          score: normalizedScore
        })
        .eq('id', selectedLessonForChecklist.id)

      if (error) throw error

      toast.success('Checklist zapisany pomyślnie')
      setShowChecklistModal(false)
      fetchSchedule()
    } catch (error) {
      console.error('Error saving checklist:', error)
      toast.error('Błąd podczas zapisywania checklisty')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200 overflow-hidden">
      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen overflow-hidden">
        <div className="flex gap-6 h-[calc(100vh-122px)]">
          {/* Left Column - Calendar */}
          <div className="w-4/5 flex flex-col">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-900">Grafik jazd</h2>
                <p className="mt-1 text-gray-600 dark:text-dark-600">
                  {isAdmin ? 'Pełny podgląd wszystkich grafików' : 'Twój osobisty grafik'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors duration-200"
                  title="Oddal"
                >
                  <Minus className="w-5 h-5 text-gray-600 dark:text-dark-600" />
                </button>
                <span className="text-sm font-medium text-gray-600 dark:text-dark-600 min-w-[80px] text-center">
                  {getZoomLabel()}
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors duration-200"
                  title="Przybliż"
                >
                  <Plus className="w-5 h-5 text-gray-600 dark:text-dark-600" />
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="mb-4 bg-white dark:bg-dark-100 rounded-lg shadow-sm p-3 border border-gray-200 dark:border-dark-200 transition-colors duration-200">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-dark-600">Oczekująca</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-dark-600">W trakcie</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-dark-600">Zakończona</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-dark-600">Odwołana</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1 bg-white dark:bg-dark-100 rounded-lg shadow border border-gray-200 dark:border-dark-200 transition-colors duration-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <FullCalendar
                  key={calendarKey}
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, resourceTimelinePlugin, interactionPlugin]}
                  initialView={currentView || (isAdmin ? 'resourceTimelineDay' : 'timeGridWeek')}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: isAdmin ? 'resourceTimelineDay,timeGridWeek,dayGridMonth' : 'timeGridWeek,dayGridMonth'
                  }}
                  locale={plLocale}
                  events={events}
                  resources={resources}
                  resourceAreaHeaderContent='Instruktorzy'
                  resourceAreaWidth='200px'
                  slotDuration={getSlotDuration()}
                  slotMinTime='06:00:00'
                  slotMaxTime='21:00:00'
                  height='100%'
                  slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                  selectable={true}
                  selectMirror={true}
                  unselectAuto={false}
                  dayMaxEvents={true}
                  weekends={true}
                  editable={true}
                  droppable={true}
                  timeZone={'local'}
                  select={handleDateSelect}
                  viewDidMount={(info) => {
                    setCurrentView(info.view.type)
                  }}
                  unselect={() => {
                    // Nie przywracaj zaznaczenia jeśli jest zapisywane
                    if (isSaving) {
                      return false
                    }
                    // Przywróć zaznaczenie jeśli istnieje
                    if (lastSelection && calendarRef.current) {
                      const calendarApi = calendarRef.current.getApi()
                      calendarApi.select(lastSelection.start, lastSelection.end)
                      return false
                    }
                  }}
                  eventClick={handleEventClick}
                  eventContent={(eventInfo) => {
                    const { event } = eventInfo
                    const studentId = event.extendedProps.studentId || 'Brak ID'
                    return (
                      <div className="relative w-full h-full">
                        <div className="fc-event-time">{eventInfo.timeText}</div>
                        <div className="fc-event-title">{eventInfo.event.title}</div>
                        <div className="student-id-badge">ID: {studentId}</div>
                      </div>
                    )
                  }}
                  allDaySlot={false}
                />
              )}
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lesson-form-column w-1/5 h-full flex flex-col">
            <div className="bg-white dark:bg-dark-100 rounded-lg shadow border border-gray-200 dark:border-dark-200 transition-colors duration-200 p-4 h-full flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-900 mb-6">
                {selectedLesson ? 'Edytuj jazdę' : 'Nowa jazda'}
              </h3>
              <LessonForm
                ref={lessonFormRef}
                lesson={selectedLesson}
                onSave={handleSaveLesson}
                onDurationChange={handleDurationChange}
                onCancel={() => {
                  setSelectedLesson(null)
                  setLastSelection(null)
                  if (calendarRef.current) {
                    const calendarApi = calendarRef.current.getApi()
                    calendarApi.unselect()
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Checklist Modal */}
      {showChecklistModal && selectedLessonForChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
                Checklist - {new Date(selectedLessonForChecklist.start_time).toLocaleString('pl-PL')}
              </h3>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Vehicle Preparation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Przygotowanie pojazdu
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.vehicle_preparation}
                      onChange={(e) => setChecklistData({ ...checklistData, vehicle_preparation: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.vehicle_preparation}/10</span>
                  </div>
                </div>

                {/* Controls Familiarity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Znajomość sterowania
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.controls_familiarity}
                      onChange={(e) => setChecklistData({ ...checklistData, controls_familiarity: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.controls_familiarity}/10</span>
                  </div>
                </div>

                {/* Steering Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Sterowanie kierownicą
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.steering_control}
                      onChange={(e) => setChecklistData({ ...checklistData, steering_control: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.steering_control}/10</span>
                  </div>
                </div>

                {/* Acceleration & Braking */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Przyspieszanie i hamowanie
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.acceleration_braking}
                      onChange={(e) => setChecklistData({ ...checklistData, acceleration_braking: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.acceleration_braking}/10</span>
                  </div>
                </div>

                {/* Gear Shifting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Zmiana biegów
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.gear_shifting}
                      onChange={(e) => setChecklistData({ ...checklistData, gear_shifting: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.gear_shifting}/10</span>
                  </div>
                </div>

                {/* Mirror Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Korzystanie z luster
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.mirror_use}
                      onChange={(e) => setChecklistData({ ...checklistData, mirror_use: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.mirror_use}/10</span>
                  </div>
                </div>

                {/* Blind Spot Check */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Sprawdzanie martwego pola
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.blind_spot_check}
                      onChange={(e) => setChecklistData({ ...checklistData, blind_spot_check: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.blind_spot_check}/10</span>
                  </div>
                </div>

                {/* Lane Positioning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Pozycja na pasie
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.lane_positioning}
                      onChange={(e) => setChecklistData({ ...checklistData, lane_positioning: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.lane_positioning}/10</span>
                  </div>
                </div>

                {/* Turning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Skręcanie
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.turning}
                      onChange={(e) => setChecklistData({ ...checklistData, turning: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.turning}/10</span>
                  </div>
                </div>

                {/* Parking */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Parkowanie
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.parking}
                      onChange={(e) => setChecklistData({ ...checklistData, parking: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.parking}/10</span>
                  </div>
                </div>

                {/* Traffic Rules */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Zasady ruchu
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.traffic_rules}
                      onChange={(e) => setChecklistData({ ...checklistData, traffic_rules: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.traffic_rules}/10</span>
                  </div>
                </div>

                {/* Road Signs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Znaki drogowe
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.road_signs}
                      onChange={(e) => setChecklistData({ ...checklistData, road_signs: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.road_signs}/10</span>
                  </div>
                </div>

                {/* Emergency Procedures */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Postępowanie w sytuacjach awaryjnych
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData.emergency_procedures}
                      onChange={(e) => setChecklistData({ ...checklistData, emergency_procedures: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-300"
                    />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400 w-12 text-right">{checklistData.emergency_procedures}/10</span>
                  </div>
                </div>

                {/* Instructor Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                    Notatki instruktora
                  </label>
                  <textarea
                    value={checklistData.instructor_notes}
                    onChange={(e) => setChecklistData({ ...checklistData, instructor_notes: e.target.value })}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                    placeholder="Wpisz notatki..."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-dark-200">
              <button
                onClick={() => setShowChecklistModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveChecklist}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Zapisywanie...' : 'Zapisz checklistę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedule
