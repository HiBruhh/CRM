import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupabase } from '../contexts/SupabaseContext'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Loader2,
  Search,
  User,
  MessageSquare,
  Send,
  Upload,
  X,
  Trash2
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { sendDocumentEmail } from '../services/studentNotificationService'
import { formatLocalDate } from '../utils/timeHelpers'
import toast from 'react-hot-toast'

const AdminDocuments = () => {
  const { user } = useAuth()
  const supabase = useSupabase()

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)
  const [commentDoc, setCommentDoc] = useState(null)
  const [oskComment, setOskComment] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [user?.organizationId])

  useEffect(() => {
    if (uploadModalOpen) loadStudents()
  }, [uploadModalOpen, user?.organizationId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('student_documents')
        .select(`
          *,
          student:students(id, first_name, last_name, email, student_id)
        `)
        .order('created_at', { ascending: false })

      if (!user?.isSuperAdmin && user?.organizationId) {
        query = query.eq('student.organization_id', user.organizationId)
      }

      const { data, error } = await query
      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Błąd ładowania dokumentów:', error)
      toast.error('Nie udało się załadować dokumentów')
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .order('last_name', { ascending: true })

      if (!user?.isSuperAdmin && user?.organizationId) {
        query = query.eq('organization_id', user.organizationId)
      }

      const { data, error } = await query
      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Błąd ładowania kursantów:', error)
      toast.error('Nie udało się załadować kursantów')
    }
  }

  const handleOskUpload = async () => {
    if (!selectedStudent || !selectedFile || !user?.id) {
      toast.error('Wybierz kursanta i plik')
      return
    }

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const path = `${selectedStudent}/${fileName}`

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
          student_id: selectedStudent,
          uploaded_by: user.id,
          uploaded_by_role: 'osk',
          file_url: urlData.publicUrl,
          file_path: path,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          status: 'approved'
        })
        .select('id')
        .single()

      if (dbError) throw dbError

      if (insertedDoc?.id) {
        try {
          await sendDocumentEmail(insertedDoc.id, 'uploaded_by_osk')
        } catch (emailError) {
          console.error('Błąd wysyłania powiadomienia:', emailError)
        }
      }

      toast.success('Dokument przesłany do kursanta')
      setSelectedStudent('')
      setSelectedFile(null)
      setUploadModalOpen(false)
      await loadDocuments()
    } catch (error) {
      console.error('Błąd uploadu OSK:', error)
      toast.error('Nie udało się przesłać dokumentu')
    } finally {
      setUploading(false)
    }
  }

  const handleStatusChange = async (docId, newStatus) => {
    setProcessingId(docId)
    try {
      const { error } = await supabase
        .from('student_documents')
        .update({ status: newStatus })
        .eq('id', docId)

      if (error) throw error

      toast.success(newStatus === 'approved' ? 'Dokument zaakceptowany' : 'Dokument odrzucony')
      try {
        await sendDocumentEmail(docId, newStatus === 'approved' ? 'approved' : 'rejected')
      } catch (emailError) {
        console.error('Błąd wysyłania powiadomienia:', emailError)
      }
      await loadDocuments()
    } catch (error) {
      console.error('Błąd zmiany statusu:', error)
      toast.error('Nie udało się zmienić statusu')
    } finally {
      setProcessingId(null)
    }
  }

  const handleAddComment = async () => {
    if (!commentDoc) return
    setProcessingId(commentDoc.id)
    try {
      const { error } = await supabase
        .from('student_documents')
        .update({ osk_comment: oskComment })
        .eq('id', commentDoc.id)

      if (error) throw error
      toast.success('Komentarz dodany')
      setCommentDoc(null)
      setOskComment('')
      await loadDocuments()
    } catch (error) {
      console.error('Błąd dodawania komentarza:', error)
      toast.error('Nie udało się dodać komentarza')
    } finally {
      setProcessingId(null)
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
    setProcessingId(doc.id)
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
      if (error) throw error
      toast.success('Dokument został usunięty')
      await loadDocuments()
    } catch (error) {
      console.error('Błąd usuwania dokumentu:', error)
      toast.error('Nie udało się usunąć dokumentu')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${doc.student?.first_name} ${doc.student?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-900">Dokumenty kursantów</h1>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Wyślij dokument do kursanta
          </button>
        </div>

        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Szukaj po nazwie, kursancie..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="pending">Oczekujące</option>
              <option value="approved">Zaakceptowane</option>
              <option value="rejected">Odrzucone</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-100 rounded-xl shadow-sm p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-dark-500">Brak dokumentów</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-100 dark:border-dark-200 rounded-lg p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 dark:text-dark-900">{doc.file_name}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            doc.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : doc.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {getStatusText(doc.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-500">
                          <User className="h-4 w-4" />
                          {doc.student?.first_name} {doc.student?.last_name} ({doc.student?.student_id})
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-500 mt-1">
                          {doc.uploaded_by_role === 'student' ? 'Wysłane przez kursanta' : 'Wysłane przez OSK'} · {formatLocalDate(doc.created_at)}
                        </p>
                        {doc.osk_comment && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-dark-200 rounded text-sm text-gray-700 dark:text-dark-700">
                            <span className="font-medium">Komentarz OSK:</span> {doc.osk_comment}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-sm text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200"
                      >
                        <Download className="h-4 w-4" />
                        Pobierz
                      </button>
                      <button
                        onClick={() => {
                          setCommentDoc(doc)
                          setOskComment(doc.osk_comment || '')
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg text-sm text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Komentarz
                      </button>
                      {doc.uploaded_by_role === 'student' && doc.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(doc.id, 'approved')}
                          disabled={processingId === doc.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Akceptuj
                        </button>
                      )}
                      {doc.uploaded_by_role === 'student' && doc.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(doc.id, 'rejected')}
                          disabled={processingId === doc.id}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Odrzuć
                        </button>
                      )}
                      {doc.uploaded_by_role === 'osk' && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={processingId === doc.id}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
                          title="Wycofaj dokument"
                        >
                          {processingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Wycofaj
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={processingId === doc.id}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
                        title="Usuń dokument"
                      >
                        {processingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                Wyślij dokument do kursanta
              </h3>
              <button
                onClick={() => {
                  setUploadModalOpen(false)
                  setSelectedStudent('')
                  setSelectedFile(null)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
                  Kursant
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900"
                >
                  <option value="">Wybierz kursanta</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
                  Plik
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-dark-600">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setUploadModalOpen(false)
                  setSelectedStudent('')
                  setSelectedFile(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleOskUpload}
                disabled={!selectedStudent || !selectedFile || uploading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Wysyłanie...' : 'Wyślij dokument'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment modal */}
      {commentDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">
              Komentarz OSK do dokumentu
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-600 mb-4">
              {commentDoc.file_name}
            </p>
            <textarea
              value={oskComment}
              onChange={(e) => setOskComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg dark:bg-dark-200 dark:text-dark-900 mb-4"
              placeholder="Komentarz widoczny dla kursanta..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setCommentDoc(null)
                  setOskComment('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleAddComment}
                disabled={processingId === commentDoc.id}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {processingId === commentDoc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDocuments
