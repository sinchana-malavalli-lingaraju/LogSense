import { useEffect, useRef, useState } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle, Clock, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { getSessions, getSessionStatus, uploadLog } from '../api/client'

export default function Upload() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [activeSession, setActiveSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const inputRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    loadSessions()
    return () => clearInterval(pollRef.current)
  }, [])

  async function loadSessions() {
    try {
      const { data } = await getSessions()
      setSessions(data)
    } catch {}
  }

  async function handleFile(file) {
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    setActiveSession(null)
    try {
      const { data } = await uploadLog(file, setUploadPct)
      setActiveSession(data)
      startPolling(data.session_id)
    } catch (e) {
      alert('Upload failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setUploading(false)
    }
  }

  function startPolling(sessionId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getSessionStatus(sessionId)
        setActiveSession(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollRef.current)
          loadSessions()
        }
      } catch {}
    }, 2000)
  }

  const processPct = s =>
    s?.total_lines ? Math.round((s.parsed_lines / s.total_lines) * 100) : 0

  const StatusIcon = ({ status }) => {
    if (status === 'completed') return <CheckCircle className="text-green-400" size={15} />
    if (status === 'processing') return <Clock className="text-yellow-400" size={15} />
    return <AlertCircle className="text-red-400" size={15} />
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Ingest Logs</h1>
      <p className="text-gray-400 text-sm mb-6">
        Upload a log file (.txt / .log) to index it for AI analysis and semantic search.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-blue-400 bg-blue-950/20'
            : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/40'
        }`}
      >
        <UploadIcon className="mx-auto text-gray-500 mb-3" size={44} />
        <p className="text-gray-300 font-semibold text-lg">Drop your log file here</p>
        <p className="text-gray-500 text-sm mt-1">or click to browse</p>
        <p className="text-gray-600 text-xs mt-2">.txt and .log files supported</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.log"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Uploading file…</span>
            <span>{uploadPct}%</span>
          </div>
          <div className="bg-gray-800 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {/* Active processing session */}
      {activeSession && activeSession.status === 'processing' && (
        <div className="mt-5 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="text-blue-400 animate-spin" size={15} />
            <span className="text-sm font-medium text-white">
              Embedding {activeSession.filename}…
            </span>
          </div>
          <div className="bg-gray-800 rounded-full h-1.5 mb-1">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${processPct(activeSession)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {activeSession.parsed_lines.toLocaleString()} / {activeSession.total_lines.toLocaleString()} lines embedded
          </p>
        </div>
      )}

      {activeSession?.status === 'completed' && (
        <div className="mt-5 bg-green-950/40 border border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-400 shrink-0" size={18} />
          <div>
            <p className="text-sm font-medium text-green-300">Ingestion complete</p>
            <p className="text-xs text-green-600">
              {activeSession.parsed_lines.toLocaleString()} log lines indexed — ready for search and chat.
            </p>
          </div>
        </div>
      )}

      {/* Past sessions */}
      {sessions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            Past Ingestions
          </h2>
          <div className="space-y-2">
            {sessions.map(s => (
              <div
                key={s.session_id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
              >
                <FileText className="text-gray-500 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{s.filename}</p>
                  <p className="text-xs text-gray-500">
                    {s.parsed_lines?.toLocaleString()} lines · {new Date(s.uploaded_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusIcon status={s.status} />
                  <span className="text-xs text-gray-400 capitalize">{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
