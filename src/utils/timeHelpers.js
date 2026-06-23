/**
 * Helper functions for time formatting and timezone conversion
 * All times in database are stored in UTC, these functions convert them to local time for display
 */

/**
 * Convert UTC time string to local time string
 * @param {string} utcTime - UTC time string (ISO format or database timestamp)
 * @returns {string} Local time string in HH:MM format
 */
export const formatLocalTime = (utcTime) => {
  if (!utcTime) return ''
  
  const date = new Date(utcTime)
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Convert UTC date string to local date string
 * @param {string} utcDate - UTC date string (ISO format or database timestamp)
 * @returns {string} Local date string in DD.MM.YYYY format
 */
export const formatLocalDate = (utcDate) => {
  if (!utcDate) return ''
  
  const date = new Date(utcDate)
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Convert UTC datetime string to local datetime string
 * @param {string} utcDateTime - UTC datetime string (ISO format or database timestamp)
 * @returns {string} Local datetime string in DD.MM.YYYY HH:MM format
 */
export const formatLocalDateTime = (utcDateTime) => {
  if (!utcDateTime) return ''
  
  const date = new Date(utcDateTime)
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Convert UTC datetime string to local Date object
 * @param {string} utcDateTime - UTC datetime string (ISO format or database timestamp)
 * @returns {Date} Local Date object
 */
export const toLocalDate = (utcDateTime) => {
  if (!utcDateTime) return null
  
  const date = new Date(utcDateTime)
  if (isNaN(date.getTime())) return null
  
  return date
}

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30min", "45min")
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0min'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${mins}min`
  }
}

/**
 * Get local timezone name
 * @returns {string} Local timezone name (e.g., "Europe/Warsaw")
 */
export const getLocalTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Check if a UTC datetime is in the past (compared to local time)
 * @param {string} utcDateTime - UTC datetime string
 * @returns {boolean} True if the datetime is in the past
 */
export const isPast = (utcDateTime) => {
  if (!utcDateTime) return false
  
  const date = new Date(utcDateTime)
  if (isNaN(date.getTime())) return false
  
  return date < new Date()
}

/**
 * Check if a UTC datetime is in the future (compared to local time)
 * @param {string} utcDateTime - UTC datetime string
 * @returns {boolean} True if the datetime is in the future
 */
export const isFuture = (utcDateTime) => {
  if (!utcDateTime) return false
  
  const date = new Date(utcDateTime)
  if (isNaN(date.getTime())) return false
  
  return date > new Date()
}

/**
 * Check if current local time is between two UTC datetimes
 * @param {string} utcStart - UTC start datetime
 * @param {string} utcEnd - UTC end datetime
 * @returns {boolean} True if current local time is between start and end
 */
export const isNowBetween = (utcStart, utcEnd) => {
  if (!utcStart || !utcEnd) return false
  
  const start = new Date(utcStart)
  const end = new Date(utcEnd)
  const now = new Date()
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
  
  return now >= start && now <= end
}
