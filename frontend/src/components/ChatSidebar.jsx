import React, { useState, useEffect, useRef } from 'react'
import { sendChatMessage } from '../services/api'

export default function ChatSidebar({
  isOpen,
  onClose,
  initialContext,
  onClearContext,
}) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 300)
    }
  }, [isOpen])

  const handleClearChat = () => {
    setMessages([])
    setErrorMsg(null)
  }

  const formatMessageText = (text) => {
    if (!text) return null
    const parts = text.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.split('\n')
        const firstLine = lines[0].replace('```', '').trim()
        const language = firstLine || 'code'
        const code = lines.slice(1, -1).join('\n')
        
        return (
          <div
            key={index}
            className="my-3 font-mono text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm"
          >
            <div className="bg-[var(--color-bg-subtle)] px-3 py-1 text-[10px] text-[var(--color-text-muted)] font-mono border-b border-[var(--color-border)] flex justify-between items-center">
              <span>{language.toUpperCase()}</span>
            </div>
            <pre className="p-3 overflow-x-auto text-[var(--color-text-primary)]">
              <code>{code}</code>
            </pre>
          </div>
        )
      }
      
      return (
        <span key={index} className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
          {part}
        </span>
      )
    })
  }

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    const query = inputValue.trim()
    if (!query || isLoading) return

    const userMsg = { role: 'user', content: query }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setErrorMsg(null)

    const formattedHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const data = await sendChatMessage({
        message: query,
        finding_title: initialContext?.title,
        code_snippet: initialContext?.code_snippet,
        history: formattedHistory,
      })

      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        sources: data.sources || [],
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred while communicating with the assistant.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md md:max-w-lg bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-sm">Secoria Assistant</h3>
              <p className="text-[10px] text-[var(--color-text-muted)]">RAG Grounded in OWASP Knowledge Base</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] rounded-lg transition-colors cursor-pointer"
                title="Clear conversation"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--color-bg)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grounded context indicator */}
        {initialContext?.title && (
          <div className="px-4 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-indigo-400 flex items-center justify-between">
            <span className="truncate pr-3 font-medium">
              🎯 Active Finding: <strong>{initialContext.title}</strong>
            </span>
            <button
              onClick={onClearContext}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline shrink-0 cursor-pointer"
              title="Switch to general Q&A"
            >
              General Chat
            </button>
          </div>
        )}

        {/* Dialogue Scroll Window */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-bg)] select-text">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h4 className="font-bold text-[var(--color-text-primary)] text-sm">Secure Coding Assistant</h4>
              <p className="text-[var(--color-text-secondary)] text-xs max-w-xs leading-relaxed">
                Ask questions about secure coding practices, vulnerability remediation, or code quality standards grounded directly in 10 OWASP cheat sheets.
              </p>
              {initialContext?.title && (
                <button
                  onClick={() => {
                    setInputValue(`Explain why "${initialContext.title}" is a security risk and how to properly remediate it.`)
                    textareaRef.current?.focus()
                  }}
                  className="mt-4 px-3.5 py-2 bg-[var(--color-surface)] border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Ask about the active finding →
                </button>
              )}
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble */}
                <div
                  className={`max-w-[88%] px-4 py-3 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 rounded-tr-none text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-tl-none text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="leading-relaxed">
                    {formatMessageText(msg.content)}
                  </div>

                  {/* Document Citation Links (RAG footer) */}
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-[var(--color-border)]">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-1.5">
                        Knowledge Base Sources
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[10px] text-[var(--color-text-secondary)] font-mono"
                            title={src.content_snippet}
                          >
                            <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="truncate max-w-[130px]">{src.source}</span>
                            {src.page && <span className="text-[var(--color-text-muted)]">(p. {src.page})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loader bubble */}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-2.5 shadow-sm">
                <span className="text-[var(--color-text-secondary)] text-xs font-medium">Searching knowledge base</span>
                <span className="flex space-x-1">
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            </div>
          )}

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs">
              <div className="font-bold mb-0.5">Communication Error</div>
              <p>{errorMsg}</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input box form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-end space-x-2"
        >
          <div className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 rounded-2xl px-3.5 py-2.5 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about secure coding, OWASP rules..."
              className="w-full bg-transparent border-0 outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none text-xs sm:text-sm leading-relaxed max-h-24"
              style={{ height: 'auto' }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-2xl shadow-md shadow-indigo-500/20 transition-all flex-shrink-0 cursor-pointer"
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}
