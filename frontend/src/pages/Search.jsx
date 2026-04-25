import { useEffect, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { getSessions, semanticSearch } from '../api/client'

const SEV = {
  ERROR: 'text-red-400 bg-red-950/60 border-red-900',
  WARNING: 'text-yellow-400 bg-yellow-950/60 border-yellow-900',
  INFO: 'text-blue-400 bg-blue-950/60 border-blue-900',
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sessions, setSessions] = useState([])
  const [filters, setFilters] = useState({ session_id: '', service: '', severity: '' })

  useEffect(() => {
    getSessions()
      .then(({ data }) => setSessions(data.filter(s => s.status === 'completed')))
      .catch(() => {})
  }, [])

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(false)
    try {
      const body = { query, top_k: 20 }
      if (filters.session_id) body.session_id = filters.session_id
      if (filters.service) body.service = filters.service
      if (filters.severity) body.severity = filters.severity
      const { data } = await semanticSearch(body)
      setResults(data.results)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Semantic Search</h1>
      <p className="text-gray-400 text-sm mb-6">
        Find log entries by meaning — not just keywords. Powered by vector embeddings.
      </p>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder='e.g. "semaphore file not found" or "HPM authentication failed"'
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
        >
          <SearchIcon size={15} />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={filters.session_id}
          onChange={e => setFilter('session_id', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-1.5 focus:outline-none"
        >
          <option value="">All files</option>
          {sessions.map(s => (
            <option key={s.session_id} value={s.session_id}>{s.filename}</option>
          ))}
        </select>
        <select
          value={filters.severity}
          onChange={e => setFilter('severity', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-1.5 focus:outline-none"
        >
          <option value="">All severities</option>
          {['ERROR', 'WARNING', 'INFO'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input
          value={filters.service}
          onChange={e => setFilter('service', e.target.value)}
          placeholder="Filter by service…"
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-1.5 focus:outline-none w-44"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            {results.length} results for <span className="text-gray-300">"{query}"</span>
          </p>
          <div className="space-y-2">
            {results.map((entry, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${SEV[entry.severity] || SEV.INFO}`}>
                      {entry.severity}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{entry.service}</span>
                    {entry.component && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span className="text-xs text-gray-500">{entry.component}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-xs text-gray-600">line {entry.line_number}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                      {(entry.score * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>
                <p className="text-sm font-mono text-gray-300 leading-relaxed break-all">{entry.raw}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <SearchIcon className="mx-auto mb-3 text-gray-700" size={36} />
          <p>No results found for "{query}"</p>
          <p className="text-sm text-gray-600 mt-1">Try rephrasing or removing filters</p>
        </div>
      )}
    </div>
  )
}
