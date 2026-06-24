import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  fetchVehicles,
  fetchAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  fetchFuelCostSummary,
  fetchFuelCostSummaryAll,
  parseVehicleDocument,
  getVehicleAlert,
  getVehicleAlertText
} from '../services/fleetService'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatLocalDate, formatLocalTime } from '../utils/timeHelpers'
import {
  Car,
  Plus,
  Upload,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Fuel,
  Camera,
  Search,
  AlertCircle,
  Building2
} from 'lucide-react'

const emptyVehicle = {
  brand: '',
  model: '',
  production_year: new Date().getFullYear(),
  registration_plate: '',
  vin: '',
  engine_capacity: '',
  fuel_type: 'benzyna',
  transmission: 'manual',
  license_category: 'B',
  status: 'active',
  insurance_expiry: '',
  inspection_expiry: ''
}

const fuelTypes = ['benzyna', 'diesel', 'LPG', 'EV', 'hybryda']
const transmissions = ['manual', 'automat']
const categories = ['AM', 'A', 'A1', 'A2', 'B', 'B+E', 'C', 'C+E', 'D', 'D+E']
const statuses = ['active', 'inactive', 'service']

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value || 0)
}

const VehicleCard = ({ vehicle, fuelCost, onClick, onEdit, onDelete }) => {
  const alert = getVehicleAlert(vehicle)
  const alertText = getVehicleAlertText(vehicle)

  return (
    <div
      key={vehicle.id}
      data-alert={alert || undefined}
      onClick={onClick}
      className={`bg-white dark:bg-dark-100 rounded-xl border overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${
        alert === 'danger'
          ? 'border-red-300 dark:border-red-700'
          : alert === 'warning'
            ? 'border-yellow-300 dark:border-yellow-700'
            : 'border-gray-200 dark:border-dark-200'
      }`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              alert === 'danger'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : alert === 'warning'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
            }`}>
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-dark-900">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-500">{vehicle.registration_plate}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(vehicle)
              }}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(vehicle.id)
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {alert && (
          <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-sm ${
            alert === 'danger'
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{alertText}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-gray-50 dark:bg-dark-200/50 p-3 rounded-lg">
            <p className="text-gray-500 dark:text-dark-500">Rok produkcji</p>
            <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.production_year || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-200/50 p-3 rounded-lg">
            <p className="text-gray-500 dark:text-dark-500">Kategoria</p>
            <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.license_category || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-200/50 p-3 rounded-lg">
            <p className="text-gray-500 dark:text-dark-500">Paliwo / Skrzynia</p>
            <p className="font-medium text-gray-900 dark:text-dark-900 capitalize">{vehicle.fuel_type || '-'} / {vehicle.transmission || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-200/50 p-3 rounded-lg">
            <p className="text-gray-500 dark:text-dark-500">Status</p>
            <p className="font-medium text-gray-900 dark:text-dark-900">
              {vehicle.status === 'active' ? 'Aktywny' : vehicle.status === 'service' ? 'Serwis' : 'Nieaktywny'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-200">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-600">
            <Fuel className="h-4 w-4" />
            <span>Koszt paliwa:</span>
            <span className="font-semibold text-gray-900 dark:text-dark-900">{formatCurrency(fuelCost)}</span>
          </div>
          {vehicle.vin && (
            <span className="text-xs text-gray-400 dark:text-dark-500 font-mono">VIN: {vehicle.vin}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const Fleet = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [vehicles, setVehicles] = useState([])
  const [fuelCosts, setFuelCosts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyVehicle)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')

  const organizationId = user?.organizationId
  const isBoss = user?.role === 'org_admin' || user?.isSuperAdmin || user?.role === 'super_admin'

  useEffect(() => {
    if (user?.isSuperAdmin && organizations.length === 0) {
      fetchOrganizations()
    }
    loadData()
  }, [organizationId, user?.isSuperAdmin])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name', { ascending: true })
      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Błąd ładowania organizacji:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      let vehicleList, costSummary
      if (user?.isSuperAdmin) {
        [vehicleList, costSummary] = await Promise.all([
          fetchAllVehicles(),
          fetchFuelCostSummaryAll()
        ])
      } else {
        if (!organizationId) {
          setLoading(false)
          return
        }
        [vehicleList, costSummary] = await Promise.all([
          fetchVehicles(organizationId),
          fetchFuelCostSummary(organizationId)
        ])
      }
      setVehicles(vehicleList)
      setFuelCosts(costSummary)
    } catch (error) {
      console.error('Błąd ładowania floty:', error)
      toast.error('Nie udało się załadować floty')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    if (user?.isSuperAdmin && organizations.length === 0) fetchOrganizations()
    setFormData({
      ...emptyVehicle,
      organization_id: user?.isSuperAdmin ? '' : organizationId
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleOpenEdit = (vehicle) => {
    setEditingId(vehicle.id)
    if (user?.isSuperAdmin && organizations.length === 0) fetchOrganizations()
    setFormData({
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      production_year: vehicle.production_year || new Date().getFullYear(),
      registration_plate: vehicle.registration_plate || '',
      vin: vehicle.vin || '',
      engine_capacity: vehicle.engine_capacity || '',
      fuel_type: vehicle.fuel_type || 'benzyna',
      transmission: vehicle.transmission || 'manual',
      license_category: vehicle.license_category || 'B',
      status: vehicle.status || 'active',
      insurance_expiry: vehicle.insurance_expiry || '',
      inspection_expiry: vehicle.inspection_expiry || '',
      organization_id: vehicle.organization_id || ''
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setIsScanning(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.brand.trim()) errors.brand = 'Podaj markę'
    if (!formData.model.trim()) errors.model = 'Podaj model'
    if (!formData.registration_plate.trim()) errors.registration_plate = 'Podaj numer rejestracyjny'
    if (formData.production_year && (formData.production_year < 1900 || formData.production_year > 2100)) {
      errors.production_year = 'Niepoprawny rok'
    }
    if (user?.isSuperAdmin && !formData.organization_id) {
      errors.organization_id = 'Wybierz organizację'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        organization_id: user?.isSuperAdmin ? formData.organization_id : organizationId,
        production_year: formData.production_year ? Number(formData.production_year) : null,
        insurance_expiry: formData.insurance_expiry || null,
        inspection_expiry: formData.inspection_expiry || null
      }
      if (editingId) {
        await updateVehicle(editingId, payload)
        toast.success('Pojazd zaktualizowany')
      } else {
        await createVehicle(payload)
        toast.success('Pojazd dodany')
      }
      handleCloseModal()
      loadData()
    } catch (error) {
      console.error('Błąd zapisu pojazdu:', error)
      toast.error(error.message || 'Błąd zapisu pojazdu')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (id) => {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteVehicle(deleteId)
      toast.success('Pojazd usunięty')
      setShowDeleteModal(false)
      loadData()
    } catch (error) {
      console.error('Błąd usuwania pojazdu:', error)
      toast.error('Nie udało się usunąć pojazdu')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Wybierz plik graficzny')
      return
    }

    setIsScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const dataUrl = `data:${file.type};base64,${base64}`
      const result = await parseVehicleDocument(dataUrl)
      if (result?.data) {
        setFormData(prev => ({
          ...prev,
          brand: result.data.brand || prev.brand,
          model: result.data.model || prev.model,
          production_year: result.data.production_year || prev.production_year,
          registration_plate: result.data.registration_plate || prev.registration_plate,
          vin: result.data.vin || prev.vin,
          engine_capacity: result.data.engine_capacity || prev.engine_capacity,
          fuel_type: fuelTypes.includes(result.data.fuel_type) ? result.data.fuel_type : prev.fuel_type,
          transmission: transmissions.includes(result.data.transmission) ? result.data.transmission : prev.transmission,
          license_category: categories.includes(result.data.license_category) ? result.data.license_category : prev.license_category,
          insurance_expiry: result.data.insurance_expiry || prev.insurance_expiry,
          inspection_expiry: result.data.inspection_expiry || prev.inspection_expiry
        }))
        toast.success('Dane z dowodu odczytane. Sprawdź i popraw jeśli trzeba.')
      } else {
        throw new Error('Brak danych w odpowiedzi')
      }
    } catch (error) {
      console.error('Błąd OCR:', error)
      toast.error('Nie udało się odczytać dowodu. Spróbuj ponownie.')
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1]
        if (base64) resolve(base64)
        else reject(new Error('Błąd konwersji pliku'))
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const filteredVehicles = vehicles.filter(v => {
    const term = search.toLowerCase()
    const matchesSearch = (
      v.brand?.toLowerCase().includes(term) ||
      v.model?.toLowerCase().includes(term) ||
      v.registration_plate?.toLowerCase().includes(term) ||
      v.vin?.toLowerCase().includes(term)
    )
    if (!matchesSearch) return false
    if (user?.isSuperAdmin && selectedOrg) {
      return v.organization_id === selectedOrg
    }
    return true
  })

  const groupedVehicles = user?.isSuperAdmin
    ? filteredVehicles.reduce((acc, v) => {
        const orgId = v.organization_id || 'no-org'
        const orgName = v.organization?.name || 'Brak organizacji'
        if (!acc[orgId]) acc[orgId] = { name: orgName, vehicles: [] }
        acc[orgId].vehicles.push(v)
        return acc
      }, {})
    : null

  if (loading) return <LoadingSpinner text="Ładowanie floty..." />

  if (!isBoss) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600 dark:text-dark-600">Tylko Szef OSK może zarządzać flotą.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              {user?.isSuperAdmin ? 'Flota - wszystkie organizacje' : 'Moja Flota'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-dark-500">
              {user?.isSuperAdmin ? 'Podgląd pojazdów we wszystkich organizacjach' : 'Zarządzaj pojazdami, ubezpieczeniami i kosztami paliwa'}
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Dodaj pojazd
          </button>
        </div>

        {/* Search & organization filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po marce, modelu, numerze rejestracyjnym lub VIN..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {user?.isSuperAdmin && (
            <div className="flex items-center gap-2 sm:w-72">
              <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Wszystkie organizacje</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Vehicles grid */}
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-200">
            <Car className="h-12 w-12 text-gray-300 dark:text-dark-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900">Brak pojazdów</h3>
            <p className="text-gray-500 dark:text-dark-500 mb-4">Dodaj pierwszy pojazd do floty</p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Dodaj pojazd
            </button>
          </div>
        ) : user?.isSuperAdmin ? (
          <div className="space-y-10">
            {Object.entries(groupedVehicles).map(([orgId, group]) => (
              <div key={orgId}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-gray-400" />
                  {group.name}
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-dark-500">({group.vehicles.length})</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {group.vehicles.map(vehicle => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      fuelCost={fuelCosts[vehicle.id] || 0}
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                      onEdit={handleOpenEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                fuelCost={fuelCosts[vehicle.id] || 0}
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                  {editingId ? 'Edytuj pojazd' : 'Dodaj pojazd'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-500">
                  {editingId ? 'Zmień dane pojazdu' : 'Wypełnij formularz ręcznie lub zeskanuj dowód'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* OCR scan button */}
              {!editingId && (
                <div className="p-4 border border-dashed border-primary-300 dark:border-primary-700 rounded-xl bg-primary-50 dark:bg-primary-900/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                        <Camera className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-dark-900">Zeskanuj dowód rejestracyjny</p>
                        <p className="text-sm text-gray-500 dark:text-dark-500">AI odczyta dane i wypełni formularz</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isScanning}
                      className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                    >
                      {isScanning ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Odczytuję...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Skanuj
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user?.isSuperAdmin && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Organizacja *</label>
                    <select
                      value={formData.organization_id || ''}
                      onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${formErrors.organization_id ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                    >
                      <option value="">Wybierz organizację</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                    {formErrors.organization_id && <p className="text-xs text-red-500 mt-1">{formErrors.organization_id}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Marka *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${formErrors.brand ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.brand && <p className="text-xs text-red-500 mt-1">{formErrors.brand}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${formErrors.model ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.model && <p className="text-xs text-red-500 mt-1">{formErrors.model}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Rok produkcji</label>
                  <input
                    type="number"
                    value={formData.production_year}
                    onChange={(e) => setFormData({ ...formData, production_year: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${formErrors.production_year ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.production_year && <p className="text-xs text-red-500 mt-1">{formErrors.production_year}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Numer rejestracyjny *</label>
                  <input
                    type="text"
                    value={formData.registration_plate}
                    onChange={(e) => setFormData({ ...formData, registration_plate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${formErrors.registration_plate ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.registration_plate && <p className="text-xs text-red-500 mt-1">{formErrors.registration_plate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">VIN</label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Pojemność silnika</label>
                  <input
                    type="text"
                    value={formData.engine_capacity}
                    onChange={(e) => setFormData({ ...formData, engine_capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="np. 1.6 TDI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Rodzaj paliwa</label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {fuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Skrzynia biegów</label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Kategoria prawa jazdy</label>
                  <select
                    value={formData.license_category}
                    onChange={(e) => setFormData({ ...formData, license_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {statuses.map(s => (
                      <option key={s} value={s}>
                        {s === 'active' ? 'Aktywny' : s === 'service' ? 'Serwis' : 'Nieaktywny'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Ważność OC</label>
                  <input
                    type="text"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Ważność przeglądu</label>
                  <input
                    type="text"
                    value={formData.inspection_expiry}
                    onChange={(e) => setFormData({ ...formData, inspection_expiry: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-dark-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200 font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Dodaj pojazd'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">Usunąć pojazd?</h3>
            </div>
            <p className="text-gray-600 dark:text-dark-600 mb-6">
              Tej operacji nie można cofnąć. Wszystkie powiązane raporty paliwa również zostaną usunięte.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200 font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isDeleting ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Fleet
