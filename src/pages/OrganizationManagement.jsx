import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import { Building2, Edit, Save, Users, UserCog, Car, Fuel, Calendar, ArrowLeft, Loader2, Upload, KeyRound, Crown, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const setPrimaryColorVariables = (hex) => {
  const root = document.documentElement
  root.style.setProperty('--color-primary-50', `color-mix(in srgb, ${hex} 5%, white)`)
  root.style.setProperty('--color-primary-100', `color-mix(in srgb, ${hex} 15%, white)`)
  root.style.setProperty('--color-primary-200', `color-mix(in srgb, ${hex} 30%, white)`)
  root.style.setProperty('--color-primary-300', `color-mix(in srgb, ${hex} 50%, white)`)
  root.style.setProperty('--color-primary-400', `color-mix(in srgb, ${hex} 70%, white)`)
  root.style.setProperty('--color-primary-500', `color-mix(in srgb, ${hex} 85%, white)`)
  root.style.setProperty('--color-primary-600', hex)
  root.style.setProperty('--color-primary-700', `color-mix(in srgb, ${hex} 70%, black)`)
  root.style.setProperty('--color-primary-800', `color-mix(in srgb, ${hex} 50%, black)`)
  root.style.setProperty('--color-primary-900', `color-mix(in srgb, ${hex} 30%, black)`)
}

const OrganizationManagement = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [organization, setOrganization] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ name: '', logo_url: '', primary_color: '#4F46E5' })
  const [instructors, setInstructors] = useState([])
  const [resettingId, setResettingId] = useState(null)
  const fileInputRef = useRef(null)
  const [stats, setStats] = useState({
    instructors: 0,
    students: 0,
    vehicles: 0,
    totalLessons: 0,
    completedLessons: 0,
    totalFuelCost: 0,
    fuelReportsCount: 0
  })

  useEffect(() => {
    if (!user?.organizationId) {
      setLoading(false)
      return
    }
    loadOrganization()
    loadStats()
    loadInstructors()
  }, [user?.organizationId])

  const loadOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, primary_color, max_instructors, max_students, subscription_plan, status')
        .eq('id', user.organizationId)
        .single()
      if (error) throw error
      setOrganization(data)
      setFormData({ name: data.name, logo_url: data.logo_url || '', primary_color: data.primary_color || '#4F46E5' })
    } catch (error) {
      console.error('Error loading organization:', error)
      toast.error('Błąd podczas ładowania organizacji')
    }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      const orgId = user.organizationId

      const { count: instructorsCount } = await supabase
        .from('instructors')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const { count: totalLessons } = await supabase
        .from('driving_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const { count: completedLessons } = await supabase
        .from('driving_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'completed')

      const { data: fuelData } = await supabase
        .from('fuel_reports')
        .select('total_cost')
        .eq('organization_id', orgId)

      const totalFuelCost = fuelData?.reduce((sum, r) => sum + Number(r.total_cost || 0), 0) || 0

      setStats({
        instructors: instructorsCount || 0,
        students: studentsCount || 0,
        vehicles: vehiclesCount || 0,
        totalLessons: totalLessons || 0,
        completedLessons: completedLessons || 0,
        totalFuelCost,
        fuelReportsCount: fuelData?.length || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Błąd podczas ładowania statystyk')
    } finally {
      setLoading(false)
    }
  }

  const loadInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('id, first_name, last_name, email, phone, status, auth_id, created_at')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setInstructors(data || [])
    } catch (error) {
      console.error('Error loading instructors:', error)
      toast.error('Błąd podczas ładowania instruktorów')
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Wybierz plik graficzny')
      return
    }
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const path = `${organization.id}/logo.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(path)
      const logoUrl = urlData.publicUrl
      setFormData(prev => ({ ...prev, logo_url: logoUrl }))
      toast.success('Logo przesłane. Kliknij „Zapisz zmiany", aby je zastosować.')
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error(error.message || 'Błąd podczas przesyłania logo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!organization) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color
        })
        .eq('id', organization.id)

      if (error) throw error
      setPrimaryColorVariables(formData.primary_color)
      window.dispatchEvent(new CustomEvent('organization-updated', {
        detail: { name: formData.name, logo_url: formData.logo_url, primary_color: formData.primary_color }
      }))
      toast.success('Organizacja zaktualizowana')
      setEditMode(false)
      loadOrganization()
      loadStats()
    } catch (error) {
      toast.error(error.message || 'Błąd aktualizacji')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (instructor) => {
    if (!instructor.email) {
      toast.error('Instruktor nie ma adresu email')
      return
    }
    setResettingId(instructor.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const { error } = await supabase.functions.invoke('reset-employee-password', {
        body: { instructorId: instructor.id },
        headers: { Authorization: `Bearer ${token}` }
      })
      if (error) throw error
      toast.success(`Wysłano link resetujący hasło na ${instructor.email}`)
    } catch (error) {
      let errorMessage = error.message || 'Błąd resetowania hasła'
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
    } finally {
      setResettingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center">
        <p className="text-gray-500 dark:text-dark-600">Brak organizacji</p>
      </div>
    )
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value)
  }

  const isOwner = (instructor) => instructors.some(i => i.auth_id === user.id && i.id === instructor.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-dark-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">Moja organizacja</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-dark-200 flex items-center justify-center overflow-hidden bg-white dark:bg-dark-100">
                  {organization.logo_url ? (
                    <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-900">{organization.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-dark-600">Plan: {organization.subscription_plan}</p>
                </div>
              </div>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors font-medium"
              >
                <Edit className="h-4 w-4" />
                <span>{editMode ? 'Anuluj' : 'Edytuj'}</span>
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">Nazwa organizacji</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">Logo</label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors font-medium disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{uploading ? 'Przesyłanie...' : 'Wybierz plik'}</span>
                    </button>
                    {formData.logo_url && (
                      <div className="p-2 border border-gray-200 dark:border-dark-300 rounded-lg">
                        <img src={formData.logo_url} alt="Podgląd" className="h-10 w-auto object-contain" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Zdjęcie zostanie przesłane na serwer i zamienione na link.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">Kolor akcentu</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                    />
                    <span className="text-sm font-mono text-gray-900 dark:text-dark-900">{formData.primary_color}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Kolor zastąpi domyślny niebieski akcent w aplikacji.</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Zapisywanie...' : 'Zapisz zmiany'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm border-b border-gray-100 dark:border-dark-200 pb-2">
                  <span className="text-gray-500 dark:text-dark-600">Status</span>
                  <span className={`font-medium ${organization.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {organization.status === 'active' ? 'Aktywna' : 'Nieaktywna'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-100 dark:border-dark-200 pb-2">
                  <span className="text-gray-500 dark:text-dark-600">Limity</span>
                  <span className="font-medium text-gray-900 dark:text-dark-900">{organization.max_instructors} instruktorów / {organization.max_students} kursantów</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-dark-600">Kolor marki</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: organization.primary_color }} />
                    <span className="font-mono text-xs text-gray-900 dark:text-dark-900">{organization.primary_color}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-600 uppercase tracking-wider mb-4">Podsumowanie</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">Instruktorzy</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.instructors}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-purple-600 dark:text-purple-400">Kursanci</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.students}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Car className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Pojazdy</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.vehicles}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">Jazdy</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.completedLessons}/{stats.totalLessons}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-600 uppercase tracking-wider mb-4">Koszty</h3>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Fuel className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-red-600 dark:text-red-400">Paliwo</span>
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(stats.totalFuelCost)}</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">{stats.fuelReportsCount} raportów</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructors / Employees */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-900">Instruktorzy / Pracownicy</h3>
            <span className="text-sm text-gray-500 dark:text-dark-600">{instructors.length} osób</span>
          </div>
          {instructors.length === 0 ? (
            <p className="text-gray-500 dark:text-dark-600 text-center py-8">Brak instruktorów w organizacji</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b dark:border-dark-200 text-xs uppercase text-gray-500 dark:text-dark-600">
                    <th className="pb-3 font-medium">Imię i nazwisko</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Telefon</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-dark-200">
                  {instructors.map((instructor) => (
                    <tr key={instructor.id} className="group">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">
                            {instructor.first_name[0]}{instructor.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-dark-900">{instructor.first_name} {instructor.last_name}</p>
                            {isOwner(instructor) && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <Crown className="h-3 w-3" /> Szef
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-dark-700">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {instructor.email || '—'}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-700 dark:text-dark-700">{instructor.phone || '—'}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          instructor.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-dark-200 dark:text-dark-600'
                        }`}>
                          {instructor.status === 'active' ? 'Aktywny' : 'Nieaktywny'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleResetPassword(instructor)}
                          disabled={resettingId === instructor.id || !instructor.email}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {resettingId === instructor.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                          Reset hasła
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrganizationManagement
