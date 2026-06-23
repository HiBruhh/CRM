import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowLeft, Phone, Mail, Calendar, User, Clock, MapPin, CheckCircle, XCircle, FileText, Edit, Trash2, X, Car, Star, Users } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatLocalTime, formatLocalDate } from '../utils/timeHelpers'

const StudentProfile = () => {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const supabase = useSupabase()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [showInstructorModal, setShowInstructorModal] = useState(false)
  const [selectedInstructor, setSelectedInstructor] = useState(null)
  const [instructorStudents, setInstructorStudents] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    category: 'B',
    status: 'active',
    instructor_id: ''
  })
  const [instructors, setInstructors] = useState([])
  
  const categories = [
    {
      code: 'AM',
      name: 'Motorowery',
      shortDesc: 'Motorowery, czterokołowce lekkie',
      vehicles: 'motorower, czterokołowiec lekki (np. mały quad), zespół pojazdów z przyczepą - tylko w Polsce',
      age: '14 lat',
      fullDesc: 'Pozwala na kierowanie motorowerem, czterokołowcem lekkim (np. mały quad) oraz zespołem pojazdów złożonym z powyższych pojazdów połączonych z przyczepą - tylko na terytorium Polski.'
    },
    {
      code: 'A1',
      name: 'Motocykle lekkie',
      shortDesc: 'Motocykle do 125 cm³, 11 kW',
      vehicles: 'motocykl do 125 cm³, 11 kW, motocykl trójkołowy do 15 kW, pojazdy z kat. AM, zespół z przyczepą - tylko w PL',
      age: '16 lat',
      fullDesc: 'Pozwala na kierowanie motocyklem o pojemności skokowej silnika do 125 cm³, mocy do 11 kW i stosunku mocy do masy własnej do 0,1 kW/kg, motocyklem trójkołowym o mocy do 15 kW, pojazdami z kategorii AM oraz zespołem pojazdów z przyczepą - tylko w Polsce.'
    },
    {
      code: 'A2',
      name: 'Motocykle średnie',
      shortDesc: 'Motocykle do 35 kW',
      vehicles: 'motocykl do 35 kW, motocykl trójkołowy do 15 kW, pojazdy z kat. AM, zespół z przyczepą - tylko w PL',
      age: '17 lat (do 18 tylko w PL)',
      fullDesc: 'Pozwala na kierowanie motocyklem o mocy do 35 kW i stosunku mocy do masy własnej do 0,2 kW/kg, który nie powstał w wyniku wprowadzenia zmian w pojeździe o mocy przekraczającej dwukrotność mocy tego motocykla. Do czasu ukończenia 18 lat możesz kierować pojazdem wyłącznie na terytorium RP.'
    },
    {
      code: 'A',
      name: 'Motocykle wszystkie',
      shortDesc: 'Każdy motocykl',
      vehicles: 'każdy motocykl, pojazd z kat. AM, zespół z przyczepą - tylko w PL',
      age: '20 lat (z A2 od 2 lat) lub 24 lata',
      fullDesc: 'Pozwala na kierowanie każdym motocyklem, pojazdem z kategorii AM oraz zespołem pojazdów z przyczepą - tylko w Polsce. Wymagane wiek: 20 lat jeśli masz już od co najmniej 2 lat prawo jazdy kategorii A2, lub 24 lata jeśli nie masz.'
    },
    {
      code: 'B1',
      name: 'Czterokołowce',
      shortDesc: 'Czterokołowce (np. duży quad)',
      vehicles: 'czterokołowiec (np. duży quad), pojazd z kat. AM',
      age: '16 lat',
      fullDesc: 'Pozwala na kierowanie czterokołowcem (np. duży quad) oraz pojazdami z kategorii AM.'
    },
    {
      code: 'B',
      name: 'Samochody osobowe',
      shortDesc: 'Pojazdy do 3,5 t',
      vehicles: 'samochód do 3,5 t, lekka przyczepa do 750 kg, ciągnik rolniczy, pojazd wolnobieżny - tylko w PL',
      age: '17 lat (do 18 tylko w PL)',
      fullDesc: 'Pozwala na kierowanie pojazdem samochodowym o dopuszczalnej masie całkowitej do 3,5 t (np. samochód osobowy), z wyjątkiem autobusu i motocykla, zespołem pojazdów z lekką przyczepą do 750 kg, ciągnikiem rolniczym, pojazdem wolnobieżnym - tylko w Polsce. Do czasu ukończenia 18 lat możesz kierować pojazdem wyłącznie na terytorium RP.'
    },
    {
      code: 'B+E',
      name: 'Samochody z przyczepą',
      shortDesc: 'Pojazdy z kategorii B + przyczepa',
      vehicles: 'pojazd z kat. B + przyczepa do 3,5 t, ciągnik rolniczy + przyczepy, pojazd wolnobieżny + przyczepy - tylko w PL',
      age: '17 lat (do 18 tylko w PL)',
      fullDesc: 'Pozwala na kierowanie zespołem pojazdów złożonym z pojazdu z kategorii B i przyczepy o dopuszczalnej masie całkowitej do 3,5 tony, zespołem pojazdów z ciągnika rolniczego i przyczep, zespołem pojazdów z pojazdu wolnobieżnego i przyczep - tylko w Polsce.'
    },
    {
      code: 'C',
      name: 'Ciężarówki duże',
      shortDesc: 'Pojazdy ponad 3,5 t',
      vehicles: 'ciężarówka ponad 3,5 t, lekka przyczepa do 750 kg, ciągnik rolniczy, pojazd wolnobieżny - tylko w PL',
      age: '21 lat',
      fullDesc: 'Pozwala na kierowanie pojazdem samochodowym o dopuszczalnej masie całkowitej ponad 3,5 t, z wyjątkiem autobusu (np. duża ciężarówka), zespołem pojazdów z lekką przyczepą, ciągnikiem rolniczym, pojazdem wolnobieżnym - tylko w Polsce.'
    },
    {
      code: 'C1',
      name: 'Ciężarówki średnie',
      shortDesc: 'Pojazdy 3,5-7,5 t',
      vehicles: 'ciężarówka 3,5-7,5 t, lekka przyczepa do 750 kg, ciągnik rolniczy, pojazd wolnobieżny - tylko w PL',
      age: '18 lat',
      fullDesc: 'Pozwala na kierowanie pojazdem samochodowym o dopuszczalnej masie całkowitej ponad 3,5 t do 7,5 t, z wyjątkiem autobusu (np. mała ciężarówka), zespołem pojazdów z lekką przyczepą, ciągnikiem rolniczym, pojazdem wolnobieżnym - tylko w Polsce.'
    },
    {
      code: 'C1+E',
      name: 'Ciężarówki średnie + przyczepa',
      shortDesc: 'Pojazdy 3,5-7,5 t + przyczepa',
      vehicles: 'pojazd 3,5-7,5 t + przyczepa, ciągnik rolniczy + przyczepy - tylko w PL',
      age: '18 lat',
      fullDesc: 'Pozwala na kierowanie zespołem pojazdów złożonym z pojazdu z kategorii C1 i przyczepy, zespołem pojazdów z ciągnika rolniczego i przyczep - tylko w Polsce.'
    },
    {
      code: 'C+E',
      name: 'Ciężarówki duże + przyczepa',
      shortDesc: 'Pojazdy ponad 3,5 t + przyczepa',
      vehicles: 'pojazd ponad 3,5 t + przyczepa, ciągnik rolniczy + przyczepy - tylko w PL',
      age: '21 lat',
      fullDesc: 'Pozwala na kierowanie zespołem pojazdów złożonym z pojazdu z kategorii C i przyczepy, zespołem pojazdów z ciągnika rolniczego i przyczep - tylko w Polsce.'
    },
    {
      code: 'D',
      name: 'Autokary',
      shortDesc: 'Autokary powyżej 8 miejsc',
      vehicles: 'autokar powyżej 8 miejsc, lekka przyczepa do 750 kg',
      age: '24 lata',
      fullDesc: 'Pozwala na kierowanie autokarem przeznaczonym do przewozu więcej niż 8 osób łącznie z kierowcą, zespołem pojazdów złożonym z autokaru i lekkiej przyczepy.'
    },
    {
      code: 'D1',
      name: 'Autokary małe',
      shortDesc: 'Autokary do 16 miejsc',
      vehicles: 'autokar do 16 miejsc, lekka przyczepa do 750 kg',
      age: '21 lat',
      fullDesc: 'Pozwala na kierowanie autokarem przeznaczonym do przewozu więcej niż 8 osób łącznie z kierowcą, ale nie więcej niż 16 osób, zespołem pojazdów złożonym z autokaru i lekkiej przyczepy.'
    },
    {
      code: 'D1+E',
      name: 'Autokary małe + przyczepa',
      shortDesc: 'Autokary do 16 miejsc + przyczepa',
      vehicles: 'autokar do 16 miejsc + przyczepa',
      age: '21 lat',
      fullDesc: 'Pozwala na kierowanie zespołem pojazdów złożonym z autokaru z kategorii D1 i przyczepy.'
    },
    {
      code: 'D+E',
      name: 'Autokary + przyczepa',
      shortDesc: 'Autokary + przyczepa',
      vehicles: 'autokar + przyczepa',
      age: '24 lata',
      fullDesc: 'Pozwala na kierowanie zespołem pojazdów złożonym z autokaru z kategorii D i przyczepy.'
    },
    {
      code: 'T',
      name: 'Ciągniki rolnicze',
      shortDesc: 'Ciągniki rolnicze',
      vehicles: 'ciągnik rolniczy, zespół pojazdów z ciągnikiem rolniczym',
      age: '18 lat',
      fullDesc: 'Pozwala na kierowanie ciągnikiem rolniczym oraz zespołem pojazdów złożonym z ciągnika rolniczego i przyczepy lub przyczep.'
    }
  ]
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
  const [overallRating, setOverallRating] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      await fetchStudent()
      fetchLessons()
      fetchInstructors()
    }
    fetchData()
  }, [studentId])

  // Calculate overall rating from all completed checklists
  useEffect(() => {
    if (lessons.length === 0) {
      setOverallRating(0)
      return
    }

    const completedLessons = lessons.filter(lesson => lesson.score !== null && lesson.score !== undefined)
    if (completedLessons.length === 0) {
      setOverallRating(0)
      return
    }

    const totalScore = completedLessons.reduce((sum, lesson) => sum + lesson.score, 0)
    const rating = Math.round(totalScore / completedLessons.length)
    setOverallRating(rating)
  }, [lessons])

  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          instructor:instructors(id, first_name, last_name, phone, email)
        `)
        .eq('id', studentId)
        .single()

      if (error) throw error

      // Sprawdź czy instruktor ma dostęp do tego kursanta
      if (user?.role === 'instructor') {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (instructorData && data.instructor_id !== instructorData.id) {
          setAccessDenied(true)
          toast.error('Nie masz dostępu do tej strony')
          return
        }
      }

      setStudent(data)
      
      // Initialize edit form data with student data
      setEditFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address || '',
        category: data.category || 'B',
        status: data.status,
        instructor_id: data.instructor_id || ''
      })
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Błąd podczas pobierania danych kursanta')
    } finally {
      setLoading(false)
    }
  }

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('driving_lessons')
        .select(`
          *,
          instructor:instructors(first_name, last_name)
        `)
        .eq('student_id', studentId)
        .order('start_time', { ascending: false })

      if (error) throw error
      
      setLessons(data || [])
      
      // Oblicz ukończone godziny na podstawie zakończonych jazd
      const completedLessons = (data || []).filter(lesson => 
        lesson.status === 'completed' || lesson.status === 'in_progress'
      )
      const totalMinutes = completedLessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0)
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10
      
      // Aktualizuj completed_hours w stanie kursanta
      setStudent(prev => ({
        ...prev,
        completed_hours: totalHours
      }))
    } catch (error) {
      console.error('Error fetching lessons:', error)
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

  const fetchInstructorStudents = async (instructorId) => {
    try {
      const { data } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, status, completed_hours, required_hours')
        .eq('instructor_id', instructorId)
        .order('last_name')
      setInstructorStudents(data || [])
    } catch (error) {
      console.error('Error fetching instructor students:', error)
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktywny'
      case 'completed': return 'Ukończony'
      case 'paused': return 'Wstrzymany'
      case 'cancelled': return 'Anulowany'
      default: return 'Nieznany'
    }
  }

  const getLessonStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLessonStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Oczekuje'
      case 'in_progress': return 'W trakcie'
      case 'completed': return 'Zakończona'
      case 'cancelled': return 'Anulowana'
      default: return 'Nieznany'
    }
  }

  const handleDeleteStudent = async () => {
    setIsDeleting(true)
    try {
      // Najpierw usuń wszystkie powiązane jazdy
      const { error: lessonsError } = await supabase
        .from('driving_lessons')
        .delete()
        .eq('student_id', studentId)

      if (lessonsError) throw lessonsError

      // Potem usuń kursanta
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (studentError) throw studentError

      toast.success('Kursant został usunięty pomyślnie')
      setShowDeleteModal(false)
      navigate('/students')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Błąd podczas usuwania kursanta')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditStudentClick = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone: student.phone,
      address: student.address || '',
      category: student.category || 'B',
      status: student.status,
      instructor_id: student.instructor_id || ''
    })
  }

  const handleUpdateStudent = async () => {
    setIsSaving(true)
    try {
      // Sprawdź czy instruktor się zmienił (uwzględnij null/undefined)
      const oldInstructorId = student.instructor_id || null
      const newInstructorId = editFormData.instructor_id || null
      const instructorChanged = oldInstructorId !== newInstructorId
      
      const { error } = await supabase
        .from('students')
        .update({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          email: editFormData.email,
          phone: editFormData.phone,
          address: editFormData.address,
          category: editFormData.category,
          status: editFormData.status,
          instructor_id: editFormData.instructor_id || null
        })
        .eq('id', studentId)

      if (error) throw error

      // Jeśli instruktor się zmienił, usuń zaplanowane jazdy kursanta
      if (instructorChanged) {
        console.log('Instructor changed, deleting scheduled lessons for student:', studentId)
        const { error: deleteError } = await supabase
          .from('driving_lessons')
          .delete()
          .in('status', ['pending'])
          .eq('student_id', studentId)

        if (deleteError) {
          console.error('Error deleting scheduled lessons:', deleteError)
          toast.warning('Kursant został zaktualizowany, ale wystąpił błąd przy usuwaniu zaplanowanych jazd')
        } else {
          toast.success('Zaplanowane jazdy kursanta zostały usunięte')
        }
      }

      toast.success('Kursant został zaktualizowany pomyślnie')
      setIsEditing(false)
      fetchStudent()
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('Błąd podczas aktualizacji kursanta')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Ładowanie profilu kursanta..." />
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Brak dostępu
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Nie masz dostępu do tego profilu kursanta
          </p>
          <button
            onClick={() => navigate('/instructor-panel')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Powrót do panelu instruktora
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-dark-600 mb-4">Nie znaleziono kursanta</p>
          <button
            onClick={() => navigate('/students')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Wróć do listy kursantów
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/students')}
          className="flex items-center text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Wróć do listy kursantów
        </button>

        {/* Student Info Card */}
        <div className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-lg p-4 mr-4">
                <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
                  {student.first_name} {student.last_name}
                </h1>
                <p className="text-gray-600 dark:text-dark-600">{student.student_id}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${overallRating >= 80 ? 'text-green-600' : overallRating >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {overallRating}
                  </p>
                  <div className="w-32 h-2 bg-gray-200 dark:bg-dark-200 rounded-full mt-1 overflow-hidden relative">
                    <div
                      className="h-2 rounded-full transition-all duration-300 absolute top-0 left-0"
                      style={{
                        width: '100%',
                        background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)'
                      }}
                    ></div>
                    <div
                      className="h-2 rounded-full transition-all duration-300 absolute top-0 left-0 bg-gray-200 dark:bg-dark-200"
                      style={{
                        width: `${100 - overallRating}%`,
                        left: `${overallRating}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEditStudentClick}
                className="p-2 text-gray-600 dark:text-dark-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Edytuj kursanta"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-gray-600 dark:text-dark-600 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Usuń kursanta"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(student.status)}`}>
                {getStatusText(student.status)}
              </span>
              <span className="px-3 py-1 text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-400 rounded-full">
                Kat. {student.category}
              </span>
            </div>
          </div>

          {/* Student Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {isEditing ? (
              <>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Telefon</p>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder={student.phone}
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
                      placeholder={student.email}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Adres</p>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      placeholder={student.address || 'Brak adresu'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Kategoria</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(true)
                        setSelectedCategory(categories.find(c => c.code === editFormData.category))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm text-left hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                    >
                      {categories.find(c => c.code === editFormData.category)?.name || 'Wybierz kategorię'} ({editFormData.category})
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Status</p>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                    >
                      <option value="active">Aktywny</option>
                      <option value="paused">Wstrzymany</option>
                      <option value="completed">Ukończony</option>
                      <option value="cancelled">Anulowany</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-dark-600 mb-1">Instruktor</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInstructorModal(true)
                        setSelectedInstructor(instructors.find(i => i.id === editFormData.instructor_id) || null)
                        if (editFormData.instructor_id) {
                          fetchInstructorStudents(editFormData.instructor_id)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm text-left hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                    >
                      {instructors.find(i => i.id === editFormData.instructor_id) 
                        ? `${instructors.find(i => i.id === editFormData.instructor_id).first_name} ${instructors.find(i => i.id === editFormData.instructor_id).last_name} (${instructors.find(i => i.id === editFormData.instructor_id).instructor_number || '-'})`
                        : 'Wybierz instruktora'
                      }
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Telefon</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">{student.phone}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Email</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Data rozpoczęcia</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">
                      {formatLocalDate(student.created_at)}
                    </p>
                  </div>
                </div>
                {student.address && (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-dark-600">Adres</p>
                      <p className="text-gray-900 dark:text-dark-900 font-medium">{student.address}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-dark-600">Postęp</p>
                    <p className="text-gray-900 dark:text-dark-900 font-medium">
                      {student.completed_hours || 0}/{student.required_hours || 30}h
                    </p>
                  </div>
                </div>
                {student.instructor && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-dark-600">Instruktor</p>
                      <p className="text-gray-900 dark:text-dark-900 font-medium">
                        {student.instructor.first_name} {student.instructor.last_name}
                      </p>
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
                onClick={handleUpdateStudent}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-all duration-200"
              >
                {isSaving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-dark-600 mb-2">
              <span>Postęp kursu</span>
              <span>{Math.min(Math.round(((student.completed_hours || 0) / (student.required_hours || 30)) * 100), 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-200 rounded-full h-3">
              <div
                className={`${(student.completed_hours || 0) >= (student.required_hours || 30) ? 'bg-green-600' : 'bg-primary-600'} h-3 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(((student.completed_hours || 0) / (student.required_hours || 30)) * 100, 100)}%` }}
              ></div>
            </div>
            {(student.completed_hours || 0) > (student.required_hours || 30) && (
              <div className="mt-2 text-sm bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 font-medium px-3 py-2 rounded-lg">
                ⚠️ Kursant ukończył wymagane {student.required_hours || 30}h i dokupuje dodatkowe godziny. Zgłoś do OSK po ukończeniu kursu.
              </div>
            )}
            {(student.completed_hours || 0) === (student.required_hours || 30) && (
              <div className="mt-2 text-sm bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 font-medium px-3 py-2 rounded-lg">
                ✅ Kursant ukończył wymagane {student.required_hours || 30}h. Zgłoś do OSK po ukończeniu kursu.
              </div>
            )}
          </div>
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
                          {lesson.instructor ? `${lesson.instructor.first_name} ${lesson.instructor.last_name}` : 'Brak instruktora'}
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

      {/* Checklist Modal */}
      {showChecklistModal && selectedLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                  Checklist jazdy
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-500">
                  {formatLocalDate(selectedLesson.start_time)} · {formatLocalTime(selectedLesson.start_time)}
                </p>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overall score summary */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-200/50 rounded-xl">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full text-xl font-bold ${(() => {
                  const score = Math.round(Object.keys(checklistData).filter(k => typeof checklistData[k] === 'number').reduce((a, k) => a + checklistData[k], 0) / 13 * 10)
                  if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  if (score >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                })()}`}>
                  {Math.round(Object.keys(checklistData).filter(k => typeof checklistData[k] === 'number').reduce((a, k) => a + checklistData[k], 0) / 13 * 10)}%
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-dark-900">Ocena ogólna</p>
                  <p className="text-sm text-gray-500 dark:text-dark-500">
                    {(() => {
                      const score = Math.round(Object.keys(checklistData).filter(k => typeof checklistData[k] === 'number').reduce((a, k) => a + checklistData[k], 0) / 13 * 10)
                      if (score >= 80) return 'Bardzo dobrze — kursant radzi sobie świetnie'
                      if (score >= 60) return 'Dobrze — są jeszcze elementy do przećwiczenia'
                      return 'Wymaga pracy — warto powtórzyć podstawy'
                    })()}
                  </p>
                </div>
              </div>

              {/* Skills section */}
              <div className="bg-white dark:bg-dark-100 border border-gray-200 dark:border-dark-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary-600" />
                  Umiejętności praktyczne
                </h4>
                <div className="space-y-5">
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
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-dark-900">{item.label}</label>
                        <span className={`inline-flex items-center justify-center w-9 h-6 rounded text-xs font-semibold ${(() => {
                          const v = checklistData[item.key] || 0
                          if (v >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          if (v >= 5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        })()}`}>
                          {checklistData[item.key] || 0}
                        </span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">0</span>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={checklistData[item.key] || 0}
                          onChange={(e) => setChecklistData({ ...checklistData, [item.key]: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-gray-200 dark:bg-dark-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <span className="text-xs text-gray-400 w-6 text-right">10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theory section */}
              <div className="bg-white dark:bg-dark-100 border border-gray-200 dark:border-dark-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-600" />
                  Znajomość przepisów
                </h4>
                <div className="space-y-5">
                  {[
                    { key: 'traffic_rules', label: 'Przepisy ruchu drogowego' },
                    { key: 'road_signs', label: 'Znaki drogowe' },
                    { key: 'emergency_procedures', label: 'Procedury awaryjne' },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-dark-900">{item.label}</label>
                        <span className={`inline-flex items-center justify-center w-9 h-6 rounded text-xs font-semibold ${(() => {
                          const v = checklistData[item.key] || 0
                          if (v >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          if (v >= 5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        })()}`}>
                          {checklistData[item.key] || 0}
                        </span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">0</span>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={checklistData[item.key] || 0}
                          onChange={(e) => setChecklistData({ ...checklistData, [item.key]: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-gray-200 dark:bg-dark-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <span className="text-xs text-gray-400 w-6 text-right">10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructor notes */}
              <div className="bg-white dark:bg-dark-100 border border-gray-200 dark:border-dark-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-dark-900 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary-600" />
                  Notatki instruktora
                </h4>
                <textarea
                  value={checklistData.instructor_notes || ''}
                  onChange={(e) => setChecklistData({ ...checklistData, instructor_notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 resize-none"
                  placeholder="Co poszło dobrze? Co wymaga powtórki?..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowChecklistModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200 font-medium transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveChecklist}
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz checklistę'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-2">Potwierdzenie usunięcia</h3>
              <p className="text-gray-600 dark:text-dark-600 mb-2">
                Czy na pewno chcesz usunąć kursanta {student.first_name} {student.last_name}?
              </p>
              <p className="text-gray-500 dark:text-dark-500 text-sm mb-6">
                Ta operacja usunie również wszystkie powiązane jazdy w grafiku.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteStudent}
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

      {/* Instructor Selection Modal */}
      {showInstructorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Wybierz instruktora</h3>
              <button
                onClick={() => setShowInstructorModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex h-[70vh]">
              {/* Left side - Instructor list (30%) */}
              <div className="w-[30%] border-r border-gray-200 dark:border-dark-200 overflow-y-auto">
                {instructors.map((instructor) => (
                  <button
                    key={instructor.id}
                    onClick={() => {
                      setSelectedInstructor(instructor)
                      fetchInstructorStudents(instructor.id)
                    }}
                    className={`w-full p-4 text-left border-b border-gray-100 dark:border-dark-100 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors ${
                      selectedInstructor?.id === instructor.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600' : ''
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-dark-900">{instructor.first_name} {instructor.last_name}</div>
                    <div className="text-sm text-gray-600 dark:text-dark-600 mt-1">{instructor.instructor_number || 'Brak numeru'}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">{instructor.email || 'Brak email'}</div>
                  </button>
                ))}
              </div>

              {/* Right side - Instructor students (70%) */}
              <div className="w-[70%] p-6 overflow-y-auto">
                {selectedInstructor ? (
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="bg-primary-100 dark:bg-primary-900/30 rounded-lg p-4 mr-4">
                        <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
                          {selectedInstructor.first_name} {selectedInstructor.last_name}
                        </h2>
                        <p className="text-gray-600 dark:text-dark-600 mt-1">{selectedInstructor.instructor_number || 'Brak numeru'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-900 mb-2 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Przypisani kursanci ({instructorStudents.length})
                        </h3>
                        {instructorStudents.length === 0 ? (
                          <p className="text-gray-600 dark:text-dark-600 text-sm">Brak przypisanych kursantów</p>
                        ) : (
                          <div className="space-y-2 mt-3">
                            {instructorStudents.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-200"
                              >
                                <div className="flex items-center">
                                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-dark-900">
                                      {student.first_name} {student.last_name}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-dark-600">
                                      {student.student_id}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900 dark:text-dark-900">
                                      {student.completed_hours || 0}/{student.required_hours || 30}h
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-dark-500">
                                      {Math.round(((student.completed_hours || 0) / (student.required_hours || 30)) * 100)}%
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    student.status === 'active' ? 'bg-green-100 text-green-800' :
                                    student.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                    student.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {student.status === 'active' ? 'Aktywny' :
                                     student.status === 'paused' ? 'Wstrzymany' :
                                     student.status === 'completed' ? 'Ukończony' :
                                     'Anulowany'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => {
                          setEditFormData({ ...editFormData, instructor_id: selectedInstructor.id })
                          setShowInstructorModal(false)
                        }}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Wybierz instruktora {selectedInstructor.first_name} {selectedInstructor.last_name}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-dark-500">
                    <p>Wybierz instruktora z listy po lewej stronie</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Wybierz kategorię prawa jazdy</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex h-[70vh]">
              {/* Left side - Category list (30%) */}
              <div className="w-[30%] border-r border-gray-200 dark:border-dark-200 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.code}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full p-4 text-left border-b border-gray-100 dark:border-dark-100 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors ${
                      selectedCategory?.code === category.code ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600' : ''
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-dark-900">{category.code}</div>
                    <div className="text-sm text-gray-600 dark:text-dark-600 mt-1">{category.name}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">{category.shortDesc}</div>
                  </button>
                ))}
              </div>

              {/* Right side - Category details (70%) */}
              <div className="w-[70%] p-6 overflow-y-auto">
                {selectedCategory ? (
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="bg-primary-100 dark:bg-primary-900/30 rounded-lg p-4 mr-4">
                        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{selectedCategory.code}</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-900">{selectedCategory.name}</h2>
                        <p className="text-gray-600 dark:text-dark-600 mt-1">{selectedCategory.shortDesc}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-900 mb-2 flex items-center">
                          <User className="h-5 w-5 mr-2" />
                          Wymagany wiek
                        </h3>
                        <p className="text-gray-700 dark:text-dark-900">{selectedCategory.age}</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-900 mb-2 flex items-center">
                          <Car className="h-5 w-5 mr-2" />
                          Jakimi pojazdami możesz kierować
                        </h3>
                        <p className="text-gray-700 dark:text-dark-900">{selectedCategory.vehicles}</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-900 mb-2 flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          Szczegółowy opis
                        </h3>
                        <p className="text-gray-700 dark:text-dark-900">{selectedCategory.fullDesc}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => {
                          setEditFormData({ ...editFormData, category: selectedCategory.code })
                          setShowCategoryModal(false)
                        }}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Wybierz kategorię {selectedCategory.code}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-dark-500">
                    <p>Wybierz kategorię z listy po lewej stronie</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentProfile
