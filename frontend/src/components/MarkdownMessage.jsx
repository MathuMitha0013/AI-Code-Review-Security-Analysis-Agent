import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const codeContent = String(children).replace(/\n$/, '')

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If inline code (no explicit language and no newlines)
  if (!match && !String(children).includes('\n')) {
    return (
      <code className="px-1.5 py-0.5 mx-0.5 rounded bg-[var(--color-bg-subtle)] text-indigo-300 font-mono text-[11px] border border-[var(--color-border)]">
        {children}
      </code>
    )
  }

  return (
    <div className="my-3 font-mono text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
      <div className="bg-[var(--color-bg-subtle)] px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] font-mono border-b border-[var(--color-border)] flex justify-between items-center select-none">
        <span className="font-bold uppercase tracking-wider text-indigo-400/90">{language || 'CODE'}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center space-x-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] px-2 py-0.5 rounded transition-all cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[var(--color-text-primary)] leading-relaxed text-xs">
        <code>{codeContent}</code>
      </pre>
    </div>
  )
}

export default function MarkdownMessage({ content, isUser = false }) {
  if (!content) return null

  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">{content}</div>
  }

  return (
    <div className="markdown-content text-xs sm:text-sm leading-relaxed text-[var(--color-text-primary)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            return <CodeBlock className={className} {...props}>{children}</CodeBlock>
          },
          h1({ children }) {
            return <h1 className="text-base font-bold text-[var(--color-text-primary)] mt-3 mb-1.5 pb-1 border-b border-[var(--color-border)]">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-sm font-bold text-[var(--color-text-primary)] mt-3 mb-1">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-xs sm:text-sm font-semibold text-indigo-300 mt-2.5 mb-1 flex items-center gap-1.5">{children}</h3>
          },
          h4({ children }) {
            return <h4 className="text-xs font-semibold text-[var(--color-text-primary)] mt-2 mb-1">{children}</h4>
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          },
          ul({ children }) {
            return <ul className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-400">{children}</ul>
          },
          ol({ children }) {
            return <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-400">{children}</ol>
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },
          table({ children }) {
            return (
              <div className="my-2.5 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">{children}</thead>
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-[var(--color-border)]/40">{children}</tbody>
          },
          tr({ children }) {
            return <tr className="hover:bg-indigo-500/5 transition-colors">{children}</tr>
          },
          th({ children }) {
            return <th className="px-3 py-2 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{children}</th>
          },
          td({ children }) {
            return <td className="px-3 py-2 text-xs text-[var(--color-text-primary)] leading-normal">{children}</td>
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 pl-3 py-1 border-l-2 border-indigo-500 bg-indigo-500/10 text-xs italic text-[var(--color-text-secondary)] rounded-r">
                {children}
              </blockquote>
            )
          },
          strong({ children }) {
            return <strong className="font-semibold text-indigo-200">{children}</strong>
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                {children}
              </a>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
