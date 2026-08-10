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

  // Auto-scroll to bottom of conversation thread on message updates
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Handle auto-focusing the text input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 300)
    }
  }, [isOpen])

  // Clear dialogue thread and error logs
  const handleClearChat = () => {
    setMessages([])
    setErrorMsg(null)
  }

  // Parse markdown code blocks in chatbot replies to render styled pre boxes
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
            className="my-3 font-mono text-xs bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"
          >
            <div className="bg-neutral-800/80 px-3 py-1 text-[10px] text-neutral-400 font-sans border-b border-neutral-700 flex justify-between items-center">
              <span>{language.toUpperCase()}</span>
            </div>
            <pre className="p-3 overflow-x-auto text-neutral-200">
              <code>{code}</code>
            </pre>
          </div>
        )
      }
      
      return (
        <span key={index} className="whitespace-pre-line leading-relaxed text-sm">
          {part}
        </span>
      )
    })
  }

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    const query = inputValue.trim()
    if (!query || isLoading) return

    // 1. Setup user message
    const userMsg = { role: 'user', content: query }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setErrorMsg(null)

    // 2. Build history payload
    const formattedHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      // 3. Fire API call
      const data = await sendChatMessage({
        message: query,
        finding_title: initialContext?.title,
        code_snippet: initialContext?.code_snippet,
        history: formattedHistory,
      })

      // 4. Update chat message and context sources
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
    // Submit on Enter, allow linebreaks on Shift+Enter
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
          className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md md:max-w-lg bg-neutral-950 border-l border-neutral-800/80 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <h3 className="font-semibold text-neutral-100 text-sm">Secoria Chat Assistant</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition"
                title="Clear conversation"
              >
                Clear Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition"
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
          <div className="px-4 py-2 bg-indigo-950/30 border-b border-indigo-900/20 text-xs text-indigo-200 flex items-center justify-between">
            <span className="truncate pr-4">
              🎯 Grounded in active finding: <strong>{initialContext.title}</strong>
            </span>
            <button
              onClick={onClearContext}
              className="text-[10px] text-indigo-400 hover:text-indigo-200 hover:underline shrink-0"
              title="Stop discussing this finding"
            >
              General Chat
            </button>
          </div>
        )}

        {/* Dialogue Scroll Window */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-950 select-text">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-full text-indigo-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h4 className="font-medium text-neutral-300 text-sm">Secure Coding Assistant</h4>
              <p className="text-neutral-500 text-xs max-w-xs">
                Ask questions about secure programming models, code review details, or vulnerability fixes. Grounded directly in OWASP reference guides.
              </p>
              {initialContext?.title && (
                <button
                  onClick={() => {
                    setInputValue(`Tell me about this issue: ${initialContext.title}. Why is it flagged, and how do I fix it?`)
                    textareaRef.current?.focus()
                  }}
                  className="mt-4 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs rounded-lg transition"
                >
                  Ask about the active finding
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
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-neutral-100 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 rounded-tr-none text-white'
                      : 'bg-neutral-900 border border-neutral-800 rounded-tl-none'
                  }`}
                >
                  <div className="prose prose-invert max-w-none">
                    {formatMessageText(msg.content)}
                  </div>

                  {/* Document Citation Links (RAG footer) */}
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-2.5 border-t border-neutral-800">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
                        Knowledge Sources
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-[10px] text-neutral-400 font-mono hover:text-neutral-200 transition"
                            title={src.content_snippet}
                          >
                            <svg className="w-2.5 h-2.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="truncate max-w-[120px]">{src.source}</span>
                            {src.page && <span className="text-neutral-500">(p. {src.page})</span>}
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
              <div className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
                <span className="text-neutral-400 text-xs">Assistant is searching guidelines</span>
                <span className="flex space-x-1">
                  <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            </div>
          )}

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
              <div className="font-semibold mb-1">Communication Failed</div>
              <p>{errorMsg}</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input box form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-neutral-900/40 border-t border-neutral-800 flex items-end space-x-2"
        >
          <div className="flex-1 bg-neutral-900 border border-neutral-800 focus-within:border-indigo-500 rounded-xl px-3 py-2 transition duration-200">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="w-full bg-transparent border-0 outline-none text-neutral-100 placeholder-neutral-500 resize-none text-sm leading-relaxed max-h-24"
              style={{ height: 'auto' }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white disabled:text-neutral-500 rounded-xl transition duration-200 flex-shrink-0"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-7-9-7-9 7 9 7z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}
