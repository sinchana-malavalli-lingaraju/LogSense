import { useEffect, useRef, useState } from 'react'
import { Bot, FileText, Send, User, Zap } from 'lucide-react'
import { getSessions, sendChat } from '../api/client'

const SUGGESTIONS = [
  'What errors are occurring most frequently?',
  'Why is the semaphore failing in evtsrv?',
  'What does HPM FRU invalid board info area mean?',
  'Summarize the root causes of failures in this log',
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    getSessions()
      .then(({ data }) => setSessions(data.filter(s => s.status === 'completed')))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const { data } = await sendChat({
        message: msg,
        history: messages,
        session_id: selectedSession || undefined,
      })
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response, context: data.context },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error: could not reach the AI service. Is Ollama running?' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">AI Debug Chat</h1>
          <p className="text-xs text-gray-500">RAG-powered root-cause analysis</p>
        </div>
        <select
          value={selectedSession}
          onChange={e => setSelectedSession(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="">All log files</option>
          {sessions.map(s => (
            <option key={s.session_id} value={s.session_id}>
              {s.filename}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-10">
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-6 mb-6">
              <Zap className="text-blue-400 mx-auto mb-2" size={32} />
              <p className="text-white font-semibold">Ask me about your logs</p>
              <p className="text-gray-400 text-sm mt-1 max-w-xs">
                I'll find the most relevant log entries and explain what's happening.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-gray-400 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 hover:border-gray-600 hover:text-gray-200 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <Bot className="text-blue-400 mt-1 shrink-0" size={20} />
            )}
            <div className="max-w-2xl">
              <div
                className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.context?.length > 0 && (
                <details className="mt-2 ml-1">
                  <summary className="text-xs text-gray-500 cursor-pointer flex items-center gap-1.5 select-none hover:text-gray-400">
                    <FileText size={11} />
                    {msg.context.length} source log lines used
                  </summary>
                  <div className="mt-1.5 bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs font-mono text-gray-400 max-h-52 overflow-y-auto space-y-0.5">
                    {msg.context.map((e, j) => (
                      <div key={j}>
                        <span className="text-gray-600 select-none">[{e.line_number}] </span>
                        {e.raw}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            {msg.role === 'user' && (
              <User className="text-gray-500 mt-1 shrink-0" size={20} />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <Bot className="text-blue-400 mt-1 shrink-0" size={20} />
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-6 py-4 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about errors, root causes, service failures…"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
