import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft,
  Edit,
  Trash2,
  X,
  Save,
  Car,
  AlertCircle,
  Settings2,
  FileText
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatLocalDate } from '../utils/timeHelpers'
import {
  fetchVehicleById,
  updateVehicle,
  deleteVehicle,
  fetchFuelReportsByVehicle,
  getVehicleAlert,
  getVehicleAlertText
} from '../services/fleetService'

const fuelTypes = ['benzyna', 'diesel', 'LPG', 'EV', 'hybryda']
const transmissions = ['manual', 'automat']
const categories = ['AM', 'A', 'A1', 'A2', 'B', 'B+E', 'C', 'C+E', 'D', 'D+E']
const statuses = ['active', 'inactive', 'service']

const VehicleDetail = () => {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [vehicle, setVehicle] = useState(null)
  const [fuelReports, setFuelReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [formErrors, setFormErrors] = useState({})

  const isAdmin = user?.role === 'org_admin' || user?.isSuperAdmin || user?.role === 'admin'

  useEffect(() => {
    loadVehicle()
  }, [vehicleId])

  const loadVehicle = async () => {
    try {
      setLoading(true)
      const [vehicleData, reports] = await Promise.all([
        fetchVehicleById(vehicleId),
        fetchFuelReportsByVehicle(vehicleId)
      ])
      setVehicle(vehicleData)
      setFuelReports(reports)
      setEditForm({
        brand: vehicleData.brand || '',
        model: vehicleData.model || '',
        production_year: vehicleData.production_year || '',
        registration_plate: vehicleData.registration_plate || '',
        vin: vehicleData.vin || '',
        engine_capacity: vehicleData.engine_capacity || '',
        fuel_type: vehicleData.fuel_type || 'benzyna',
        transmission: vehicleData.transmission || 'manual',
        license_category: vehicleData.license_category || 'B',
        status: vehicleData.status || 'active',
        insurance_expiry: vehicleData.insurance_expiry || '',
        inspection_expiry: vehicleData.inspection_expiry || ''
      })
    } catch (error) {
      console.error('Błąd ładowania pojazdu:', error)
      toast.error('Nie udało się załadować pojazdu')
      navigate('/fleet')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!editForm.brand?.trim()) errors.brand = 'Podaj markę'
    if (!editForm.model?.trim()) errors.model = 'Podaj model'
    if (!editForm.registration_plate?.trim()) errors.registration_plate = 'Podaj numer rejestracyjny'
    if (editForm.production_year && (editForm.production_year < 1900 || editForm.production_year > 2100)) {
      errors.production_year = 'Niepoprawny rok'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setIsSaving(true)
    try {
      const payload = {
        ...editForm,
        production_year: editForm.production_year ? Number(editForm.production_year) : null,
        insurance_expiry: editForm.insurance_expiry || null,
        inspection_expiry: editForm.inspection_expiry || null
      }
      const updated = await updateVehicle(vehicleId, payload)
      setVehicle(updated)
      setIsEditing(false)
      toast.success('Pojazd zaktualizowany')
    } catch (error) {
      console.error('Błąd aktualizacji pojazdu:', error)
      toast.error('Nie udało się zaktualizować pojazdu')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteVehicle(vehicleId)
      toast.success('Pojazd usunięty')
      navigate('/fleet')
    } catch (error) {
      console.error('Błąd usuwania pojazdu:', error)
      toast.error('Nie udało się usunąć pojazdu')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value || 0)
  }

  const getInstructorName = (report) => {
    const instructor = report.instructor
    if (!instructor) return '-'
    return `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="p-6 text-center text-gray-500">
        Nie znaleziono pojazdu
      </div>
    )
  }

  const alert = getVehicleAlert(vehicle)
  const alertText = getVehicleAlertText(vehicle)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => navigate('/fleet')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Powrót do floty
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600">
                <Car className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">
                  {vehicle.brand} {vehicle.model}
                </h1>
                <p className="text-gray-500 dark:text-dark-500">
                  {vehicle.registration_plate} {vehicle.vin && `· VIN: ${vehicle.vin}`}
                </p>
                {alert && (
                  <div className={`flex items-center gap-2 mt-2 text-sm ${
                    alert === 'danger' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    <AlertCircle className="h-4 w-4" />
                    {alertText}
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {isEditing ? 'Anuluj' : 'Edytuj'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle details / edit form */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Dane pojazdu
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Marka *</label>
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 ${formErrors.brand ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.brand && <p className="text-xs text-red-500 mt-1">{formErrors.brand}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Model *</label>
                  <input
                    type="text"
                    value={editForm.model}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 ${formErrors.model ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.model && <p className="text-xs text-red-500 mt-1">{formErrors.model}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Rok produkcji</label>
                  <input
                    type="number"
                    value={editForm.production_year}
                    onChange={(e) => setEditForm({ ...editForm, production_year: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 ${formErrors.production_year ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.production_year && <p className="text-xs text-red-500 mt-1">{formErrors.production_year}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Numer rejestracyjny *</label>
                  <input
                    type="text"
                    value={editForm.registration_plate}
                    onChange={(e) => setEditForm({ ...editForm, registration_plate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-dark-200 dark:text-dark-900 ${formErrors.registration_plate ? 'border-red-500' : 'border-gray-300 dark:border-dark-300'}`}
                  />
                  {formErrors.registration_plate && <p className="text-xs text-red-500 mt-1">{formErrors.registration_plate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">VIN</label>
                  <input
                    type="text"
                    value={editForm.vin}
                    onChange={(e) => setEditForm({ ...editForm, vin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Pojemność silnika</label>
                  <input
                    type="text"
                    value={editForm.engine_capacity}
                    onChange={(e) => setEditForm({ ...editForm, engine_capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Rodzaj paliwa</label>
                  <select
                    value={editForm.fuel_type}
                    onChange={(e) => setEditForm({ ...editForm, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  >
                    {fuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Skrzynia biegów</label>
                  <select
                    value={editForm.transmission}
                    onChange={(e) => setEditForm({ ...editForm, transmission: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  >
                    {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Kategoria prawa jazdy</label>
                  <select
                    value={editForm.license_category}
                    onChange={(e) => setEditForm({ ...editForm, license_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
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
                    value={editForm.insurance_expiry}
                    onChange={(e) => setEditForm({ ...editForm, insurance_expiry: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Ważność przeglądu</label>
                  <input
                    type="text"
                    value={editForm.inspection_expiry}
                    onChange={(e) => setEditForm({ ...editForm, inspection_expiry: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Marka / Model</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.brand} {vehicle.model}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Rok produkcji</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.production_year || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Rejestracja</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.registration_plate}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">VIN</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.vin || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Pojemność silnika</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.engine_capacity || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Paliwo / Skrzynia</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.fuel_type || '-'} / {vehicle.transmission || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Kategoria prawa jazdy</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{vehicle.license_category || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Status</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">
                    {vehicle.status === 'active' ? 'Aktywny' : vehicle.status === 'service' ? 'Serwis' : 'Nieaktywny'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Ważność OC</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{formatLocalDate(vehicle.insurance_expiry) || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Ważność przeglądu</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{formatLocalDate(vehicle.inspection_expiry) || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-dark-500">Dodano</p>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{formatLocalDate(vehicle.created_at)}</p>
                </div>
              </>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          )}
        </div>

        {/* Fuel history */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historia tankowania
          </h2>

          {fuelReports.length === 0 ? (
            <p className="text-gray-500 dark:text-dark-500 text-center py-8">
              Brak historii tankowania dla tego pojazdu
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-200 text-gray-700 dark:text-dark-900">
                  <tr>
                    <th className="text-left px-4 py-3 rounded-tl-lg">Data</th>
                    <th className="text-left px-4 py-3">Instruktor</th>
                    <th className="text-left px-4 py-3">Paliwo</th>
                    <th className="text-right px-4 py-3">Ilość</th>
                    <th className="text-right px-4 py-3">Cena</th>
                    <th className="text-right px-4 py-3 rounded-tr-lg">Suma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-200">
                  {fuelReports.map((report) => {
                    const fuels = Array.isArray(report.fuel_data) ? report.fuel_data : []
                    return fuels.map((fuel, idx) => (
                      <tr key={`${report.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-dark-200/50">
                        <td className="px-4 py-3 text-gray-900 dark:text-dark-900">
                          {formatLocalDate(report.receipt_date)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-dark-900">
                          {getInstructorName(report)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-dark-900">{fuel.type || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-dark-900">{fuel.volume_liters || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-dark-900">{fuel.unit_price || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-dark-900">{formatCurrency(fuel.total_price)}</td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>

              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-dark-200">
                <div className="flex items-center gap-2 text-gray-900 dark:text-dark-900">
                  <span className="text-gray-500 dark:text-dark-500">Całkowity koszt paliwa:</span>
                  <span className="font-semibold">
                    {formatCurrency(fuelReports.reduce((sum, r) => sum + Number(r.total_cost || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
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
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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

export default VehicleDetail
