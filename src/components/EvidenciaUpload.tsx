import { useState, useCallback, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Eye, X, File as FileIcon, Loader2 } from 'lucide-react'
import { uploadEvidencia, getEvidencias, uploadEvidenciaDesvio, getEvidenciasDesvio, uploadEvidenciaAtividade, getEvidenciasAtividade, downloadEvidencia, deleteEvidencia, desvincularAtividadeEvidencia } from '../api/evidencia'
import { Evidencia, TipoEvidencia } from '../types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '../utils/date'

interface EvidenciaUploadProps {
  naoConformidadeId?: string
  desvioId?: string
  atividadeId?: string
  tipoEvidencia?: TipoEvidencia
  readOnly?: boolean
  titulo?: string
}

export default function EvidenciaUpload({ naoConformidadeId, desvioId, atividadeId, tipoEvidencia = 'OCORRENCIA', readOnly = false, titulo }: EvidenciaUploadProps) {
  const entityId = (atividadeId || naoConformidadeId || desvioId)!
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()
  const inputId = `file-upload-${entityId}-${tipoEvidencia}`

  const fetchFn = atividadeId
    ? () => getEvidenciasAtividade(atividadeId)
    : desvioId
    ? () => getEvidenciasDesvio(entityId, tipoEvidencia)
    : () => getEvidencias(entityId, tipoEvidencia)

  const uploadFn = atividadeId
    ? (file: File) => uploadEvidenciaAtividade(atividadeId, file)
    : desvioId
    ? (file: File) => uploadEvidenciaDesvio(entityId, file, tipoEvidencia)
    : (file: File) => uploadEvidencia(entityId, file, tipoEvidencia)

  const queryKey = atividadeId
    ? ['evidencias-atividade', atividadeId]
    : ['evidencias', entityId, tipoEvidencia]

  const { data: evidencias = [], isLoading } = useQuery({
    queryKey,
    queryFn: fetchFn,
  })

  const uploadMutation = useMutation({
    mutationFn: uploadFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => atividadeId ? desvincularAtividadeEvidencia(id) : deleteEvidencia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const isImage = (nome: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(nome)
  const isPdf = (nome: string) => /\.pdf$/i.test(nome)

  // Refs sempre com o valor mais recente, pra limpeza de unmount não fechar
  // sobre o thumbnails/previewUrl do primeiro render (que ainda estão vazios).
  const thumbnailsRef = useRef(thumbnails)
  thumbnailsRef.current = thumbnails
  const previewUrlRef = useRef(previewUrl)
  previewUrlRef.current = previewUrl

  // Load thumbnails for images. Usa a ref (não o estado) pra decidir o que já
  // foi buscado, senão precisaria de "thumbnails" nas deps e reiniciaria o
  // efeito a cada thumbnail carregada, correndo o risco de baixar a mesma
  // imagem duas vezes enquanto o download anterior ainda está em voo.
  useEffect(() => {
    const imageEvidencias = evidencias.filter(ev => isImage(ev.nomeArquivo))
    imageEvidencias.forEach(async (ev) => {
      if (thumbnailsRef.current[ev.id]) return
      try {
        const blob = await downloadEvidencia(ev.id)
        const url = URL.createObjectURL(blob)
        setThumbnails(prev => ({ ...prev, [ev.id]: url }))
      } catch { /* ignore */ }
    })
  }, [evidencias])

  // Cleanup blob URLs (só no unmount — previewUrl às vezes é a mesma URL de
  // uma thumbnail reaproveitada, então não pode ser revogado a cada troca)
  useEffect(() => {
    return () => {
      Object.values(thumbnailsRef.current).forEach(url => URL.revokeObjectURL(url))
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      uploadMutation.mutate(file)
    })
  }, [uploadMutation])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  const handleDownload = async (evidencia: Evidencia) => {
    const blob = await downloadEvidencia(evidencia.id)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = evidencia.nomeArquivo
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePreview = async (evidencia: Evidencia) => {
    // For images, reuse thumbnail if available
    if (isImage(evidencia.nomeArquivo) && thumbnails[evidencia.id]) {
      setPreviewUrl(thumbnails[evidencia.id])
      setPreviewName(evidencia.nomeArquivo)
      return
    }
    // Download and preview
    const blob = await downloadEvidencia(evidencia.id)
    const url = URL.createObjectURL(blob)
    if (isImage(evidencia.nomeArquivo)) {
      setPreviewUrl(url)
      setPreviewName(evidencia.nomeArquivo)
    } else if (isPdf(evidencia.nomeArquivo)) {
      window.open(url, '_blank')
    } else {
      // Word docs etc - just download
      const a = document.createElement('a')
      a.href = url
      a.download = evidencia.nomeArquivo
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewName('')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">{titulo ?? 'Evidências'}</h3>

      {/* Drop Zone */}
      {!readOnly && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Enviando...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Arraste arquivos aqui ou <span className="text-blue-600 font-medium">clique para selecionar</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">Imagens e documentos (max. 10MB)</p>
            </div>
          )}
          <input
            id={inputId}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* File List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : evidencias.length > 0 ? (
        <div className="space-y-3">
          {/* Image grid */}
          {evidencias.some(ev => isImage(ev.nomeArquivo)) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {evidencias.filter(ev => isImage(ev.nomeArquivo)).map((ev) => (
                <div key={ev.id} className="group relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <div className="aspect-square flex items-center justify-center">
                    {thumbnails[ev.id] ? (
                      <img
                        src={thumbnails[ev.id]}
                        alt={ev.nomeArquivo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
                    )}
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handlePreview(ev)}
                      className="p-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(ev)}
                      className="p-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => deleteMutation.mutate(ev.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                    <p className="text-xs text-gray-600 truncate">{ev.nomeArquivo}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(ev.dataUpload)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Document list */}
          {evidencias.some(ev => !isImage(ev.nomeArquivo)) && (
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {evidencias.filter(ev => !isImage(ev.nomeArquivo)).map((ev) => (
                <li key={ev.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf(ev.nomeArquivo) ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <FileIcon className={`h-5 w-5 ${isPdf(ev.nomeArquivo) ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ev.nomeArquivo}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(ev.dataUpload)}
                        {isPdf(ev.nomeArquivo) && <span className="ml-2 text-red-400">PDF</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isPdf(ev.nomeArquivo) && (
                      <button
                        onClick={() => handlePreview(ev)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(ev)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => deleteMutation.mutate(ev.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-3">Nenhuma evidência anexada</p>
      )}

      {/* Image preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closePreview}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={closePreview}
              className="absolute -top-3 -right-3 z-10 p-2 bg-white rounded-full shadow-lg text-gray-600 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <img
                src={previewUrl}
                alt={previewName}
                className="w-full max-h-[80vh] object-contain"
              />
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700">{previewName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
