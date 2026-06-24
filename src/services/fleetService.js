import { supabase } from '../contexts/SupabaseContext'

// ---------- VEHICLES ----------

export const fetchVehicles = async (organizationId) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('brand', { ascending: true })

  if (error) throw error
  return data || []
}

export const fetchAllVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, organization:organizations(id, name, slug)')
    .order('brand', { ascending: true })

  if (error) throw error
  return data || []
}

export const fetchVehicleById = async (vehicleId) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single()

  if (error) throw error
  return data
}

export const createVehicle = async (vehicle) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicle)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateVehicle = async (id, vehicle) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update(vehicle)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteVehicle = async (id) => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ---------- FUEL REPORTS ----------

export const fetchFuelReports = async (organizationId) => {
  const { data, error } = await supabase
    .from('fuel_reports')
    .select(`
      *,
      vehicle:vehicles(id, brand, model, registration_plate),
      instructor:instructors(id, first_name, last_name)
    `)
    .eq('organization_id', organizationId)
    .order('receipt_date', { ascending: false })

  if (error) throw error
  return data || []
}

export const fetchFuelReportsByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('fuel_reports')
    .select(`
      *,
      instructor:instructors(id, first_name, last_name)
    `)
    .eq('vehicle_id', vehicleId)
    .order('receipt_date', { ascending: false })

  if (error) throw error
  return data || []
}

export const createFuelReport = async (report) => {
  const { data, error } = await supabase
    .from('fuel_reports')
    .insert(report)
    .select()
    .single()

  if (error) throw error
  return data
}

export const fetchFuelCostSummary = async (organizationId) => {
  const { data, error } = await supabase
    .from('fuel_reports')
    .select('vehicle_id, total_cost')
    .eq('organization_id', organizationId)

  if (error) throw error

  const summary = {}
  for (const row of data || []) {
    summary[row.vehicle_id] = (summary[row.vehicle_id] || 0) + Number(row.total_cost)
  }

  return summary
}

export const fetchFuelCostSummaryAll = async () => {
  const { data, error } = await supabase
    .from('fuel_reports')
    .select('vehicle_id, total_cost')

  if (error) throw error

  const summary = {}
  for (const row of data || []) {
    summary[row.vehicle_id] = (summary[row.vehicle_id] || 0) + Number(row.total_cost)
  }

  return summary
}

// ---------- AI OCR ----------

export const parseVehicleDocument = async (base64Image) => {
  const { data, error } = await supabase.functions.invoke('parse-vehicle-document', {
    body: { image: base64Image }
  })

  if (error) throw error
  return data
}

export const parseFuelReceipt = async (base64Image) => {
  const { data, error } = await supabase.functions.invoke('parse-fuel-receipt', {
    body: { image: base64Image }
  })

  if (error) throw error
  return data
}

export const getInstructorId = async (authId) => {
  const { data, error } = await supabase
    .from('instructors')
    .select('id')
    .eq('auth_id', authId)
    .single()

  if (error) throw error
  return data.id
}

// ---------- ALERTS ----------

export const getVehicleAlert = (vehicle) => {
  const today = new Date()
  const insurance = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null
  const inspection = vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry) : null

  const daysUntil = (date) => {
    const diff = date.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const insuranceDays = insurance ? daysUntil(insurance) : null
  const inspectionDays = inspection ? daysUntil(inspection) : null

  const minDays = Math.min(
    insuranceDays ?? Infinity,
    inspectionDays ?? Infinity
  )

  if (minDays === Infinity) return null
  if (minDays < 0) return 'danger'
  if (minDays <= 14) return 'warning'
  return null
}

export const getVehicleAlertText = (vehicle) => {
  const today = new Date()
  const insurance = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null
  const inspection = vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry) : null

  const daysUntil = (date) => {
    const diff = date.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const alerts = []
  if (insurance) {
    const days = daysUntil(insurance)
    if (days < 0) alerts.push('OC przeterminowane')
    else if (days <= 14) alerts.push(`OC kończy się za ${days} dni`)
  }
  if (inspection) {
    const days = daysUntil(inspection)
    if (days < 0) alerts.push('Przegląd przeterminowany')
    else if (days <= 14) alerts.push(`Przegląd kończy się za ${days} dni`)
  }

  return alerts.join(' · ')
}
