import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, Clock, User, Car } from 'lucide-react'
import { useSupabase } from '../contexts/SupabaseContext'
import { supabase } from '../contexts/SupabaseContext'
import toast from 'react-hot-toast'

const LessonModal = ({ isOpen, onClose, lesson, onSave }) => {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [instructors, setInstructors] = useState([])
  
  const [formData, setFormData] = useState({
    student_id: '',
    instructor_id: '',
    start_time: '',
    duration_minutes: 30,
    status: 'pending',
    notes: ''
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Funkcja do walidacji czasu
  const validateTimeConstraints = (startTime, duration) => {
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60000)
    
    // Sprawdź czy godzina rozpoczęcia jest między 6:00 a 21:00
    const startHour = start.getHours()
    const startMinutes = start.getMinutes()
    
    if (startHour < 6 || startHour >= 21) {
      return false
    }
    
    // Sprawdź czy godzina rozpoczęcia to pełna godzina lub pół godziny
    if (startMinutes !== 0 && startMinutes !== 30) {
      return false
    }
    
    // Sprawdź czy jazda kończy się przed 21:00
    const endHour = end.getHours()
    const endMinutes = end.getMinutes()
    
    if (endHour > 21 || (endHour === 21 && endMinutes > 0)) {
      return false
    }
    
    // Specjalna reguła: jeśli jazda zaczyna się o 20:30, może trwać tylko 30 minut
    if (startHour === 20 && startMinutes === 30 && duration > 30) {
      return false
    }
    
    return true
  }

  // Funkcja do generowania dostępnych opcji czasu
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 6; hour <= 20; hour++) {
      // Dodaj pełną godzinę
      options.push(`${hour.toString().padStart(2, '0')}:00`)
      // Dodaj pół godziny (ale nie po 20:30)
      if (hour < 20 || (hour === 20 && hour === 20)) {
        options.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return options
  }

  // Funkcja do generowania opcji czasu trwania
  const getDurationOptions = (startTime) => {
    if (!startTime) return [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
    
    const startHour = new Date(startTime).getHours()
    const startMinute = new Date(startTime).getMinutes()
    
    // Jeśli jazda zaczyna się o 20:30, może trwać tylko 30 minut
    if (startHour === 20 && startMinute === 30) {
      return [30]
    }
    
    // Oblicz maksymalny czas trwania do 21:00 (max 6 godzin = 360 minut)
    const startDateTime = new Date(startTime)
    const endOfDay = new Date(startDateTime)
    endOfDay.setHours(21, 0, 0, 0)
    
    const maxDuration = Math.min(Math.floor((endOfDay - startDateTime) / (1000 * 60)), 360)
    
    // Generuj opcje co 30 minut do maksymalnego czasu
    const options = []
    for (let duration = 30; duration <= maxDuration; duration += 30) {
      options.push(duration)
    }
    
    return options.length > 0 ? options : [30, 60, 90, 120]
  }

  // Funkcja do formatowania opcji czasu trwania z godzinami
  const formatDurationOption = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours === 0) {
      return `${minutes} minut (0.5h)`
    } else if (remainingMinutes === 0) {
      return `${minutes} minut (${hours}h)`
    } else {
      return `${minutes} minut (${hours}.5h)`
    }
  }

  // Custom Select Component
  const CustomSelect = ({ name, value, onChange, options, placeholder, required, icon }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const dropdownRef = useRef(null)

    // Find selected option
    useEffect(() => {
      const option = options.find(opt => opt.value === value)
      setSelectedOption(option)
    }, [value, options])

    
    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle wheel events for dropdown scrolling
    useEffect(() => {
      if (dropdownOpen && dropdownRef.current) {
        const dropdownElement = dropdownRef.current.querySelector('.custom-scrollbar')
        
        if (dropdownElement) {
          const handleWheel = (e) => {
            e.preventDefault()
            e.stopPropagation()
            
            // Calculate scroll amount
            const scrollAmount = e.deltaY
            dropdownElement.scrollTop += scrollAmount
          }
          
          // Add wheel event listener to dropdown
          dropdownElement.addEventListener('wheel', handleWheel, { passive: false })
          
          return () => {
            dropdownElement.removeEventListener('wheel', handleWheel)
          }
        }
      }
    }, [dropdownOpen])

    const handleSelect = (option) => {
      onChange({ target: { name, value: option.value } })
      setDropdownOpen(false)
    }

    const isPlaceholder = !value || value === ""
    const displayValue = isPlaceholder ? placeholder : (options.find(opt => opt.value === value)?.label || value)

    return (
      <div className="relative" ref={dropdownRef}>
        {/* Hidden actual select for form submission */}
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="absolute opacity-0 pointer-events-none"
          style={{ width: 0, height: 0 }}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom visual select */}
        <div
          className={`fancy-select-input w-full px-4 py-3 border-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer transition-all duration-300 text-sm font-medium flex items-center justify-between ${
            dropdownOpen 
              ? 'rounded-t-2xl border-b-2 border-b-transparent border-gray-200 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900'
              : `rounded-2xl ${isPlaceholder 
                ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 text-yellow-800 dark:text-yellow-200 hover:border-yellow-500' 
                : 'border-gray-200 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 hover:border-primary-400 hover:bg-white dark:hover:bg-dark-50'
              }`
          }`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className={isPlaceholder ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-dark-900'}>
            {displayValue}
          </span>
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''} ${
              isPlaceholder ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Custom dropdown */}
        {dropdownOpen && (
          <div className="absolute z-50 w-full top-full bg-white dark:bg-dark-50 border-2 border-gray-200 dark:border-dark-300 shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar animate-dropdown">
            <div className="p-2">
              {options.map((option, index) => (
                <div
                  key={option.value}
                  className={`px-4 py-3 cursor-pointer transition-all duration-300 rounded-2xl border-2 relative overflow-hidden ${
                    selectedOption?.value === option.value
                      ? 'text-white border-emerald-500 shadow-lg shadow-emerald-500/25'
                      : 'text-gray-900 dark:text-dark-900 border-gray-200 dark:border-dark-300 hover:border-indigo-400'
                  } mb-1 last:mb-0 animate-dropdown-option group`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleSelect(option)}
                >
                  {/* Background effects */}
                  <div className={`absolute inset-0 transition-all duration-500 ${
                    selectedOption?.value === option.value
                      ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 opacity-90'
                      : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 opacity-0 group-hover:opacity-100'
                  }`} />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                  
                  {/* Content */}
                  <span className="relative z-10 font-medium">
                    {option.label}
                  </span>
                  
                  {/* Selected indicator */}
                  {selectedOption?.value === option.value && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleSelect = (option) => {
    onChange({ target: { name, value: option.value } })
    setDropdownOpen(false)
  }

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('last_name')
      
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchInstructors = async () => {
    try {
      const { data } = await supabase
        .from('instructors')
        .select('*')
        .eq('status', 'active')
        .order('last_name')
      
      setInstructors(data || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStudents()
      fetchInstructors()
      
      // Zablokuj scroll całej strony i ukryj scrollbar
      document.body.style.overflow = 'hidden'
      document.body.style.scrollbarWidth = 'none' // Firefox
      document.documentElement.style.scrollbarWidth = 'none' // Firefox
      
      // Ukryj scrollbar dla Chrome, Safari, Edge
      const style = document.createElement('style')
      style.id = 'hide-scrollbar'
      style.textContent = `
        body::-webkit-scrollbar { display: none !important; }
        html::-webkit-scrollbar { display: none !important; }
        *::-webkit-scrollbar { display: none !important; }
      `
      document.head.appendChild(style)
      
      // Zablokuj wheel events
      const preventWheel = (e) => e.preventDefault()
      document.addEventListener('wheel', preventWheel, { passive: false })
      
      if (lesson && lesson.id) {
        // Edycja - wypełnij formularz danymi istniejącej jazdy
        setFormData({
          student_id: lesson.student_id || '',
          instructor_id: lesson.instructor_id || '',
          start_time: lesson.start_time || '',
          duration_minutes: lesson.duration_minutes || 30,
          status: lesson.status || 'pending',
          notes: lesson.notes || ''
        })
      } else if (lesson && !lesson.id) {
        // Dodawanie z grafiku - wypełnij danymi z zaznaczenia
        setFormData({
          student_id: lesson.student_id || '',
          instructor_id: lesson.instructor_id || '',
          start_time: lesson.start_time || '',
          duration_minutes: lesson.duration_minutes || 30,
          status: lesson.status || 'pending',
          notes: lesson.notes || ''
        })
      } else {
        // Dodawanie z przycisku - wyczyść formularz
        setFormData({
          student_id: '',
          instructor_id: '',
          start_time: '',
          duration_minutes: 30,
          status: 'pending',
          notes: ''
        })
      }
      
      return () => {
        // Przywróć scroll i scrollbar po zamknięciu modalu
        document.body.style.overflow = ''
        document.body.style.scrollbarWidth = ''
        document.documentElement.style.scrollbarWidth = ''
        
        // Usuń style ukrywające scrollbar
        const styleElement = document.getElementById('hide-scrollbar')
        if (styleElement) {
          styleElement.remove()
        }
        
        document.removeEventListener('wheel', preventWheel)
      }
    }
  }, [isOpen, lesson])

  // Funkcja do sprawdzania kolizji czasowych
  const checkTimeCollision = async (studentId, instructorId, startTime, endTime, excludeLessonId = null) => {
    try {
      // Pobierz wszystkie jazdy dla danego kursanta i instruktora
      let studentQuery = supabase
        .from('driving_lessons')
        .select('*')
        .eq('student_id', studentId)
        .neq('status', 'cancelled')

      let instructorQuery = supabase
        .from('driving_lessons')
        .select('*')
        .eq('instructor_id', instructorId)
        .neq('status', 'cancelled')

      // Dodaj wykluczenie ID tylko jeśli istnieje
      if (excludeLessonId) {
        studentQuery = studentQuery.neq('id', excludeLessonId)
        instructorQuery = instructorQuery.neq('id', excludeLessonId)
      }

      const { data: studentLessons, error: studentError } = await studentQuery
      const { data: instructorLessons, error: instructorError } = await instructorQuery

      if (studentError || instructorError) {
        console.error('Błąd sprawdzania kolizji:', studentError || instructorError)
        return { hasCollision: false, errors: [] }
      }

      const errors = []
      const newStart = new Date(startTime)
      const newEnd = new Date(endTime)

      // Sprawdź kolizje dla kursanta
      studentLessons?.forEach(existingLesson => {
        const existingStart = new Date(existingLesson.start_time)
        const existingEnd = new Date(existingLesson.end_time)

        // Sprawdź czy przedziały się nakładają
        if ((newStart < existingEnd && newEnd > existingStart)) {
          errors.push(`Kursant ma już zaplanowaną jazdę w tym czasie (${existingStart.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})} - ${existingEnd.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})})`)
        }
      })

      // Sprawdź kolizje dla instruktora
      instructorLessons?.forEach(existingLesson => {
        const existingStart = new Date(existingLesson.start_time)
        const existingEnd = new Date(existingLesson.end_time)

        // Sprawdź czy przedziały się nakładają
        if ((newStart < existingEnd && newEnd > existingStart)) {
          errors.push(`Instruktor ma już zaplanowaną jazdę w tym czasie (${existingStart.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})} - ${existingEnd.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})})`)
        }
      })

      return {
        hasCollision: errors.length > 0,
        errors: errors
      }
    } catch (error) {
      console.error('Błąd sprawdzania kolizji:', error)
      return { hasCollision: false, errors: [] }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      // Oblicz end_time na podstawie start_time i duration_minutes
      const startTime = new Date(formData.start_time)
      const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60000)
      
      // Korekta timezone - zapisz czas jako UTC z offsetem lokalnej strefy czasowej
      const timezoneOffset = startTime.getTimezoneOffset() * 60000 // offset w milisekundach
      const correctedStartTime = new Date(startTime.getTime() - timezoneOffset)
      const correctedEndTime = new Date(endTime.getTime() - timezoneOffset)
      
      // Sprawdź kolizje czasowe
      if (formData.student_id && formData.instructor_id) {
        const collision = await checkTimeCollision(
          formData.student_id,
          formData.instructor_id,
          correctedStartTime,
          correctedEndTime,
          lesson?.id // exclude current lesson when editing
        )

        if (collision.hasCollision) {
          collision.errors.forEach(error => {
            toast.error(error)
          })
          return
        }
      }
      
      const lessonData = {
        ...formData,
        start_time: correctedStartTime.toISOString(),
        end_time: correctedEndTime.toISOString()
      }

      if (lesson && lesson.id) {
        // Edycja
        const { error } = await supabase
          .from('driving_lessons')
          .update(lessonData)
          .eq('id', lesson.id)

        if (error) throw error
        toast.success('Jazda zaktualizowana pomyślnie!')
      } else {
        // Dodawanie
        const { error } = await supabase
          .from('driving_lessons')
          .insert(lessonData)

        if (error) throw error
        toast.success('Jazda dodana pomyślnie!')
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Błąd podczas zapisywania jazdy')
    }
  }

  const handleDelete = async () => {
    if (!lesson || !lesson.id) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('driving_lessons')
        .delete()
        .eq('id', lesson.id)

      if (error) throw error
      toast.success('Jazda usunięta pomyślnie!')
      setShowDeleteConfirm(false)
      onSave()
      onClose()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Błąd podczas usuwania jazdy')
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

const handleChange = (e) => {
  const { name, value } = e.target
  setFormData(prev => ({
    ...prev,
    [name]: value
  }))
}

  const handleTimeChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Jeśli zmieniamy czas, zresetuj duration do domyślnej wartości
    if (name === 'start_time') {
      const durationOptions = getDurationOptions(value)
      setFormData(prev => {
        if (!durationOptions.includes(prev.duration_minutes)) {
          return {
            ...prev,
            [name]: value,
            duration_minutes: durationOptions[0]
          }
        }
        return {
          ...prev,
          [name]: value
        }
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-dark-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
            {lesson ? 'Edytuj jazdę' : 'Dodaj nową jazdę'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Kursant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Kursant
            </label>
            <CustomSelect
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              options={[
                { value: "", label: "Wybierz kursanta" },
                ...students.map(student => ({
                  value: student.id,
                  label: `${student.first_name} ${student.last_name}`
                }))
              ]}
              placeholder="Wybierz kursanta"
              required
            />
          </div>

          {/* Instruktor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              <Car className="inline h-4 w-4 mr-1" />
              Instruktor
            </label>
            <CustomSelect
              name="instructor_id"
              value={formData.instructor_id}
              onChange={handleChange}
              options={[
                { value: "", label: "Wybierz instruktora" },
                ...instructors.map(instructor => ({
                  value: instructor.id,
                  label: `${instructor.first_name} ${instructor.last_name}`
                }))
              ]}
              placeholder="Wybierz instruktora"
              required
            />
          </div>

          {/* Data i czas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              Data i czas
            </label>
            <div className="space-y-2">
              <div className="relative fancy-select">
                <input
                  type="date"
                  name="date"
                  value={formData.start_time ? new Date(formData.start_time).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const newDateTime = e.target.value ? 
                      `${e.target.value}T${formData.start_time ? formData.start_time.split('T')[1] : '09:00'}` : ''
                    handleTimeChange({ target: { name: 'start_time', value: newDateTime } })
                  }}
                  required
                  className="fancy-select-input w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-50 dark:text-dark-900 appearance-none cursor-pointer transition-all duration-300 hover:border-primary-400 hover:bg-gradient-to-r hover:from-white hover:to-gray-50 dark:hover:from-dark-50 dark:hover:to-dark-100 text-sm font-medium"
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <CustomSelect
                name="time"
                value={formData.start_time ? formData.start_time.split('T')[1].substring(0, 5) : ''}
                onChange={(e) => {
                  const newDateTime = formData.start_time ? 
                    `${formData.start_time.split('T')[0]}T${e.target.value}:00` : 
                    `${new Date().toISOString().split('T')[0]}T${e.target.value}:00`
                  handleTimeChange({ target: { name: 'start_time', value: newDateTime } })
                }}
                options={[
                  { value: "", label: "Wybierz godzinę" },
                  ...generateTimeOptions().map(time => ({
                    value: time,
                    label: time
                  }))
                ]}
                placeholder="Wybierz godzinę"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
              Jazdy mogą zaczynać się od 6:00 do 21:00, tylko pełne godziny lub pół godziny
            </p>
          </div>

          {/* Czas trwania */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Czas trwania (minuty)
            </label>
            <CustomSelect
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              options={getDurationOptions(formData.start_time).map(duration => ({
                value: duration,
                label: formatDurationOption(duration)
              }))}
              placeholder="Wybierz czas trwania"
              required
            />
            {formData.start_time && new Date(formData.start_time).getHours() === 20 && new Date(formData.start_time).getMinutes() === 30 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Jazdy po 20:30 mogą trwać tylko 30 minut
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              Status
            </label>
            <CustomSelect
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: "pending", label: "Oczekująca" },
                { value: "in_progress", label: "W trakcie" },
                { value: "completed", label: "Zakończona" },
                { value: "cancelled", label: "Odwołana" }
              ]}
              placeholder="Wybierz status"
              required
            />
          </div>

          {/* Notatki */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              Notatki
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-50 dark:text-dark-900 transition-all duration-300 hover:border-primary-300 hover:shadow-lg transform hover:scale-[1.01] resize-none"
              placeholder="Dodatkowe informacje o jeździe..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-4">
            {lesson && lesson.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-3 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.02] font-medium"
              >
                Usuń jazdę
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 dark:text-dark-700 bg-gray-100 dark:bg-dark-200 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-300 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.02] font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium"
              >
                {loading ? 'Zapisywanie...' : (lesson ? 'Zaktualizuj' : 'Dodaj')}
              </button>
            </div>
          </div>
        </form>
      </div>
    
    {/* Custom Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white dark:bg-dark-100 rounded-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-slide-up shadow-2xl border border-gray-200 dark:border-dark-200">
          <div className="text-center">
            {/* Warning Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-2">
              Usunąć jazdę?
            </h3>
            
            {/* Message */}
            <p className="text-gray-600 dark:text-dark-600 mb-8 leading-relaxed">
              Czy na pewno chcesz usunąć tę jazdę? <br />
              <span className="font-medium text-red-600 dark:text-red-400">Tej operacji nie można cofnąć.</span>
            </p>
            
            {/* Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={cancelDelete}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-dark-700 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-300 transition-all duration-300 font-medium transform hover:scale-[1.02] hover:shadow-lg"
              >
                Anuluj
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 font-medium transform hover:scale-[1.02] hover:shadow-lg"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}

export default LessonModal
