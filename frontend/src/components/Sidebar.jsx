import { NavLink } from 'react-router-dom'
import { Upload, MessageSquare, Search, BarChart2, Zap } from 'lucide-react'

const nav = [
  { to: '/upload', icon: Upload, label: 'Ingest Logs' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/search', icon: Search, label: 'Semantic Search' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="text-blue-400" size={20} />
          <span className="text-lg font-bold text-white">LogSense</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">GenAI Debug Assistant</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">Powered by Ollama + RAG</p>
      </div>
    </aside>
  )
}
