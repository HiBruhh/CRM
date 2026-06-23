import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { useNavigate } from 'react-router-dom'
import { Car, Users, Plus, Search, Edit, Trash2, Phone, Mail, X, Building2, User, Lock, Award, Shield, Briefcase, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const Instructors = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [instructors, setInstructors] = useState([])
  const [groupedInstructors, setGroupedInstructors] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedInstructor, setSelectedInstructor] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    license_number: '',
    status: 'active',
    organization_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [organizations, setOrganizations] = useState([])

  useEffect(() => {
    if (!user?.id) return
    fetchInstructors()
    if (user?.isSuperAdmin) fetchOrganizations()
  }, [user?.id])

  const fetchInstructors = async () => {
    setLoading(true)
    try {
      const { data: instructorsData, error } = await supabase
        .from('instructors')
        .select(`
          *,
          organization:organizations(id, name, slug)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch students and driving lessons counts for each instructor
      const instructorsWithCounts = await Promise.all(
        (instructorsData || []).map(async (instructor) => {
          const [{ count: studentsCount }, { count: drivingLessonsCount }] = await Promise.all([
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('instructor_id', instructor.id),
            supabase
              .from('driving_lessons')
              .select('*', { count: 'exact', head: true })
              .eq('instructor_id', instructor.id)
              .in('status', ['completed', 'in_progress'])
          ])

          return {
            ...instructor,
            students: { count: studentsCount || 0 },
            driving_lessons: { count: drivingLessonsCount || 0 }
          }
        })
      )

      // Group by organization for super-admin
      if (user?.isSuperAdmin) {
        const grouped = instructorsWithCounts.reduce((acc, instructor) => {
          const orgId = instructor.organization_id || 'no-org'
          const orgName = instructor.organization?.name || 'Brak organizacji'
          
          if (!acc[orgId]) {
            acc[orgId] = {
              id: orgId,
              name: orgName,
              slug: instructor.organization?.slug,
              instructors: []
            }
          }
          acc[orgId].instructors.push(instructor)
          return acc
        }, {})
        
        setGroupedInstructors(Object.values(grouped))
        setInstructors([])
      } else {
        setInstructors(instructorsWithCounts)
        setGroupedInstructors([])
      }
    } catch (error) {
      console.error('Error fetching instructors:', error)
    } finally {
      setLoading(false)
    }
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

  const filteredInstructors = instructors.filter(instructor =>
    instructor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.phone.includes(searchTerm)
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'vacation': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktywny'
      case 'inactive': return 'Nieaktywny'
      case 'vacation': return 'Urlop'
      default: return 'Nieznany'
    }
  }

  const handleAddInstructor = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Wywołaj Edge Function do tworzenia instruktora
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { data, error } = await supabase.functions.invoke('create-instructor', {
        body: {
          ...formData,
          organization_id: user?.isSuperAdmin ? formData.organization_id : user?.organizationId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (error) throw error

      toast.success('Instruktor został dodany pomyślnie')
      setShowAddModal(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        license_number: '',
        status: 'active',
        organization_id: ''
      })
      fetchInstructors()
    } catch (error) {
      // Odczytaj response body z error.context
      let errorMessage = 'Edge Function returned a non-2xx status code'
      if (error.context) {
        try {
          const errorText = await error.context.text()
          // Parsuj JSON jeśli response body jest w formacie JSON
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorText || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
        } catch (e) {
          console.error('Could not read response body:', e)
        }
      }
      
      // Sprawdź czy błąd to duplikat emaila
      if (errorMessage.includes('Instruktor z tym emailem już istnieje') || 
          errorMessage.includes('email')) {
        toast.error('Instruktor z tym emailem już istnieje')
      } else {
        toast.error('Błąd podczas dodawania instruktora: ' + errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditInstructor = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('instructors')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          license_number: formData.license_number,
          status: formData.status
        })
        .eq('id', selectedInstructor.id)

      if (error) throw error

      toast.success('Instruktor został zaktualizowany pomyślnie')
      setShowEditModal(false)
      setSelectedInstructor(null)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        license_number: '',
        status: 'active'
      })
      fetchInstructors()
    } catch (error) {
      console.error('Error updating instructor:', error)
      toast.error('Błąd podczas aktualizacji instruktora: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInstructor = async () => {
    setIsSubmitting(true)

    try {
      // Wywołaj Edge Function do usuwania instruktora
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { data, error } = await supabase.functions.invoke('delete-instructor', {
        body: {
          instructorId: selectedInstructor.id,
          authId: selectedInstructor.auth_id
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (error) throw error

      toast.success('Instruktor został usunięty pomyślnie')
      setShowDeleteModal(false)
      setSelectedInstructor(null)
      fetchInstructors()
    } catch (error) {
      console.error('Error deleting instructor:', error)
      toast.error('Błąd podczas usuwania instruktora: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (instructor) => {
    setSelectedInstructor(instructor)
    setFormData({
      first_name: instructor.first_name,
      last_name: instructor.last_name,
      email: instructor.email,
      password: '',
      phone: instructor.phone,
      license_number: instructor.license_number,
      status: instructor.status
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (instructor) => {
    setSelectedInstructor(instructor)
    setShowDeleteModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Instruktorzy</h2>
            <p className="mt-1 text-gray-600">
              Zarządzaj instruktorami w szkole jazdy
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj instruktora
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj po nazwisku, emailu, telefonie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Instructors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : user?.isSuperAdmin ? (
            // Grouped view for super-admin
            <div className="divide-y divide-gray-200">
              {groupedInstructors.map((group) => (
                <div key={group.id} className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.instructors.length} instruktorów</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Numer instruktora
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Instruktor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kontakt
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statystyki
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data dołączenia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Akcje
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.instructors.map((instructor) => (
                          <tr 
                            key={instructor.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/instructors/${instructor.id}`)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {instructor.instructor_number || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <span className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                                  {instructor.first_name} {instructor.last_name}
                                </span>
                                <div className="text-sm text-gray-500">
                                  {instructor.license_number}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center">
                                <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                {instructor.phone}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                {instructor.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(instructor.status)}`}>
                                {getStatusText(instructor.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                Kursanci: {instructor.students?.count || 0}
                              </div>
                              <div className="text-sm text-gray-500">
                                Jazdy: {instructor.driving_lessons?.count || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(instructor.created_at).toLocaleDateString('pl-PL')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditModal(instructor)
                                  }}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDeleteModal(instructor)
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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
            // Regular view for admins
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numer instruktora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instruktor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statystyki
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data dołączenia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInstructors.map((instructor) => (
                    <tr 
                      key={instructor.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/instructors/${instructor.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {instructor.instructor_number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                            {instructor.first_name} {instructor.last_name}
                          </span>
                          <div className="text-sm text-gray-500">
                            {instructor.license_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {instructor.phone}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {instructor.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(instructor.status)}`}>
                          {getStatusText(instructor.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Kursanci: {instructor.students?.count || 0}
                        </div>
                        <div className="text-sm text-gray-500">
                          Jazdy: {instructor.driving_lessons?.count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(instructor.created_at).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(instructor)
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteModal(instructor)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Instructor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dodaj instruktora</h3>
                  <p className="text-sm text-gray-500">Utwórz nowe konto instruktora w systemie</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddInstructor} className="p-6">
              {user?.isSuperAdmin && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <label className="flex items-center text-sm font-semibold text-amber-900 mb-2">
                    <Building2 className="h-4 w-4 mr-2" />
                    Organizacja docelowa
                  </label>
                  <select
                    required
                    value={formData.organization_id}
                    onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  >
                    <option value="">Wybierz organizację</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
                  Dane osobowe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="Jan"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="Kowalski"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        placeholder="jan.kowalski@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        required
                        placeholder="123 456 789"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Dane logowania
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hasło</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Minimum 6 znaków"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">Hasło musi mieć co najmniej 6 znaków. Instruktor może je później zmienić w profilu.</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  Dane zawodowe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Numer licencji</label>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="np. LIC-12345"
                        value={formData.license_number}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <div className="relative">
                      <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm appearance-none bg-white"
                      >
                        <option value="active">Aktywny</option>
                        <option value="inactive">Nieaktywny</option>
                        <option value="vacation">Urlop</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      Dodawanie...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Dodaj instruktora
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Instructor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Edit className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edytuj instruktora</h3>
                  <p className="text-sm text-gray-500">Zaktualizuj dane instruktora</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditInstructor} className="p-6">
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
                  Dane osobowe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  Dane zawodowe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Numer licencji</label>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.license_number}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <div className="relative">
                      <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm appearance-none bg-white"
                      >
                        <option value="active">Aktywny</option>
                        <option value="inactive">Nieaktywny</option>
                        <option value="vacation">Urlop</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      Aktualizowanie...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Zapisz zmiany
                    </>
                  )}
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
                Czy na pewno chcesz usunąć instruktora {selectedInstructor?.first_name} {selectedInstructor?.last_name}? Ta operacja jest nieodwracalna.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteInstructor}
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
    </div>
  )
}

export default Instructors
