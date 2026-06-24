import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchVehicles,
  createFuelReport,
  parseFuelReceipt,
  getInstructorId
} from '../services/fleetService'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Fuel,
  Upload,
  Camera,
  X,
  Save,
  ArrowLeft,
  Calendar,
  Gauge
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fuelTypeOptions = ['PB95', 'PB98', 'ON', 'Diesel', 'LPG', 'EV']

const FuelReport = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [vehicleId, setVehicleId] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMileage, setCurrentMileage] = useState('')
  const [fuels, setFuels] = useState([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [previewImage, setPreviewImage] = useState(null)

  const organizationId = user?.organizationId
  const isInstructor = user?.role === 'instructor'

  useEffect(() => {
    loadVehicles()
  }, [organizationId])

  const loadVehicles = async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const list = await fetchVehicles(organizationId)
      setVehicles(list)
    } catch (error) {
      console.error('Błąd ładowania pojazdów:', error)
      toast.error('Nie udało się załadować pojazdów')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Wybierz plik graficzny')
      return
    }

    setIsParsing(true)
    try {
      const preview = URL.createObjectURL(file)
      setPreviewImage(preview)

      const base64 = await fileToBase64(file)
      const dataUrl = `data:${file.type};base64,${base64}`
      const result = await parseFuelReceipt(dataUrl)

      if (result?.data) {
        const parsedFuels = result.data.fuels || []
        const parsedDate = result.data.date || receiptDate
        setReceiptDate(parsedDate)
        setFuels(parsedFuels.map((f, idx) => ({
          id: idx,
          type: fuelTypeOptions.includes(f.type) ? f.type : 'PB95',
          volume_liters: Number(f.volume_liters) || 0,
          unit_price: Number(f.unit_price) || 0,
          total_price: Number(f.total_price) || 0
        })))
        setGrandTotal(result.data.grand_total_fuel_only || 0)
        toast.success('Paragon odczytany. Sprawdź dane przed zapisem.')
      } else {
        throw new Error('Brak danych w odpowiedzi')
      }
    } catch (error) {
      console.error('Błąd OCR paragonu:', error)
      toast.error('Nie udało się odczytać paragonu. Spróbuj ponownie lub wypełnij dane ręcznie.')
    } finally {
      setIsParsing(false)
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

  const updateFuel = (id, field, value) => {
    setFuels(prev => {
      const updated = prev.map(f => {
        if (f.id !== id) return f
        const next = { ...f, [field]: value }
        if (field === 'volume_liters' || field === 'unit_price') {
          next.total_price = Number((Number(next.volume_liters) * Number(next.unit_price)).toFixed(2))
        }
        return next
      })
      const total = Number(updated.reduce((sum, f) => sum + Number(f.total_price), 0).toFixed(2))
      setGrandTotal(total)
      return updated
    })
  }

  const addFuelRow = () => {
    setFuels(prev => {
      const newRow = {
        id: Date.now(),
        type: 'PB95',
        volume_liters: 0,
        unit_price: 0,
        total_price: 0
      }
      return [...prev, newRow]
    })
  }

  const removeFuelRow = (id) => {
    setFuels(prev => {
      const updated = prev.filter(f => f.id !== id)
      const total = Number(updated.reduce((sum, f) => sum + Number(f.total_price), 0).toFixed(2))
      setGrandTotal(total)
      return updated
    })
  }

  const validate = () => {
    if (!vehicleId) {
      toast.error('Wybierz pojazd')
      return false
    }
    if (!receiptDate) {
      toast.error('Podaj datę paragonu')
      return false
    }
    if (fuels.length === 0) {
      toast.error('Dodaj przynajmniej jedno paliwo')
      return false
    }
    for (const fuel of fuels) {
      if (!fuel.type || fuel.volume_liters <= 0 || fuel.unit_price <= 0) {
        toast.error('Uzupełnij wszystkie pola paliw')
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSaving(true)
    try {
      const instructorId = await getInstructorId(user.id)
      const payload = {
        vehicle_id: vehicleId,
        instructor_id: instructorId,
        organization_id: organizationId,
        receipt_date: receiptDate,
        fuel_data: fuels.map(({ type, volume_liters, unit_price, total_price }) => ({
          type,
          volume_liters,
          unit_price,
          total_price
        })),
        total_cost: grandTotal,
        current_mileage: currentMileage ? Number(currentMileage) : null
      }
      await createFuelReport(payload)
      toast.success('Raport paliwa zapisany')
      navigate('/instructor-panel')
    } catch (error) {
      console.error('Błąd zapisu raportu:', error)
      toast.error(error.message || 'Nie udało się zapisać raportu')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <LoadingSpinner text="Ładowanie..." />

  if (!isInstructor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600 dark:text-dark-600">Dodawanie raportów paliwa jest dostępne tylko dla instruktorów.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-600 dark:text-dark-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Wróć
        </button>

        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm border border-gray-200 dark:border-dark-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-dark-200">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                <Fuel className="h-6 w-6" />
              </div>
              Raport tankowania
            </h1>
            <p className="text-gray-500 dark:text-dark-500 mt-1">Zeskanuj paragon lub wypełnij dane ręcznie</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Vehicle and date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Pojazd *</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Wybierz pojazd</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.registration_plate})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Data paragonu *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* OCR upload */}
            <div className="p-5 border-2 border-dashed border-gray-300 dark:border-dark-300 rounded-xl bg-gray-50 dark:bg-dark-200/50 text-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              {previewImage ? (
                <div className="space-y-3">
                  <img src={previewImage} alt="Paragon" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Wybierz inny plik
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="inline-flex flex-col items-center gap-2 text-gray-600 dark:text-dark-600 hover:text-primary-600 transition-colors"
                >
                  <div className="p-3 bg-white dark:bg-dark-100 rounded-full shadow-sm">
                    <Camera className="h-6 w-6" />
                  </div>
                  <span className="font-medium">Kliknij aby zeskanować paragon</span>
                  <span className="text-xs text-gray-400 dark:text-dark-500">Obsługiwane: JPG, PNG</span>
                </button>
              )}
              {isParsing && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-primary-600">
                  <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                  Odczytuję paragon...
                </div>
              )}
            </div>

            {/* Fuels table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-dark-900">Paliwa na paragonie</h3>
                <button
                  onClick={addFuelRow}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Dodaj paliwo
                </button>
              </div>

              {fuels.length === 0 ? (
                <div className="p-6 text-center border border-gray-200 dark:border-dark-200 rounded-xl text-gray-500 dark:text-dark-500">
                  Brak pozycji. Dodaj paliwo ręcznie lub zeskanuj paragon.
                </div>
              ) : (
                <div className="space-y-3">
                  {fuels.map((fuel, index) => (
                    <div key={fuel.id} className="p-4 border border-gray-200 dark:border-dark-200 rounded-xl bg-gray-50 dark:bg-dark-200/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-dark-500">Pozycja {index + 1}</span>
                        <button
                          onClick={() => removeFuelRow(fuel.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-dark-500">Rodzaj</label>
                          <select
                            value={fuel.type}
                            onChange={(e) => updateFuel(fuel.id, 'type', e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 text-sm"
                          >
                            {fuelTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-dark-500">Ilość (L/kWh)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fuel.volume_liters}
                            onChange={(e) => updateFuel(fuel.id, 'volume_liters', Number(e.target.value))}
                            className="w-full px-2 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-dark-500">Cena jedn. (zł)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fuel.unit_price}
                            onChange={(e) => updateFuel(fuel.id, 'unit_price', Number(e.target.value))}
                            className="w-full px-2 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-dark-500">Wartość (zł)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fuel.total_price}
                            readOnly
                            className="w-full px-2 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-dark-700 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1">Aktualny przebieg (km)</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(e.target.value)}
                  placeholder="np. 123456"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-900">Łączny koszt paliwa:</span>
                <span className="text-xl font-bold text-primary-700 dark:text-primary-400">
                  {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grandTotal)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                Przed zapisem sprawdź czy wykryte pozycje są poprawne. Możesz je edytować powyżej.
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-dark-200 flex justify-end gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-200 font-medium"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || fuels.length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium inline-flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz raport
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default FuelReport
