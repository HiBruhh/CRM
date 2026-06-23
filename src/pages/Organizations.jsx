import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { Building2, Plus, Edit, Trash2, Users, UserCog, User, X, AlertTriangle, ArrowLeft, MapPin, Mail, Phone, Crown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Organizations = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primary_color: '#4F46E5',
    max_instructors: 5,
    max_students: 100,
    subscription_plan: 'basic',
    
    // Admin data
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: ''
  })

  const [editData, setEditData] = useState({
    name: '',
    slug: '',
    primary_color: '#4F46E5',
    max_instructors: 5,
    max_students: 100,
    subscription_plan: 'basic',
    status: 'active'
  })

  useEffect(() => {
    if (!user) return
    if (!user?.isSuperAdmin) {
      navigate('/dashboard')
      return
    }
    fetchOrganizations()
  }, [user?.id, navigate])

  const fetchOrganizations = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_admins (
            id,
            first_name,
            last_name,
            email,
            status
          ),
          instructors!instructors_organization_id_fkey (
            count
          ),
          students!students_organization_id_fkey (
            count
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Błąd podczas pobierania organizacji')
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (e) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Zapamiętaj sesję super-admina przed signUp
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      // 1. Sprawdź czy user istnieje - jeśli tak, spróbuj się zalogować (fallback dla ponownej próby)
      let authUser = null
      const signUpResult = await supabase.auth.signUp({
        email: formData.admin_email,
        password: formData.admin_password,
        options: {
          data: {
            role: 'org_admin',
            first_name: formData.admin_first_name,
            last_name: formData.admin_last_name
          }
        }
      })

      authUser = signUpResult.data?.user
      let authError = signUpResult.error

      if (authError && (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('already exists'))) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: formData.admin_email,
          password: formData.admin_password
        })
        if (signInResult.error) {
          authError = signInResult.error
        } else {
          authUser = signInResult.data?.user
          authError = null
        }
      }

      if (authError) throw authError

      if (!authUser) throw new Error('Nie udało się utworzyć ani pobrać konta użytkownika')

      // 2. Przywróć sesję super-admina żeby kolejne operacje miały uprawnienia
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token
        })
      }

      // 3. Twórz organizację (jako super-admin)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          slug: formData.slug,
          primary_color: formData.primary_color,
          max_instructors: formData.max_instructors,
          max_students: formData.max_students,
          subscription_plan: formData.subscription_plan,
          status: 'active'
        })
        .select()
        .single()

      if (orgError) {
        toast.error('Błąd tworzenia organizacji: ' + orgError.message)
        setIsSubmitting(false)
        return
      }

      // 4. Powiąż admina z organizacją
      const { error: adminError } = await supabase
        .from('organization_admins')
        .insert({
          organization_id: orgData.id,
          auth_id: authUser.id,
          first_name: formData.admin_first_name,
          last_name: formData.admin_last_name,
          email: formData.admin_email,
          phone: formData.admin_phone,
          status: 'active'
        })

      if (adminError) {
        await supabase.from('organizations').delete().eq('id', orgData.id)
        throw adminError
      }

      // 5. Szef jest jednocześnie instruktorem - dodaj rekord w instructors
      const { error: instructorError } = await supabase
        .from('instructors')
        .insert({
          organization_id: orgData.id,
          auth_id: authUser.id,
          first_name: formData.admin_first_name,
          last_name: formData.admin_last_name,
          email: formData.admin_email,
          phone: formData.admin_phone,
          instructor_number: `SZEF-${Date.now().toString(36).toUpperCase()}`,
          status: 'active'
        })

      if (instructorError) {
        console.error('Błąd tworzenia instruktora dla szefa:', instructorError)
        toast.error('Konto szefa utworzone, ale nie dodano go jako instruktor: ' + instructorError.message)
      }

      toast.success('Organizacja i szef utworzeni pomyślnie!')
      setShowCreateModal(false)
      setFormData({
        name: '',
        slug: '',
        primary_color: '#4F46E5',
        max_instructors: 5,
        max_students: 100,
        subscription_plan: 'basic',
        admin_first_name: '',
        admin_last_name: '',
        admin_email: '',
        admin_password: '',
        admin_phone: ''
      })
      fetchOrganizations()
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error(error.message || 'Błąd podczas tworzenia organizacji')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [orgMembers, setOrgMembers] = useState([])
  const [showAddOwner, setShowAddOwner] = useState(false)

  const fetchOrgMembers = async (orgId) => {
    const { data } = await supabase
      .from('instructors')
      .select('id, first_name, last_name, email, auth_id')
      .eq('organization_id', orgId)
    setOrgMembers(data || [])
  }

  const openOrgDetail = (org) => {
    setSelectedOrg(org)
    setEditMode(false)
    setEditData({
      name: org.name,
      slug: org.slug,
      primary_color: org.primary_color || '#4F46E5',
      max_instructors: org.max_instructors,
      max_students: org.max_students,
      subscription_plan: org.subscription_plan,
      status: org.status
    })
    fetchOrgMembers(org.id)
  }

  const handleRemoveAdmin = async (admin) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { error } = await supabase.functions.invoke('demote-from-org-admin', {
        body: {
          adminId: admin.id,
          authId: admin.auth_id
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (error) throw error
      toast.success('Właściciel usunięty')
      // Refresh org data
      const { data: updatedOrg } = await supabase
        .from('organizations')
        .select(`*, organization_admins (id, first_name, last_name, email, status), instructors!instructors_organization_id_fkey (count), students!students_organization_id_fkey (count)`)
        .eq('id', selectedOrg.id)
        .single()
      if (updatedOrg) setSelectedOrg(updatedOrg)
      fetchOrganizations()
    } catch (error) {
      let errorMessage = error.message || 'Błąd usuwania właściciela'
      if (error.context) {
        try {
          const errorText = await error.context.text()
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorText || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
        } catch (e) {}
      }
      toast.error(errorMessage)
    }
  }

  const handlePromoteToAdmin = async (instructor) => {
    try {
      if (!instructor.auth_id) {
        toast.error('Ten instruktor nie ma powiązanego konta')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { error } = await supabase.functions.invoke('promote-to-org-admin', {
        body: {
          instructorId: instructor.id,
          organizationId: selectedOrg.id
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (error) throw error
      toast.success(`${instructor.first_name} ${instructor.last_name} awansowany na szefa organizacji`)
      setShowAddOwner(false)
      // Refresh
      const { data: updatedOrg } = await supabase
        .from('organizations')
        .select(`*, organization_admins (id, first_name, last_name, email, status), instructors!instructors_organization_id_fkey (count), students!students_organization_id_fkey (count)`)
        .eq('id', selectedOrg.id)
        .single()
      if (updatedOrg) setSelectedOrg(updatedOrg)
      fetchOrganizations()
    } catch (error) {
      let errorMessage = error.message || 'Błąd awansowania właściciela'
      if (error.context) {
        try {
          const errorText = await error.context.text()
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorText || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
        } catch (e) {}
      }
      toast.error(errorMessage)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editData.name,
          slug: editData.slug,
          primary_color: editData.primary_color,
          max_instructors: editData.max_instructors,
          max_students: editData.max_students,
          subscription_plan: editData.subscription_plan,
          status: editData.status
        })
        .eq('id', selectedOrg.id)

      if (error) throw error
      toast.success('Organizacja zaktualizowana')
      setSelectedOrg(null)
      setEditMode(false)
      fetchOrganizations()
    } catch (error) {
      toast.error(error.message || 'Błąd aktualizacji')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== selectedOrg.name) return
    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc('delete_organization_cascade', {
        target_org_id: selectedOrg.id
      })

      if (error) throw error
      toast.success('Organizacja, wszystkie dane i konta zostały usunięte')
      setSelectedOrg(null)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
      fetchOrganizations()
    } catch (error) {
      toast.error(error.message || 'Błąd usuwania')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      {/* Header */}
      <div className="bg-white dark:bg-dark-100 shadow-sm border-b dark:border-dark-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-dark-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">Organizacje</h1>
                <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
                  Zarządzaj ośrodkami szkolenia kierowców
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Utwórz organizację</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <div 
              key={org.id} 
              onClick={() => openOrgDetail(org)}
              className="bg-white dark:bg-dark-100 rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border border-transparent hover:border-primary-200 dark:hover:border-primary-800 group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: org.primary_color + '15' }}
                    >
                      <Building2 className="h-6 w-6" style={{ color: org.primary_color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-dark-900">{org.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-dark-600">{org.slug}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    org.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {org.status === 'active' ? 'Aktywna' : 'Nieaktywna'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 dark:bg-dark-200 rounded-lg">
                    <p className="text-lg font-bold text-gray-900 dark:text-dark-900">{org.instructors?.[0]?.count || 0}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-600">Instruktorzy</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-dark-200 rounded-lg">
                    <p className="text-lg font-bold text-gray-900 dark:text-dark-900">{org.students?.[0]?.count || 0}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-600">Kursanci</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-dark-200 rounded-lg">
                    <p className="text-xs font-bold text-gray-900 dark:text-dark-900 capitalize">{org.subscription_plan}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-600">Plan</p>
                  </div>
                </div>

                {org.organization_admins && org.organization_admins.length > 0 && (
                  <div className="border-t dark:border-dark-200 pt-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: org.primary_color + '20' }}>
                        <Crown className="h-3.5 w-3.5" style={{ color: org.primary_color }} />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-dark-700">
                        {org.organization_admins[0].first_name} {org.organization_admins[0].last_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center">
              <Building2 className="h-10 w-10 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-2">
              Brak organizacji
            </h3>
            <p className="text-gray-500 dark:text-dark-600 mb-6 max-w-sm mx-auto">
              Utwórz pierwszą organizację, aby rozpocząć zarządzanie ośrodkami
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Utwórz organizację</span>
            </button>
          </div>
        )}
      </main>

      {/* Organization Detail / Edit Drawer */}
      {selectedOrg && !showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => { setSelectedOrg(null); setEditMode(false) }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-dark-100 shadow-2xl overflow-y-auto animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with org color accent */}
            <div className="sticky top-0 z-10 bg-white dark:bg-dark-100 border-b dark:border-dark-200">
              <div className="h-2" style={{ backgroundColor: selectedOrg.primary_color }} />
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: selectedOrg.primary_color + '15' }}
                  >
                    <Building2 className="h-5 w-5" style={{ color: selectedOrg.primary_color }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-dark-900">
                      {editMode ? 'Edytuj organizację' : selectedOrg.name}
                    </h2>
                    {!editMode && <p className="text-sm text-gray-500 dark:text-dark-600">{selectedOrg.slug}</p>}
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedOrg(null); setEditMode(false) }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {editMode ? (
              /* Edit Form */
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Nazwa</label>
                  <input
                    type="text"
                    required
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Slug</label>
                  <input
                    type="text"
                    required
                    value={editData.slug}
                    onChange={(e) => setEditData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Kolor</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={editData.primary_color}
                        onChange={(e) => setEditData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                      />
                      <span className="text-sm text-gray-500 font-mono">{editData.primary_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                    >
                      <option value="active">Aktywna</option>
                      <option value="suspended">Zawieszona</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Maks. instruktorów</label>
                    <input
                      type="number"
                      min="1"
                      value={editData.max_instructors}
                      onChange={(e) => setEditData(prev => ({ ...prev, max_instructors: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Maks. kursantów</label>
                    <input
                      type="number"
                      min="1"
                      value={editData.max_students}
                      onChange={(e) => setEditData(prev => ({ ...prev, max_students: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1.5">Plan subskrypcji</label>
                  <select
                    value={editData.subscription_plan}
                    onChange={(e) => setEditData(prev => ({ ...prev, subscription_plan: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900"
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                {/* Właściciele / Szefowie organizacji */}
                <div className="border-t dark:border-dark-200 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-900 flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span>Właściciele</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddOwner(!showAddOwner)}
                      className="text-xs px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors font-medium"
                    >
                      {showAddOwner ? 'Anuluj' : '+ Dodaj'}
                    </button>
                  </div>

                  {/* Lista obecnych właścicieli */}
                  {selectedOrg.organization_admins && selectedOrg.organization_admins.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {selectedOrg.organization_admins.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                              style={{ backgroundColor: selectedOrg.primary_color }}
                            >
                              {admin.first_name[0]}{admin.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-900">
                                {admin.first_name} {admin.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-dark-600">{admin.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(admin)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Usuń z właścicieli"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-dark-600 italic mb-3">Brak przypisanych właścicieli</p>
                  )}

                  {/* Dodaj właściciela z listy instruktorów */}
                  {showAddOwner && (
                    <div className="bg-gray-50 dark:bg-dark-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-dark-600 font-medium mb-2">Wybierz instruktora do awansowania:</p>
                      {orgMembers.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {orgMembers
                            .filter(m => !selectedOrg.organization_admins?.some(a => a.email === m.email))
                            .map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handlePromoteToAdmin(member)}
                                className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-dark-100 transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-300 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-dark-700">
                                  {member.first_name[0]}{member.last_name[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-900">{member.first_name} {member.last_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-dark-600">{member.email}</p>
                                </div>
                              </button>
                            ))}
                          {orgMembers.filter(m => !selectedOrg.organization_admins?.some(a => a.email === m.email)).length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-dark-600 italic text-center py-2">Wszyscy instruktorzy są już właścicielami</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-dark-600 italic text-center py-2">Brak instruktorów w tej organizacji</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                  >
                    {isSubmitting ? 'Zapisuję...' : 'Zapisz zmiany'}
                  </button>
                </div>
              </form>
            ) : (
              /* Detail View */
              <div className="p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{selectedOrg.instructors?.[0]?.count || 0}</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">/ {selectedOrg.max_instructors}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Instruktorzy</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{selectedOrg.students?.[0]?.count || 0}</p>
                    <p className="text-xs text-purple-600/70 dark:text-purple-400/70">/ {selectedOrg.max_students}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Kursanci</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
                    <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300 capitalize">{selectedOrg.subscription_plan}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Plan</p>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-dark-600 uppercase tracking-wider">Informacje</h4>
                  <div className="space-y-2 bg-gray-50 dark:bg-dark-200 rounded-xl p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-dark-600">Status</span>
                      <span className={`font-medium ${selectedOrg.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {selectedOrg.status === 'active' ? 'Aktywna' : 'Nieaktywna'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-dark-600">Utworzona</span>
                      <span className="text-gray-900 dark:text-dark-900">{new Date(selectedOrg.created_at).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-dark-600">Kolor</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: selectedOrg.primary_color }} />
                        <span className="text-gray-900 dark:text-dark-900 font-mono text-xs">{selectedOrg.primary_color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Członkowie organizacji */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-dark-600 uppercase tracking-wider">
                    Członkowie organizacji
                  </h4>
                  <div className="bg-gray-50 dark:bg-dark-200 rounded-xl p-4 space-y-3">
                    {/* Szefowie / Właściciele */}
                    {selectedOrg.organization_admins && selectedOrg.organization_admins.length > 0 ? (
                      <div className="space-y-2">
                        {selectedOrg.organization_admins.map((admin) => (
                          <div key={admin.id} className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: selectedOrg.primary_color }}
                            >
                              {admin.first_name[0]}{admin.last_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                                {admin.first_name} {admin.last_name}
                              </p>
                              <div className="flex items-center space-x-1 mt-0.5">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-500 dark:text-dark-600 truncate">{admin.email}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Crown className="h-3 w-3 mr-1" />
                              Szef
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-dark-600 italic">Brak przypisanych szefów</p>
                    )}

                    {/* Instruktorzy - pomijamy szefów, którzy mają też rekord instruktora */}
                    {orgMembers.filter(m => !selectedOrg.organization_admins?.some(a => a.email === m.email)).length > 0 && (
                      <div className="border-t dark:border-dark-300 pt-3 space-y-2">
                        {orgMembers
                          .filter(m => !selectedOrg.organization_admins?.some(a => a.email === m.email))
                          .map((member) => (
                            <div key={member.id} className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-300 flex items-center justify-center text-gray-600 dark:text-dark-700 font-bold text-sm">
                                {member.first_name[0]}{member.last_name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                                  {member.first_name} {member.last_name}
                                </p>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <p className="text-xs text-gray-500 dark:text-dark-600 truncate">{member.email}</p>
                                </div>
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <User className="h-3 w-3 mr-1" />
                                Instruktor
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors font-medium"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edytuj organizację</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Usuń organizację</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedOrg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative bg-white dark:bg-dark-100 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-dark-900 mb-2">
              Usunąć organizację?
            </h3>
            <p className="text-sm text-center text-gray-500 dark:text-dark-600 mb-4">
              To działanie jest <span className="font-semibold text-red-600">nieodwracalne</span>. Usunięta zostanie organizacja, wraz z kontami szefa i instruktorów, kursantami, jazdami oraz wszystkimi powiązanymi danymi.
            </p>
            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                Wpisz <span className="font-bold">"{selectedOrg.name}"</span> aby potwierdzić:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={selectedOrg.name}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== selectedOrg.name || isSubmitting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? 'Usuwam...' : 'Usuń permanentnie'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div 
            className="relative bg-white dark:bg-dark-100 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b dark:border-dark-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-dark-900">Nowa organizacja</h2>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Krok 1: Organizacja */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-700 dark:text-primary-300">1</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-900 uppercase tracking-wide">Ośrodek</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Nazwa ośrodka</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleNameChange}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                      placeholder="np. OSK Tempo Kraków"
                    />
                    {formData.slug && (
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-dark-600">slug: <span className="font-mono">{formData.slug}</span></p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Kolor</label>
                      <div className="flex items-center space-x-2 px-3 py-2 border border-gray-200 dark:border-dark-300 rounded-xl">
                        <input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer"
                        />
                        <span className="text-xs text-gray-500 font-mono">{formData.primary_color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Plan</label>
                      <select
                        value={formData.subscription_plan}
                        onChange={(e) => setFormData(prev => ({ ...prev, subscription_plan: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm"
                      >
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Limity</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          value={formData.max_instructors}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_instructors: parseInt(e.target.value) }))}
                          className="w-full px-2 py-2.5 border border-gray-200 dark:border-dark-300 rounded-l-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm text-center"
                          title="Instruktorzy"
                        />
                        <input
                          type="number"
                          min="1"
                          value={formData.max_students}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) }))}
                          className="w-full px-2 py-2.5 border border-gray-200 dark:border-dark-300 rounded-r-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 text-sm text-center"
                          title="Kursanci"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-center">instr. / kurs.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Krok 2: Szef */}
              <div className="border-t dark:border-dark-200 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-bold text-amber-700 dark:text-amber-300">2</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-900 uppercase tracking-wide">Szef ośrodka</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Imię</label>
                      <input
                        type="text"
                        required
                        value={formData.admin_first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, admin_first_name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                        placeholder="Jan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Nazwisko</label>
                      <input
                        type="text"
                        required
                        value={formData.admin_last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, admin_last_name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                        placeholder="Kowalski"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Email logowania</label>
                    <input
                      type="email"
                      required
                      value={formData.admin_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                      placeholder="jan.kowalski@osk-tempo.pl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Hasło</label>
                      <input
                        type="password"
                        required
                        minLength="6"
                        value={formData.admin_password}
                        onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                        placeholder="min. 6 znaków"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-dark-700 mb-1.5">Telefon</label>
                      <input
                        type="tel"
                        value={formData.admin_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, admin_phone: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-dark-200 dark:text-dark-900 transition-colors"
                        placeholder="+48 ..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t dark:border-dark-200 bg-gray-50 dark:bg-dark-200/50 rounded-b-2xl flex space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-xl text-gray-700 dark:text-dark-700 hover:bg-white dark:hover:bg-dark-100 transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                type="submit"
                form="create-org-form"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector('form[class*="overflow-y-auto"]')?.requestSubmit()
                }}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
              >
                {isSubmitting ? 'Tworzę...' : 'Utwórz ośrodek'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Organizations
