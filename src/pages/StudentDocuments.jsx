import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Loader2,
  X,
  AlertCircle,
  Trash2
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatLocalDate } from '../utils/timeHelpers'
import { sendDocumentEmail } from '../services/studentNotificationService'
import toast from 'react-hot-toast'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const StudentDocuments = () => {
  const { user } = useAuth()
  const supabase = useSupabase()
  const fileInputRef = useRef(null)

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!user?.studentId) return
    loadDocuments()
  }, [user?.studentId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', user.studentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Błąd ładowania dokumentów:', error)
      toast.error('Nie udało się załadować dokumentów')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Dozwolone formaty: PDF, JPG, PNG')
      return
    }

    if (file.size > MAX_SIZE) {
      toast.error('Maksymalny rozmiar pliku to 10 MB')
      return
    }

    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user?.studentId) return

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const path = `${user.studentId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(path, selectedFile, {
          contentType: selectedFile.type,
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(path)

      const { data: insertedDoc, error: dbError } = await supabase
        .from('student_documents')
        .insert({
          student_id: user.studentId,
          uploaded_by: user.id,
          uploaded_by_role: 'student',
          file_url: urlData.publicUrl,
          file_path: path,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          status: 'pending'
        })
        .select('id')
        .single()

      if (dbError) throw dbError

      if (insertedDoc?.id) {
        try {
          await sendDocumentEmail(insertedDoc.id, 'uploaded_by_student')
        } catch (emailError) {
          console.error('Błąd wysyłania powiadomienia:', emailError)
        }
      }

      toast.success('Dokument przesłany')
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadDocuments()
    } catch (error) {
      console.error('Błąd uploadu:', error)
      toast.error('Nie udało się przesłać dokumentu')
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Zaakceptowany'
      case 'rejected':
        return 'Odrzucony'
      default:
        return 'Oczekuje'
    }
  }

  const handleDownload = async (doc) => {
    const path = doc.file_path || doc.file_url?.split('/student-documents/').pop()
    if (!path) {
      toast.error('Nie można pobrać dokumentu')
      return
    }
    try {
      const { data, error } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(path, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Błąd generowania linku:', error)
      toast.error('Nie udało się wygenerować linku do pobrania')
    }
  }

  const handleDelete = async (doc) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten dokument?')) return
    setDeletingId(doc.id)
    try {
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('student-documents')
          .remove([doc.file_path])
        if (storageError) console.error('Błąd usuwania z storage:', storageError)
      }
      const { error } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', doc.id)
        .eq('student_id', user.studentId)
      if (error) throw error
      toast.success('Dokument został usunięty')
      await loadDocuments()
    } catch (error) {
      console.error('Błąd usuwania dokumentu:', error)
      toast.error('Nie udało się usunąć dokumentu')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-6">Dokumenty</h1>

        {/* Upload */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">Prześlij nowy dokument</h2>
          <p className="text-sm text-gray-500 dark:text-dark-500 mb-4">
            Dozwolone formaty: PDF, JPG, PNG. Maksymalny rozmiar: 10 MB.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
          />

          {!selectedFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-dark-300 rounded-lg text-gray-600 dark:text-dark-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2" />
              Kliknij, aby wybrać plik
            </button>
          ) : (
            <div className="border border-gray-200 dark:border-dark-200 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-4">
                {previewUrl ? (
                  <img src={previewUrl} alt="Podgląd" className="h-20 w-20 object-cover rounded-lg" />
                ) : (
                  <div className="h-20 w-20 bg-gray-100 dark:bg-dark-200 rounded-lg flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-dark-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-dark-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Przesyłanie...
                    </>
                  ) : (
                    'Prześlij'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Documents list */}
        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">Lista dokumentów</h2>

          {documents.length === 0 ? (
            <p className="text-gray-500 dark:text-dark-500 text-center py-8">
              Brak dokumentów
            </p>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-100 dark:border-dark-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-dark-900">{doc.file_name}</p>
                        <p className="text-sm text-gray-500 dark:text-dark-500">
                          {doc.uploaded_by_role === 'student' ? 'Wysłane przez Ciebie' : 'Wysłane przez OSK'} · {formatLocalDate(doc.created_at)}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                          doc.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : doc.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getStatusText(doc.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                        title="Pobierz"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      {doc.uploaded_by_role === 'student' && doc.status === 'pending' && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 border border-red-300"
                          title="Wycofaj dokument"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Wycofaj'
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        title="Usuń"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {doc.osk_comment && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-dark-200 rounded-lg text-sm text-gray-700 dark:text-dark-700">
                      <span className="font-medium">Komentarz OSK:</span> {doc.osk_comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDocuments
