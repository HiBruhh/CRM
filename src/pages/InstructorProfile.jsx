import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowLeft, Phone, Mail, Calendar, User, Clock, MapPin, Edit, Trash2, X, Car, FileText, CheckCircle, XCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatLocalTime, formatLocalDate } from '../utils/timeHelpers'

const InstructorProfile = () => {
  const { instructorId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [instructor, setInstructor] = useState(null)
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    status: 'active'
  })
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
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalLessons: 0,
    totalHours: 0,
    completedLessons: 0
  })

  useEffect(() => {
    fetchInstructor()
    fetchStudents()
    fetchLessons()
  }, [instructorId])

  const fetchInstructor = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('id', instructorId)
        .single()

      if (error) throw error
      setInstructor(data)
      
      // Initialize edit form data with instructor data
      setEditFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        license_number: data.license_number || '',
        status: data.status
      })
    } catch (error) {
      console.error('Error fetching instructor:', error)
      toast.error('Błąd podczas pobierania danych instruktora')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('status', 'active')

      if (error) throw error
      setStudents(data || [])
      setStats(prev => ({ ...prev, totalStudents: data?.length || 0 }))
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('driving_lessons')
        .select(`
          *,
          student:students(first_name, last_name, student_id)
        `)
        .eq('instructor_id', instructorId)
        .order('start_time', { ascending: false })

      if (error) throw error
      setLessons(data || [])
      
      // Calculate stats
      const totalHours = data?.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0) || 0
      const completedLessons = data?.filter(lesson => lesson.status === 'completed').length || 0
      
      setStats(prev => ({
        ...prev,
        totalLessons: data?.length || 0,
        totalHours: Math.round(totalHours / 60 * 10) / 10,
        completedLessons
      }))
    } catch (error) {
      console.error('Error fetching lessons:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktywny'
      case 'inactive': return 'Nieaktywny'
      default: return 'Nieznany'
    }
  }

  const getLessonStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLessonStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Oczekuje'
      case 'confirmed': return 'Potwierdzona'
      case 'in_progress': return 'W trakcie'
      case 'completed': return 'Zakończona'
      case 'cancelled': return 'Anulowana'
      default: return 'Nieznany'
    }
  }

  const handleDeleteInstructor = async () => {
    setIsDeleting(true)
    try {
      // Najpierw usuń wszystkie powiązane jazdy
      const { error: lessonsError } = await supabase
        .from('driving_lessons')
        .delete()
        .eq('instructor_id', instructorId)

      if (lessonsError) throw lessonsError

      // Usuń przypisania kursantów do tego instruktora
      const { error: studentsError } = await supabase
        .from('students')
        .update({ instructor_id: null })
        .eq('instructor_id', instructorId)

      if (studentsError) throw studentsError

      // Potem usuń instruktora
      const { error: instructorError } = await supabase
        .from('instructors')
        .delete()
        .eq('id', instructorId)

      if (instructorError) throw instructorError

      toast.success('Instruktor został usunięty pomyślnie')
      setShowDeleteModal(false)
      navigate('/instructors')
    } catch (error) {
      console.error('Error deleting instructor:', error)
      toast.error('Błąd podczas usuwania instruktora')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditInstructorClick = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditFormData({
      first_name: instructor.first_name,
      last_name: instructor.last_name,
      email: instructor.email,
      phone: instructor.phone,
      license_number: instructor.license_number || '',
      status: instructor.status
    })
  }

  const handleUpdateInstructor = async () => {
    try {
      const updateData = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        phone: editFormData.phone,
        license_number: editFormData.license_number,
      }

      if (user?.role === 'admin') {
        updateData.status = editFormData.status
      }

      const { error } = await supabase
        .from('instructors')
        .update(updateData)
        .eq('id', instructorId)

      if (error) throw error

      toast.success('Instruktor został zaktualizowany pomyślnie')
      setIsEditing(false)
      fetchInstructor()
    } catch (error) {
      console.error('Error updating instructor:', error)
      toast.error('Błąd podczas aktualizacji instruktora')
    }
  }

  const openChecklistModal = (lesson) => {
    setSelectedLesson(lesson)
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
    if (!selectedLesson) return
    setIsSaving(true)

    const totalScore = Object.keys(checklistData).reduce((sum, key) => {
      if (key !== 'instructor_notes') {
        return sum + checklistData[key]
      }
      return sum
    }, 0)

    const maxScore = 14 * 5; // 14 checklist items, max 5 points each
    const normalizedScore = (totalScore / maxScore) * 100

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
      setShowChecklistModal(false)
      fetchLessons()
    } catch (error) {
      console.error('Error saving checklist:', error)
      toast.error('Błąd podczas zapisywania checklisty')
    } finally {
      setIsSaving(false)
    }
  }

  const openAssignModal = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .is('instructor_id', null)
        .eq('status', 'active')

      if (error) throw error
      setAvailableStudents(data || [])
      setSelectedStudents([])
      setShowAssignModal(true)
    } catch (error) {
      console.error('Error fetching available students:', error)
      toast.error('Błąd podczas pobierania kursantów')
    }
  }

  const handleAssignStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Wybierz przynajmniej jednego kursanta')
      return
    }

    setIsAssigning(true)
    try {
      // Najpierw pobierz obecne instruktory kursantów, aby sprawdzić czy się zmienią
      const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('id, instructor_id')
        .in('id', selectedStudents)

      if (fetchError) throw fetchError

      // Znajdź kursantów, u których zmieni się instruktor
      const studentsWithChangedInstructor = students.filter(
        student => student.instructor_id !== instructorId
      )

      const { error } = await supabase
        .from('students')
        .update({ instructor_id: instructorId })
        .in('id', selectedStudents)

      if (error) throw error

      // Jeśli kursanci zmienią instruktora, usuń ich zaplanowane jazdy
      if (studentsWithChangedInstructor.length > 0) {
        const studentIds = studentsWithChangedInstructor.map(s => s.id)
        const { error: deleteError } = await supabase
          .from('driving_lessons')
          .delete()
          .in('status', ['pending', 'confirmed'])
          .in('student_id', studentIds)

        if (deleteError) {
          console.error('Error deleting scheduled lessons:', deleteError)
          toast.warning('Kursanci zostali przypisani, ale wystąpił błąd przy usuwaniu zaplanowanych jazd')
        } else {
          toast.success(`Przypisano ${selectedStudents.length} kursantów i usunięto ich zaplanowane jazdy`)
        }
      } else {
        toast.success(`Przypisano ${selectedStudents.length} kursantów do instruktora`)
      }

      setShowAssignModal(false)
      fetchStudents()
    } catch (error) {
      console.error('Error assigning students:', error)
      toast.error('Błąd podczas przypisywania kursantów')
    } finally {
      setIsAssigning(false)
    }
  }

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Wypełnij wszystkie pola')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Nowe hasła nie są zgodne')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Nowe hasło musi mieć co najmniej 6 znaków')
      return
    }

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast.success('Hasło zmienione pomyślnie')
      setShowPasswordModal(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Błąd podczas zmiany hasła')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Ładowanie profilu instruktora..." />
  }

  if (!instructor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-dark-600 mb-4">Nie znaleziono instruktora</p>
          <button
            onClick={() => navigate(user?.role === 'admin' ? '/instructors' : '/instructor-panel')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {user?.role === 'admin' ? 'Wróć do listy instruktorów' : 'Wróć do panelu'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/instructors')}
            className="flex items-center text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Wróć do listy instruktorów
          </button>
        )}

        {/* Instructor Info Card */}
        <div className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900 rounded-lg p-4 mr-4">
                <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
                  {instructor.first_name} {instructor.last_name}
                </h1>
                <p className="text-gray-600 dark:text-dark-600">{instructor.instructor_number || '-'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEditInstructorClick}
                className="p-2 text-gray-600 dark:text-dark-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Edytuj instruktora"
              >
                <Edit className="h-5 w-5" />
              </button>
              {user?.role === 'instructor' && instructor.auth_id === user.id && (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="p-2 text-gray-600 dark:text-dark-600 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title="Zmień hasło"
                >
                  <User className="h-5 w-5" />
                </button>
              )}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 text-gray-600 dark:text-dark-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Usuń instruktora"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(instructor.status)}`}>
                {getStatusText(instructor.status)}
              </span>
            </div>
          </div>

          {/* Instructor Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {isEditing ? (
              <>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Imię</p>
                    <input
                      type="text"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      placeholder={instructor.first_name}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Nazwisko</p>
                    <input
                      type="text"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      placeholder={instructor.last_name}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Telefon</p>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder={instructor.phone}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Email</p>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder={instructor.email}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Numer dokumentu uprawniający do szkolenia</p>
                    <input
                      type="text"
                      value={editFormData.license_number}
                      onChange={(e) => {
                        // Format: XXX/0000 (3 letters, slash, 4 digits)
                        let value = e.target.value.toUpperCase()
                        // Remove all non-alphanumeric characters except slash
                        value = value.replace(/[^A-Z0-9/]/g, '')
                        // Limit to 8 characters (3 letters + slash + 4 digits)
                        if (value.length > 8) {
                          value = value.slice(0, 8)
                        }
                        // Auto-add slash after 3 letters
                        if (value.length >= 3 && !value.includes('/')) {
                          value = value.slice(0, 3) + '/' + value.slice(3)
                        }
                        // Ensure slash is at position 3
                        if (value.includes('/') && value.indexOf('/') !== 3) {
                          const parts = value.split('/')
                          value = parts[0].slice(0, 3) + '/' + parts[1].slice(0, 4)
                        }
                        setEditFormData({ ...editFormData, license_number: value })
                      }}
                      placeholder="ABC/1234"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm uppercase"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Status</p>
                    {user?.role === 'admin' ? (
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                      >
                        <option value="active">Aktywny</option>
                        <option value="inactive">Nieaktywny</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 dark:text-dark-900 font-medium">{getStatusText(instructor.status)}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Telefon</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">{instructor.phone}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Email</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">{instructor.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Data dołączenia</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">
                      {formatLocalDate(instructor.created_at)}
                    </p>
                  </div>
                </div>
                {instructor.license_number && (
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-dark-600">Numer dokumentu uprawniający do szkolenia</p>
                      <p className="text-gray-900 dark:text-dark-900 font-medium uppercase">{instructor.license_number}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex justify-end space-x-3 mt-6 animate-fade-in" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200 transition-all duration-200"
              >
                Anuluj
              </button>
              <button
                onClick={handleUpdateInstructor}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200"
              >
                Zapisz
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Kursanci</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.totalStudents}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Jazdy</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.totalLessons}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Godziny</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.totalHours}h</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Zakończone</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.completedLessons}</p>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-900">Przypisani kursanci ({students.length})</h2>
            {user?.role === 'admin' && (
              <button
                onClick={openAssignModal}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Przypisz kursanta
              </button>
            )}
          </div>
          
          {students.length === 0 ? (
            <p className="text-gray-600 dark:text-dark-600 text-center py-8">Brak przypisanych kursantów</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="border border-gray-200 dark:border-dark-200 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900 dark:text-dark-900 font-medium">
                      {student.first_name} {student.last_name}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-dark-600">
                    <span className="mr-4">{student.student_id}</span>
                    <span className="mr-4">Kat. {student.category}</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-dark-500 mt-1">
                    {student.completed_hours || 0}/{student.required_hours || 30}h
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lessons History */}
        <div className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-900 mb-4">Historia jazd</h2>
          
          {lessons.length === 0 ? (
            <p className="text-gray-600 dark:text-dark-600 text-center py-8">Brak zarejestrowanych jazd</p>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="border border-gray-200 dark:border-dark-200 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-900 dark:text-dark-900 font-medium">
                          {formatLocalDate(lesson.start_time)}
                        </span>
                        <Clock className="h-4 w-4 text-gray-400 ml-4 mr-2" />
                        <span className="text-gray-900 dark:text-dark-900 font-medium">
                          {formatLocalTime(lesson.start_time)}
                        </span>
                        <span className="text-gray-500 dark:text-dark-600 ml-2">
                          - {formatLocalTime(lesson.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600 dark:text-dark-600">
                          {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name} (${lesson.student.student_id})` : 'Brak kursanta'}
                        </span>
                        <span className="text-gray-500 dark:text-dark-600 ml-4">
                          ({lesson.duration_minutes} min)
                        </span>
                      </div>
                      {lesson.notes && (
                        <div className="flex items-start mt-2">
                          <FileText className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <span className="text-gray-600 dark:text-dark-600 text-sm">{lesson.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLessonStatusColor(lesson.status)}`}>
                        {getLessonStatusText(lesson.status)}
                      </span>
                      {lesson.status !== 'cancelled' && (
                        <>
                          {lesson.checklist ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <button
                            onClick={() => openChecklistModal(lesson)}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                          >
                            Checklist
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-2">Potwierdzenie usunięcia</h3>
              <p className="text-gray-600 dark:text-dark-600 mb-2">
                Czy na pewno chcesz usunąć instruktora {instructor.first_name} {instructor.last_name}?
              </p>
              <p className="text-gray-500 dark:text-dark-500 text-sm mb-6">
                Ta operacja usunie również wszystkie powiązane jazdy w grafiku i odetnie przypisania kursantów do tego instruktora.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteInstructor}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Usuwanie...' : 'Usuń'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      {showChecklistModal && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                Checklist - {formatLocalDate(selectedLesson.start_time)}
              </h3>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-dark-900">Umiejętności praktyczne</h4>
                {[
                  { key: 'vehicle_preparation', label: 'Przygotowanie pojazdu' },
                  { key: 'controls_familiarity', label: 'Znajomość kontroli' },
                  { key: 'steering_control', label: 'Sterowanie kierownicą' },
                  { key: 'acceleration_braking', label: 'Przyspieszanie i hamowanie' },
                  { key: 'gear_shifting', label: 'Zmiana biegów' },
                  { key: 'mirror_use', label: 'Używanie luster' },
                  { key: 'blind_spot_check', label: 'Sprawdzanie martwego pola' },
                  { key: 'lane_positioning', label: 'Pozycjonowanie na pasie' },
                  { key: 'turning', label: 'Skręcanie' },
                  { key: 'parking', label: 'Parkowanie' },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex justify-between mb-2">
                      <label className="text-gray-700 dark:text-dark-900">{item.label}</label>
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{checklistData[item.key]}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData[item.key]}
                      onChange={(e) => setChecklistData({ ...checklistData, [item.key]: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-dark-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                ))}

                <h4 className="font-medium text-gray-900 dark:text-dark-900 pt-4">Znajomość przepisów</h4>
                {[
                  { key: 'traffic_rules', label: 'Przepisy ruchu drogowego' },
                  { key: 'road_signs', label: 'Znaki drogowe' },
                  { key: 'emergency_procedures', label: 'Procedury awaryjne' },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex justify-between mb-2">
                      <label className="text-gray-700 dark:text-dark-900">{item.label}</label>
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{checklistData[item.key]}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={checklistData[item.key]}
                      onChange={(e) => setChecklistData({ ...checklistData, [item.key]: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-dark-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                ))}

                <h4 className="font-medium text-gray-900 dark:text-dark-900 pt-4">Notatki instruktora</h4>
                <textarea
                  value={checklistData.instructor_notes}
                  onChange={(e) => setChecklistData({ ...checklistData, instructor_notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                  placeholder="Dodaj notatki o postępie kursanta..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowChecklistModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveChecklist}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                Przypisz kursantów bez instruktora
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {availableStudents.length === 0 ? (
                <p className="text-gray-600 dark:text-dark-600 text-center py-8">Brak kursantów do przypisania</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedStudents.includes(student.id)
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-dark-200 hover:bg-gray-50 dark:hover:bg-dark-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900 dark:text-dark-900 font-medium">
                            {student.first_name} {student.last_name}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-dark-600">
                          <span className="mr-4">{student.student_id}</span>
                          <span className="mr-4">Kat. {student.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedStudents.includes(student.id)
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300 dark:border-dark-300'
                        }`}>
                          {selectedStudents.includes(student.id) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAssignStudents}
                  disabled={isAssigning || selectedStudents.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isAssigning ? 'Przypisywanie...' : `Przypisz (${selectedStudents.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                Zmień hasło
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                  Nowe hasło
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Nowe hasło (min. 6 znaków)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">
                  Potwierdź nowe hasło
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Potwierdź nowe hasło"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-dark-200">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                Anuluj
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isChangingPassword ? 'Zmienianie...' : 'Zmień hasło'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstructorProfile
