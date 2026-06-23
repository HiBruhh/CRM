import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { useNavigate } from 'react-router-dom'
import { Car, Users, Plus, Search, Edit, Trash2, Phone, Mail, Clock, X, MapPin, User, FileText, Building2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Students = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [groupedStudents, setGroupedStudents] = useState([])
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showInstructorModal, setShowInstructorModal] = useState(false)
  const [selectedInstructor, setSelectedInstructor] = useState(null)
  const [instructorStudents, setInstructorStudents] = useState([])
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    category: 'B',
    status: 'active',
    instructor_id: '',
    completed_hours: 0,
    required_hours: 30,
    organization_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [organizations, setOrganizations] = useState([])

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

  useEffect(() => {
    fetchStudents()
    fetchInstructors()
  }, [user])

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select(`
          *,
          instructor:instructors(id, first_name, last_name),
          organization:organizations(id, name, slug)
        `)

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

      // Szef organizacji widzi tylko kursantów ze swojej organizacji
      if (user?.role === 'org_admin' && user?.organizationId) {
        query = query.eq('organization_id', user.organizationId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Dla każdego kursanta pobierz sumę godzin z zakończonych jazd
      const studentsWithHours = await Promise.all(
        (data || []).map(async (student) => {
          const { data: lessons } = await supabase
            .from('driving_lessons')
            .select('duration_minutes')
            .eq('student_id', student.id)
            .in('status', ['completed', 'in_progress'])

          const totalMinutes = lessons?.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0) || 0
          const totalHours = Math.round(totalMinutes / 60 * 10) / 10

          return {
            ...student,
            completed_hours: totalHours
          }
        })
      )

      // Group by organization for super-admin
      if (user?.isSuperAdmin) {
        const grouped = studentsWithHours.reduce((acc, student) => {
          const orgId = student.organization_id || 'no-org'
          const orgName = student.organization?.name || 'Brak organizacji'
          
          if (!acc[orgId]) {
            acc[orgId] = {
              id: orgId,
              name: orgName,
              slug: student.organization?.slug,
              students: []
            }
          }
          acc[orgId].students.push(student)
          return acc
        }, {})
        
        setGroupedStudents(Object.values(grouped))
        setStudents([])
      } else {
        setStudents(studentsWithHours)
        setGroupedStudents([])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, first_name, last_name, instructor_number')
        .eq('status', 'active')
        .order('last_name')

      if (error) throw error
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

  const generateStudentId = async () => {
    try {
      const { data: lastStudent } = await supabase
        .from('students')
        .select('student_id')
        .order('student_id', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastStudent?.student_id) {
        const lastNumber = parseInt(lastStudent.student_id.replace('KURS-', ''), 10)
        nextNumber = lastNumber + 1
      }

      return `KURS-${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating student ID:', error)
      return `KURS-0001`
    }
  }

  if (loading) {
    return <LoadingSpinner text="Ładowanie kursantów..." />
  }

  const filteredStudents = students.filter(student =>
    student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.includes(searchTerm)
  )

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

  const handleAddStudent = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const studentId = await generateStudentId()
      
      // Get organization_id from super admin selection, instructor or current user
      let organizationId = null
      if (user?.isSuperAdmin && formData.organization_id) {
        organizationId = formData.organization_id
      } else if (formData.instructor_id) {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('organization_id')
          .eq('id', formData.instructor_id)
          .single()
        organizationId = instructorData?.organization_id
      } else if (user?.organizationId) {
        organizationId = user.organizationId
      }

      const { error } = await supabase
        .from('students')
        .insert({
          student_id: studentId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          category: formData.category,
          status: formData.status,
          instructor_id: formData.instructor_id || null,
          required_hours: formData.required_hours,
          organization_id: organizationId
        })

      if (error) throw error

      toast.success('Kursant został dodany pomyślnie')
      setIsAdding(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        category: 'B',
        status: 'active',
        instructor_id: '',
        completed_hours: 0,
        required_hours: 30,
        organization_id: user?.isSuperAdmin ? '' : user?.organizationId || ''
      })
      fetchStudents()
    } catch (error) {
      console.error('Error adding student:', error)
      toast.error('Błąd podczas dodawania kursanta: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStudent = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Sprawdź czy instruktor się zmienił (uwzględnij null/undefined)
      const oldInstructorId = selectedStudent.instructor_id || null
      const newInstructorId = formData.instructor_id || null
      const instructorChanged = oldInstructorId !== newInstructorId
      
      const { error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          category: formData.category,
          status: formData.status,
          instructor_id: formData.instructor_id || null,
          required_hours: formData.required_hours
        })
        .eq('id', selectedStudent.id)

      if (error) throw error

      // Jeśli instruktor się zmienił, usuń zaplanowane jazdy kursanta
      if (instructorChanged) {
        console.log('Instructor changed, deleting scheduled lessons for student:', selectedStudent.id)
        const { error: deleteError } = await supabase
          .from('driving_lessons')
          .delete()
          .in('status', ['pending', 'confirmed'])
          .eq('student_id', selectedStudent.id)

        if (deleteError) {
          console.error('Error deleting scheduled lessons:', deleteError)
          toast.warning('Kursant został zaktualizowany, ale wystąpił błąd przy usuwaniu zaplanowanych jazd')
        } else {
          toast.success('Zaplanowane jazdy kursanta zostały usunięte')
        }
      }

      toast.success('Kursant został zaktualizowany pomyślnie')
      setShowEditModal(false)
      setSelectedStudent(null)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        category: 'B',
        status: 'active',
        instructor_id: '',
        completed_hours: 0,
        required_hours: 30
      })
      fetchStudents()
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('Błąd podczas aktualizacji kursanta: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddStudentClick = () => {
    setIsAdding(true)
    if (user?.isSuperAdmin && organizations.length === 0) fetchOrganizations()
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      category: 'B',
      status: 'active',
      instructor_id: '',
      completed_hours: 0,
      required_hours: 30,
      organization_id: user?.isSuperAdmin ? '' : user?.organizationId || ''
    })
    setSelectedCategory(categories.find(c => c.code === 'B'))
  }

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name', { ascending: true })
      
      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      category: 'B',
      status: 'active',
      instructor_id: '',
      completed_hours: 0,
      required_hours: 30,
      organization_id: ''
    })
    setSelectedCategory(null)
  }

  const handleDeleteStudent = async () => {
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', selectedStudent.id)

      if (error) throw error

      toast.success('Kursant został usunięty pomyślnie')
      setShowDeleteModal(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Błąd podczas usuwania kursanta: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (student) => {
    setSelectedStudent(student)
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone: student.phone,
      address: student.address || '',
      category: student.category,
      status: student.status,
      instructor_id: student.instructor_id || '',
      completed_hours: student.completed_hours || 0,
      required_hours: student.required_hours || 30
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Kursanci</h2>
            <p className="mt-1 text-gray-600">
              {isAdmin ? 'Zarządzaj wszystkimi kursantami' : 'Twoi przypisani kursanci'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleAddStudentClick}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj kursanta
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj po ID, nazwisku, telefonie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Add Student Inline Form */}
        {isAdding && (
          <div className="mb-6 bg-white rounded-lg shadow-lg p-6 animate-fade-in" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Dodaj kursanta</h3>
              <button
                onClick={handleCancelAdd}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user?.isSuperAdmin && (
                  <div className="flex items-center md:col-span-2 lg:col-span-3">
                    <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Organizacja</p>
                      <select
                        required
                        value={formData.organization_id}
                        onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        <option value="">Wybierz organizację</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Imię</p>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Nazwisko</p>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Adres</p>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Adres, Miejscowość, Kod pocztowy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Telefon</p>
                    <input
                      type="tel"
                      required
                      maxLength="9"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9)
                        const formatted = value.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
                        setFormData({ ...formData, phone: formatted })
                      }}
                      placeholder="xxx xxx xxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      <option value="active">Aktywny</option>
                      <option value="paused">Wstrzymany</option>
                      <option value="cancelled">Anulowany</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Kategoria</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(true)
                        setSelectedCategory(categories.find(c => c.code === formData.category))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      {categories.find(c => c.code === formData.category)?.name || 'Wybierz kategorię'} ({formData.category})
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Instruktor</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInstructorModal(true)
                        setSelectedInstructor(instructors.find(i => i.id === formData.instructor_id) || null)
                        if (formData.instructor_id) {
                          fetchInstructorStudents(formData.instructor_id)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      {instructors.find(i => i.id === formData.instructor_id) 
                        ? `${instructors.find(i => i.id === formData.instructor_id).first_name} ${instructors.find(i => i.id === formData.instructor_id).last_name} (${instructors.find(i => i.id === formData.instructor_id).instructor_number || '-'})`
                        : 'Wybierz instruktora'
                      }
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Wymagane godziny</p>
                    <input
                      type="number"
                      required
                      min="10"
                      max="60"
                      value={formData.required_hours}
                      onChange={(e) => setFormData({ ...formData, required_hours: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 animate-fade-in" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-all duration-200"
                >
                  {isSubmitting ? 'Dodawanie...' : 'Dodaj'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : user?.isSuperAdmin ? (
            // Grouped view for super-admin
            <div className="divide-y divide-gray-200">
              {groupedStudents.map((group) => (
                <div key={group.id} className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.students.length} kursantów</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kursant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kontakt
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Godziny
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Instruktor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data rozpoczęcia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Akcje
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.students.map((student) => (
                          <tr
                            key={student.id}
                            onClick={() => navigate(`/students/${student.id}`)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {student.first_name} {student.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{student.student_id}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center">
                                <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                {student.phone}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                {student.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(student.status)}`}>
                                {getStatusText(student.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                {student.completed_hours || 0}/{student.required_hours || 30}h
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-primary-600 h-2 rounded-full" 
                                  style={{ width: `${((student.completed_hours || 0) / (student.required_hours || 30)) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.instructor ? 
                                `${student.instructor.first_name} ${student.instructor.last_name}` : 
                                'Nieprzypisany'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(student.created_at).toLocaleDateString('pl-PL')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditModal(student)
                                }}
                                className="text-primary-600 hover:text-primary-900 mr-3"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDeleteModal(student)
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Regular view for admins and instructors
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kursant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Godziny
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instruktor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data rozpoczęcia
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akcje
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{student.student_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {student.phone}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {student.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(student.status)}`}>
                          {getStatusText(student.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {student.completed_hours || 0}/{student.required_hours || 30}h
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-primary-600 h-2 rounded-full" 
                            style={{ width: `${((student.completed_hours || 0) / (student.required_hours || 30)) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.instructor ? 
                          `${student.instructor.first_name} ${student.instructor.last_name}` : 
                          'Nieprzypisany'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.created_at).toLocaleDateString('pl-PL')}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(student); }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openDeleteModal(student); }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edytuj kursanta</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditStudent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID kursanta</label>
                  <input
                    type="text"
                    value={selectedStudent?.student_id || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    required
                    maxLength="9"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9)
                      const formatted = value.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
                      setFormData({ ...formData, phone: formatted })
                    }}
                    placeholder="xxx xxx xxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria prawa jazdy</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="B">Kat. B</option>
                    <option value="A">Kat. A</option>
                    <option value="AM">Kat. AM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instruktor</label>
                  <select
                    value={formData.instructor_id}
                    onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Brak instruktora</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.first_name} {instructor.last_name} ({instructor.instructor_number || '-'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wymagane godziny</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="60"
                    value={formData.required_hours}
                    onChange={(e) => setFormData({ ...formData, required_hours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="active">Aktywny</option>
                    <option value="paused">Wstrzymany</option>
                    <option value="completed">Ukończony</option>
                    <option value="cancelled">Anulowany</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Aktualizowanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Potwierdzenie usunięcia</h3>
              <p className="text-gray-600 mb-6">
                Czy na pewno chcesz usunąć kursanta {selectedStudent?.first_name} {selectedStudent?.last_name}? Ta operacja jest nieodwracalna.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Usuwanie...' : 'Usuń'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructor Selection Modal */}
      {showInstructorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Wybierz instruktora</h3>
              <button
                onClick={() => setShowInstructorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex h-[70vh]">
              {/* Left side - Instructor list (30%) */}
              <div className="w-[30%] border-r border-gray-200 overflow-y-auto">
                {instructors.map((instructor) => (
                  <button
                    key={instructor.id}
                    onClick={() => {
                      setSelectedInstructor(instructor)
                      fetchInstructorStudents(instructor.id)
                    }}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedInstructor?.id === instructor.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{instructor.first_name} {instructor.last_name}</div>
                    <div className="text-sm text-gray-600 mt-1">{instructor.instructor_number || 'Brak numeru'}</div>
                    <div className="text-xs text-gray-500 mt-1">{instructor.email || 'Brak email'}</div>
                  </button>
                ))}
              </div>

              {/* Right side - Instructor students (70%) */}
              <div className="w-[70%] p-6 overflow-y-auto">
                {selectedInstructor ? (
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="bg-primary-100 rounded-lg p-4 mr-4">
                        <User className="h-8 w-8 text-primary-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedInstructor.first_name} {selectedInstructor.last_name}
                        </h2>
                        <p className="text-gray-600 mt-1">{selectedInstructor.instructor_number || 'Brak numeru'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Przypisani kursanci ({instructorStudents.length})
                        </h3>
                        {instructorStudents.length === 0 ? (
                          <p className="text-gray-600 text-sm">Brak przypisanych kursantów</p>
                        ) : (
                          <div className="space-y-2 mt-3">
                            {instructorStudents.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center">
                                  <div className="bg-blue-100 rounded-lg p-2 mr-3">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {student.first_name} {student.last_name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {student.student_id}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.completed_hours || 0}/{student.required_hours || 30}h
                                    </div>
                                    <div className="text-xs text-gray-500">
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
                          setFormData({ ...formData, instructor_id: selectedInstructor.id })
                          setShowInstructorModal(false)
                        }}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Wybierz instruktora {selectedInstructor.first_name} {selectedInstructor.last_name}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
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
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Wybierz kategorię prawa jazdy</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex h-[70vh]">
              {/* Left side - Category list (30%) */}
              <div className="w-[30%] border-r border-gray-200 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.code}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedCategory?.code === category.code ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{category.code}</div>
                    <div className="text-sm text-gray-600 mt-1">{category.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{category.shortDesc}</div>
                  </button>
                ))}
              </div>

              {/* Right side - Category details (70%) */}
              <div className="w-[70%] p-6 overflow-y-auto">
                {selectedCategory ? (
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="bg-primary-100 rounded-lg p-4 mr-4">
                        <span className="text-2xl font-bold text-primary-600">{selectedCategory.code}</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedCategory.name}</h2>
                        <p className="text-gray-600 mt-1">{selectedCategory.shortDesc}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <User className="h-5 w-5 mr-2" />
                          Wymagany wiek
                        </h3>
                        <p className="text-gray-700">{selectedCategory.age}</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <Car className="h-5 w-5 mr-2" />
                          Jakimi pojazdami możesz kierować
                        </h3>
                        <p className="text-gray-700">{selectedCategory.vehicles}</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          Szczegółowy opis
                        </h3>
                        <p className="text-gray-700">{selectedCategory.fullDesc}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => {
                          setFormData({ ...formData, category: selectedCategory.code })
                          setShowCategoryModal(false)
                        }}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Wybierz
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Wybierz kategorię z listy po lewej
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

export default Students
