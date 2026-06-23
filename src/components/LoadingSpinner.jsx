import React from 'react'

const LoadingSpinner = ({ text = "Ładowanie..." }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center px-4 transition-colors duration-200">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-dark-600">{text}</p>
      </div>
    </div>
  )
}

export default LoadingSpinner
