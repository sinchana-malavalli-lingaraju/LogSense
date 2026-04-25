import { useEffect, useState } from 'react'
import {
  Bar, BarChart, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Activity, AlertTriangle, Layers, Server } from 'lucide-react'
import { getAnalytics, getSessions } from '../api/client'

const SEV_COLORS = { ERROR: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' }
const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316']

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#d1d5db' },
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessions()
      .then(({ data }) => setSessions(data.filter(s => s.status === 'completed')))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getAnalytics(selectedSession ? { session_id: selectedSession } : {})
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedSession])

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Loading analytics…
      </div>
    )
  }

  if (!data || data.total_logs === 0) {
    return (
      <div className="p-6 text-center py-20 text-gray-500">
        <Activity className="mx-auto mb-3 text-gray-700" size={40} />
        <p>No data yet — upload a log file to see analytics.</p>
      </div>
    )
  }

  const severityData = data.severities.map(s => ({ ...s, fill: SEV_COLORS[s.name] || '#6b7280' }))
  const errorCount = data.severities.find(s => s.name === 'ERROR')?.count ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm">Log distribution and error patterns</p>
        </div>
        <select
          value={selectedSession}
          onChange={e => setSelectedSession(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-1.5 focus:outline-none"
        >
          <option value="">All sessions</option>
          {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.filename}</option>)}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Logs', value: data.total_logs.toLocaleString(), icon: Activity, color: 'text-blue-400' },
          { label: 'Errors', value: errorCount.toLocaleString(), icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Services', value: data.services.length, icon: Server, color: 'text-green-400' },
          { label: 'Components', value: data.components.length, icon: Layers, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={color} size={15} />
              <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Severity pie */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={severityData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                strokeWidth={0}
              >
                {severityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                formatter={val => <span className="text-xs text-gray-400">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Services bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Services</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.services.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={75} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.services.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top errors table */}
      {data.top_errors.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Most Frequent Errors</h2>
          <div className="space-y-1">
            {data.top_errors.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0"
              >
                <span className="text-xs text-gray-600 w-5 text-right shrink-0">{i + 1}</span>
                <span className="text-xs font-mono text-red-400 bg-red-950/40 px-2 py-0.5 rounded shrink-0">
                  {e.service}
                </span>
                <span className="text-xs text-gray-300 flex-1 font-mono truncate" title={e.message}>
                  {e.message}
                </span>
                <span className="text-xs text-gray-500 shrink-0">×{e.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Components bar */}
      {data.components.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Components</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.components.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.components.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[(i + 3) % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
