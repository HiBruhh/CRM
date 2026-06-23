import React, { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Calendar, Clock, User, Car, Trash2, X } from 'lucide-react'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const LessonForm = forwardRef(({ lesson, onSave, onCancel, onDurationChange }, ref) => {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [instructors, setInstructors] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  
  // Eksponuj metodę handleDelete dla komponentu rodzica (Schedule)
  useImperativeHandle(ref, () => ({
    handleDelete
  }))
  
  // Instruktorzy mają większe elementy formularza
  const isInstructor = user?.role === 'instructor'
  const formSpacing = isInstructor ? 'space-y-4' : 'space-y-3'
  const labelMargin = isInstructor ? 'mb-1.5' : 'mb-1'
  const inputPadding = isInstructor ? 'py-2' : 'py-2'
  const inputPaddingX = isInstructor ? 'px-3' : 'px-3'
  const textareaRows = isInstructor ? 2 : 2
  const buttonPadding = isInstructor ? 'py-1.5' : 'py-1.5'
  const buttonPaddingX = isInstructor ? 'px-3' : 'px-3'
  const buttonContainerPadding = isInstructor ? 'pt-1' : 'pt-1'
  
  const [formData, setFormData] = useState({
    student_id: '',
    instructor_id: '',
    start_date: '',
    start_time: '',
    duration_minutes: 30,
    status: 'pending',
    notes: ''
  })

  const calculateEndTime = () => {
    if (!formData.start_date || !formData.start_time || !formData.duration_minutes) {
      return ''
    }
    
    try {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
      if (isNaN(startDateTime.getTime())) {
        return ''
      }
      
      const endDateTime = new Date(startDateTime.getTime() + formData.duration_minutes * 60000)
      
      const hours = endDateTime.getHours().toString().padStart(2, '0')
      const minutes = endDateTime.getMinutes().toString().padStart(2, '0')
      
      return `${hours}:${minutes}`
    } catch (error) {
      return ''
    }
  }

  const [endTime, setEndTime] = useState(calculateEndTime())

  useEffect(() => {
    setEndTime(calculateEndTime())
  }, [formData.start_date, formData.start_time, formData.duration_minutes])

  const validateTimeConstraints = (startTime, duration) => {
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60000)
    
    const startHour = start.getHours()
    const startMinutes = start.getMinutes()
    
    if (startHour < 6 || startHour >= 21) return false
    if (startMinutes !== 0 && startMinutes !== 30) return false
    
    const endHour = end.getHours()
    const endMinutes = end.getMinutes()
    
    if (endHour > 21 || (endHour === 21 && endMinutes > 0)) return false
    if (startHour === 20 && startMinutes === 30 && duration > 30) return false
    
    return true
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 6; hour <= 20; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`)
      options.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    return options
  }

  const getDurationOptions = (startTime) => {
    if (!startTime) return [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
    
    const [hours, minutes] = startTime.split(':').map(Number)
    
    // Jeśli godzina to 20:00 lub 20:30, max 1h
    if (hours >= 20) {
      return hours === 20 && minutes === 0 ? [30, 60] : [30]
    }
    
    // Oblicz max duration do 21:00
    const startMinutes = hours * 60 + minutes
    const endOfDayMinutes = 21 * 60
    let maxDuration = Math.min(endOfDayMinutes - startMinutes, 360)
    
    // Jeśli kursant ma wyjechane <=10h, ogranicz do 2h (120 min)
    if (formData.student_id) {
      const selectedStudent = students.find(s => s.id === formData.student_id)
      if (selectedStudent && (selectedStudent.completed_hours || 0) <= 10) {
        maxDuration = Math.min(maxDuration, 120)
      }
    }
    
    const options = []
    for (let duration = 30; duration <= maxDuration; duration += 30) {
      options.push(duration)
    }
    
    return options.length > 0 ? options : [30, 60, 90, 120]
  }

  const formatDurationOption = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours === 0) return `${minutes} min (0.5h)`
    else if (remainingMinutes === 0) return `${minutes} min (${hours}h)`
    else return `${minutes} min (${hours}.5h)`
  }

  const CustomSelect = ({ name, value, onChange, options, placeholder, required, searchable = false, hasError = false }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const dropdownRef = useRef(null)

    useEffect(() => {
      const option = options.find(opt => opt.value === value)
      if (option?.value !== selectedOption?.value) {
        setSelectedOption(option)
      }
      setSearchTerm('')
      setDropdownOpen(false)
    }, [value, options])
    
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false)
          setSearchTerm('')
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
      const handleFormSubmit = () => {
        setDropdownOpen(false)
        setSearchTerm('')
      }
      const form = dropdownRef.current?.closest('form')
      if (form) {
        form.addEventListener('submit', handleFormSubmit)
        return () => form.removeEventListener('submit', handleFormSubmit)
      }
    }, [])

    const handleSelect = (option) => {
      onChange({ target: { name, value: option.value } })
      setDropdownOpen(false)
      setSearchTerm('')
    }

    const isPlaceholder = !value || value === ""
    
    const filteredOptions = searchable && searchTerm
      ? options.filter(option => 
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options

    const displayValue = useMemo(() => {
      return isPlaceholder ? placeholder : (selectedOption?.label || value)
    }, [isPlaceholder, placeholder, selectedOption, value])

    return (
      <div className="relative" ref={dropdownRef}>
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="absolute opacity-0 pointer-events-none"
          style={{ width: 0, height: 0, opacity: 0 }}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <div
          className={`w-full ${inputPaddingX} ${inputPadding} border-2 cursor-pointer text-sm font-medium flex items-center justify-between rounded-lg ${
            dropdownOpen 
              ? 'border-primary-500 ring-2 ring-primary-500 bg-white dark:bg-dark-50'
              : hasError
                ? 'border-red-500 bg-white dark:bg-dark-50'
                : `border-gray-200 dark:border-dark-300 dark:bg-dark-50 hover:border-primary-300`
          }`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className={isPlaceholder ? 'text-gray-400' : 'text-gray-900 dark:text-dark-900'}>
            {displayValue}
          </span>
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} text-gray-400`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {dropdownOpen && (
          <div className="absolute z-[100] w-full top-full bg-white dark:bg-dark-50 border-2 border-gray-200 dark:border-dark-300 shadow-lg rounded-lg overflow-hidden max-h-48 overflow-y-auto mt-1">
            {searchable && (
              <div className={`${isInstructor ? 'py-2' : 'py-1.5'} ${isInstructor ? 'px-4' : 'px-3'} border-b border-gray-200 dark:border-dark-300`}>
                <input
                  type="text"
                  placeholder="Szukaj..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full ${isInstructor ? 'px-4' : 'px-3'} ${isInstructor ? 'py-2' : 'py-1.5'} border border-gray-300 dark:border-dark-300 rounded-lg text-sm dark:bg-dark-100 dark:text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
            )}
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`px-4 py-3 cursor-pointer ${
                  selectedOption?.value === option.value
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-900 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200'
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-3 text-gray-500 dark:text-dark-500 text-sm">
                Brak wyników
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('status', 'active')

      // Szef organizacji widzi tylko kursantów ze swojej organizacji
      if (user?.role === 'org_admin' && user?.organizationId) {
        query = query.eq('organization_id', user.organizationId)
      }

      // Jeśli użytkownik to instruktor, filtruj tylko jego kursantów
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

      const { data } = await query.order('last_name')
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('*')
        .eq('status', 'active')
        .order('last_name')

      // Szef organizacji widzi tylko instruktorów ze swojej organizacji
      if (user?.role === 'org_admin' && user?.organizationId) {
        query = query.eq('organization_id', user.organizationId)
      }

      // Instruktor widzi tylko siebie
      if (user?.role === 'instructor') {
        query = query.eq('auth_id', user.id)
      }

      const { data } = await query
      setInstructors(data || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }

  const studentOptions = useMemo(() => [
    { value: "", label: "Wybierz kursanta" },
    ...students.map(student => ({
      value: student.id,
      label: `${student.first_name} ${student.last_name} (${student.student_id})`
    }))
  ], [students])

  const instructorOptions = useMemo(() => [
    { value: "", label: "Wybierz instruktora" },
    ...instructors.map(instructor => ({
      value: instructor.id,
      label: `${instructor.first_name} ${instructor.last_name} (${instructor.instructor_number || instructor.id.slice(0, 8)})`
    }))
  ], [instructors])

  useEffect(() => {
    fetchStudents()
    fetchInstructors()
    
    const setupFormData = async () => {
      let instructorId = ''
      
      // Jeśli użytkownik to instruktor, ustaw jego ID jako default
      if (user?.role === 'instructor') {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('id')
          .eq('auth_id', user.id)
          .single()
        
        if (instructorData) {
          instructorId = instructorData.id
        }
      }
      
      if (lesson && lesson.id) {
        // Edycja istniejącej jazdy
        const startTime = new Date(lesson.start_time)
        const startDate = startTime.toISOString().slice(0, 10)
        const timeStr = startTime.toTimeString().slice(0, 5)
        setFormData({
          student_id: lesson.student_id || '',
          instructor_id: lesson.instructor_id || instructorId,
          start_date: startDate || '',
          start_time: timeStr || '',
          duration_minutes: lesson.duration_minutes || 30,
          status: lesson.status || 'pending',
          notes: lesson.notes || ''
        })
      } else if (lesson && !lesson.id) {
        // Nowa jazda z grafiku - dane są już w poprawnym formacie
        setFormData({
          student_id: lesson.student_id || '',
          instructor_id: lesson.instructor_id || instructorId,
          start_date: lesson.start_date || '',
          start_time: lesson.start_time || '',
          duration_minutes: lesson.duration_minutes || 30,
          status: lesson.status || 'pending',
          notes: lesson.notes || ''
        })
      } else {
        // Reset formularza
        setFormData({
          student_id: '',
          instructor_id: instructorId,
          start_date: '',
          start_time: '',
          duration_minutes: 30,
          status: 'pending',
          notes: ''
        })
      }
    }
    
    setupFormData()
  }, [lesson?.id, lesson?.start_date, lesson?.start_time, user])

  const checkTimeCollision = async (studentId, instructorId, startTime, endTime, excludeLessonId = null) => {
    try {
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

      if (excludeLessonId) {
        studentQuery = studentQuery.neq('id', excludeLessonId)
        instructorQuery = instructorQuery.neq('id', excludeLessonId)
      }

      const { data: studentLessons } = await studentQuery
      const { data: instructorLessons } = await instructorQuery

      const errors = []
      const newStart = new Date(startTime)
      const newEnd = new Date(endTime)

      studentLessons?.forEach(existingLesson => {
        const existingStart = new Date(existingLesson.start_time)
        const existingEnd = new Date(existingLesson.end_time)

        if ((newStart < existingEnd && newEnd > existingStart)) {
          errors.push(`Kursant ma już zaplanowaną jazdę w tym czasie`)
        }
      })

      instructorLessons?.forEach(existingLesson => {
        const existingStart = new Date(existingLesson.start_time)
        const existingEnd = new Date(existingLesson.end_time)

        if ((newStart < existingEnd && newEnd > existingStart)) {
          errors.push(`Instruktor ma już zaplanowaną jazdę w tym czasie`)
        }
      })

      return { hasCollision: errors.length > 0, errors }
    } catch (error) {
      console.error('Błąd sprawdzania kolizji:', error)
      return { hasCollision: false, errors: [] }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Walidacja pól wymaganych
    const newErrors = {}
    if (!formData.student_id) {
      newErrors.student_id = 'Wybierz kursanta'
    }
    if (!formData.instructor_id) {
      newErrors.instructor_id = 'Wybierz instruktora'
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Wybierz datę'
    }
    if (!formData.start_time) {
      newErrors.start_time = 'Wybierz godzinę'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Uzupełnij wszystkie wymagane pola')
      return
    }
    
    // Walidacja: kursant z <=10h wyjechanych nie może mieć jazdy dłuższej niż 2h
    if (formData.student_id) {
      const selectedStudent = students.find(s => s.id === formData.student_id)
      if (selectedStudent && (selectedStudent.completed_hours || 0) <= 10 && formData.duration_minutes > 120) {
        toast.error('Dla kursantów posiadających mniej niż 10 wyjeżdżonych godzin obowiązuje limit jazd do 2 godzin.')
        return
      }
    }
    
    setErrors({})
    
    try {
      setLoading(true)
      
      const startTime = new Date(`${formData.start_date}T${formData.start_time}:00`)
      const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60000)
      
      // Zapisz czas lokalny jako string ISO bez informacji o timezone
      const formatLocalTime = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }
      
      if (formData.student_id && formData.instructor_id) {
        const collision = await checkTimeCollision(
          formData.student_id,
          formData.instructor_id,
          startTime,
          endTime,
          lesson?.id
        )

        if (collision.hasCollision) {
          collision.errors.forEach(error => toast.error(error))
          return
        }
      }

      // Get organization_id from instructor
      let organizationId = null
      if (formData.instructor_id) {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('organization_id')
          .eq('id', formData.instructor_id)
          .single()
        organizationId = instructorData?.organization_id
      } else if (user?.organizationId) {
        organizationId = user.organizationId
      }

      const lessonData = {
        student_id: formData.student_id,
        instructor_id: formData.instructor_id,
        start_time: formatLocalTime(startTime),
        end_time: formatLocalTime(endTime),
        duration_minutes: formData.duration_minutes,
        status: formData.status,
        notes: formData.notes,
        organization_id: organizationId
      }

      if (lesson && lesson.id) {
        const { error } = await supabase
          .from('driving_lessons')
          .update(lessonData)
          .eq('id', lesson.id)

        if (error) throw error
        toast.success('Jazda zaktualizowana pomyślnie!')
      } else {
        const { error } = await supabase
          .from('driving_lessons')
          .insert(lessonData)

        if (error) throw error
        toast.success('Jazda dodana pomyślnie!')
      }

      onSave()
      onCancel()
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Błąd podczas zapisywania jazdy')
    } finally {
      setLoading(false)
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
      onCancel()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Błąd podczas usuwania jazdy')
    }
  }

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Czyść błąd dla tego pola gdy użytkownik wprowadza wartość
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
    // Wywołaj callback przy zmianie duration_minutes
    if (name === 'duration_minutes' && onDurationChange) {
      onDurationChange(parseInt(value))
    }
  }, [errors, onDurationChange])

  const handleTimeChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (name === 'start_time') {
      const durationOptions = getDurationOptions(value)
      setFormData(prev => {
        if (!durationOptions.includes(prev.duration_minutes)) {
          return { ...prev, [name]: value, duration_minutes: durationOptions[0] }
        }
        return { ...prev, [name]: value }
      })
    }
  }

  return (
    <>
      <div className={formSpacing}>
        <form onSubmit={handleSubmit} className={formSpacing}>
          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              <User className="inline h-4 w-4 mr-1" />
              Kursant
            </label>
            <CustomSelect
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              options={studentOptions}
              placeholder="Wybierz kursanta"
              required
              searchable
              hasError={!!errors.student_id}
            />
            {errors.student_id && (
              <p className="text-xs text-red-500 mt-1">{errors.student_id}</p>
            )}
          </div>

          {/* Ukryj wybór instruktora dla instruktorów - jest automatycznie ustawiony */}
          {user?.role !== 'instructor' && (
            <div>
              <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
                <Car className="inline h-4 w-4 mr-1" />
                Instruktor
              </label>
              <CustomSelect
                name="instructor_id"
                value={formData.instructor_id}
                onChange={handleChange}
                options={instructorOptions}
                placeholder="Wybierz instruktora"
                required
                searchable
                hasError={!!errors.instructor_id}
              />
              {errors.instructor_id && (
                <p className="text-xs text-red-500 mt-1">{errors.instructor_id}</p>
              )}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              <Calendar className="inline h-4 w-4 mr-1" />
              Data
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className={`w-full ${inputPaddingX} ${inputPadding} border-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-50 dark:text-dark-900 transition-all duration-200 text-sm ${
                errors.start_date ? 'border-red-500' : 'border-gray-200 dark:border-dark-300'
              }`}
              style={{ position: 'relative', zIndex: 1 }}
            />
            {errors.start_date && (
              <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              <Clock className="inline h-4 w-4 mr-1" />
              Godzina
            </label>
            <CustomSelect
              name="start_time"
              value={formData.start_time}
              onChange={handleTimeChange}
              options={[
                { value: "", label: "Wybierz godzinę" },
                ...generateTimeOptions().map(time => ({ value: time, label: time }))
              ]}
              placeholder="Wybierz godzinę"
              required
              hasError={!!errors.start_time}
            />
            {errors.start_time && (
              <p className="text-xs text-red-500 mt-1">{errors.start_time}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
              Jazdy mogą zaczynać się od 6:00 do 20:00. Od 20:00 max 1h.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              <Clock className="inline h-4 w-4 mr-1" />
              Czas trwania
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
          </div>

          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              <Clock className="inline h-4 w-4 mr-1" />
              Godzina zakończenia
            </label>
            <input
              type="text"
              value={endTime}
              disabled
              className={`w-full ${inputPaddingX} ${inputPadding} border-2 border-gray-200 dark:border-dark-300 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-dark-500 cursor-not-allowed transition-all duration-200 text-sm`}
              placeholder="--:--"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              Status
            </label>
            <CustomSelect
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: "pending", label: "Oczekująca" },
                { value: "confirmed", label: "Potwierdzona" },
                { value: "in_progress", label: "W trakcie" },
                { value: "completed", label: "Zakończona" },
                { value: "cancelled", label: "Odwołana" }
              ]}
              placeholder="Wybierz status"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium text-gray-700 dark:text-dark-700 ${labelMargin}`}>
              Notatki
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={textareaRows}
              className={`w-full ${inputPaddingX} ${inputPadding} border-2 border-gray-200 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-50 dark:text-dark-900 transition-all duration-200 resize-none text-sm`}
              placeholder="Dodatkowe informacje o jeździe..."
            />
          </div>

          <div className={`flex space-x-2 ${buttonContainerPadding}`}>
            {lesson && lesson.id && (
              <button
                type="button"
                onClick={handleDelete}
                className={`${buttonPaddingX} ${buttonPadding} text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium`}
              >
                <Trash2 className="inline h-4 w-4 mr-1" />
                Usuń
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 ${buttonPaddingX} ${buttonPadding} text-gray-700 dark:text-dark-700 bg-gray-100 dark:bg-dark-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors text-sm font-medium`}
            >
              {lesson && lesson.id ? 'Anuluj' : 'Wyczyść'}
            </button>
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault()
                handleSubmit(e)
              }}
              disabled={loading}
              className={`flex-1 ${buttonPaddingX} ${buttonPadding} bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium`}
            >
              {loading ? 'Zapisywanie...' : (lesson ? 'Zaktualizuj' : 'Dodaj')}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-900 mb-2">
                Usunąć jazdę?
              </h3>
              <p className="text-gray-600 dark:text-dark-600 mb-6">
                Czy na pewno chcesz usunąć tę jazdę? Tej operacji nie można cofnąć.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 ${buttonPaddingX} ${buttonPadding} bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors text-sm font-medium`}
                >
                  Anuluj
                </button>
                <button
                  onClick={confirmDelete}
                  className={`flex-1 ${buttonPaddingX} ${buttonPadding} bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium`}
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

export default LessonForm
