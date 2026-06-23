import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Car, Users, Calendar, Settings } from 'lucide-react'

const AdminPanel = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Zarządzanie systemem</h2>
          <p className="mt-1 text-gray-600">
            Pełna kontrola nad szkołą jazdy
          </p>
        </div>

        {/* Admin Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => navigate('/students')}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Kursanci</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Dodawaj, edytuj i zarządzaj kursantami
            </p>
            <div className="text-sm text-blue-600 font-medium">
              Zarządzaj kursantami →
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => navigate('/instructors')}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Instruktorzy</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Dodawaj i zarządzaj instruktorami
            </p>
            <div className="text-sm text-green-600 font-medium">
              Zarządzaj instruktorami →
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => navigate('/schedule')}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Grafik</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Pełny podgląd wszystkich grafików
            </p>
            <div className="text-sm text-purple-600 font-medium">
              Zarządzaj grafikiem →
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <Settings className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Ustawienia</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Konfiguracja systemu i integracje
            </p>
            <div className="text-sm text-yellow-600 font-medium">
              Wkrótce →
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-red-100 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Powiadomienia</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Zarządzaj powiadomieniami e-mail
            </p>
            <div className="text-sm text-red-600 font-medium">
              Wkrótce →
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                <Settings className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Raporty</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Statystyki i analizy systemu
            </p>
            <div className="text-sm text-indigo-600 font-medium">
              Wkrótce →
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Podsumowanie systemu</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">24</p>
              <p className="text-sm text-gray-600">Aktywnych kursantów</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">4</p>
              <p className="text-sm text-gray-600">Instruktorów</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-sm text-gray-600">Jazd w tym miesiącu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">312</p>
              <p className="text-sm text-gray-600">Godzin przejechanych</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminPanel
