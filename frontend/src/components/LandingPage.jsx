import React, { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import logoDark from '../assets/logo-dark.png'

export default function LandingPage({ onLaunchApp, onSelectSample }) {
  const agents = [
    {
      id: 'code-analysis',
      icon: (
        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: 'Code Analysis Agent',
      badge: 'AST & Radon Engine',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30',
      description: 'Calculates cyclomatic & cognitive complexity metrics, identifies code smells, detects God Objects, and spots deep nesting anti-patterns in Python and Java.',
      tags: ['Cyclomatic Complexity', 'Cognitive Load', 'Code Smells', 'Maintainability Index']
    },
    {
      id: 'security-agent',
      icon: (
        <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Security Vulnerability Agent',
      badge: 'OWASP Top 10',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
      description: 'Scans source code against OWASP standards — detecting SQL Injection, Command Injection, Weak Cryptography (MD5/SHA1), Hardcoded Secrets, and Insecure Deserialization.',
      tags: ['SQLi', 'XSS & CSRF', 'Hardcoded Secrets', 'Weak Crypto', 'Insecure Deserialization']
    },
    {
      id: 'orchestrator',
      icon: (
        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Multi-Agent Orchestrator',
      badge: 'Concurrent Dispatch',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
      description: 'Dispatches static analysis and security scanning concurrently using async routines, merges findings, deduplicates overlapping issues, and computes a 0–100 Code Health Score.',
      tags: ['Async Concurrency', 'Deduplication', 'Priority Ranking', 'Health Scoring (0-100)']
    },
    {
      id: 'remediation',
      icon: (
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      title: 'Remediation Agent',
      badge: 'Groq Llama 3.3',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
      description: 'On-demand GenAI integration generating production-ready corrected code diffs, plain-language vulnerability explanations, and architectural best practice recommendations.',
      tags: ['Corrected Code Diffs', 'Vulnerability Explanations', 'Groq Fast Inference', 'Best Practices']
    },
    {
      id: 'rag-chat',
      icon: (
        <svg className="w-6 h-6 text-sky-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: 'Conversational RAG Assistant',
      badge: 'ChromaDB + OWASP KB',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30',
      description: 'RAG-powered interactive code assistant answering complex security queries grounded in 306 indexed vector chunks from official OWASP Cheat Sheets and reference guides.',
      tags: ['Offline Vector Store', 'Semantic Search', 'Grounding & Citations', 'Interactive Chat']
    },
    {
      id: 'pr-summary',
      icon: (
        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'PR Summary & Report Module',
      badge: 'PDF & Markdown Export',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
      description: 'Produces developer-friendly GitHub/GitLab Pull Request review markdown summaries and professional server-generated ReportLab PDF code audit reports with severity tables.',
      tags: ['ReportLab PDF', 'PR Review Markdown', 'CSV Findings Export', 'Severity Breakdown']
    }
  ]

  const metrics = [
    { value: '5', label: 'AI Agents Coordinated', desc: 'Parallel Analysis & Security' },
    { value: '306+', label: 'OWASP Chunks', desc: 'Vector Embeddings in ChromaDB' },
    { value: '0 - 100', label: 'Code Health Score', desc: 'Multi-Agent Weighted Scoring' },
    { value: '< 2.0s', label: 'Average Review Time', desc: 'Fast Async Python Engine' },
  ]

  const workflowSteps = [
    {
      num: '01',
      title: 'Code Input & AST Parsing',
      desc: 'Paste code or upload .py / .java files. Secoria validates syntax, identifies target grammar, and builds abstract syntax trees.'
    },
    {
      num: '02',
      title: 'Parallel Multi-Agent Scan',
      desc: 'Code Analysis and Security Agents concurrently detect structural smells, calculate cyclomatic metrics, and match OWASP rules.'
    },
    {
      num: '03',
      title: 'Health Scoring & Deduplication',
      desc: 'The Orchestrator deduplicates overlapping findings, weights severity penalties, and computes an overall code health rating.'
    },
    {
      num: '04',
      title: 'AI Remediation & Grounded RAG',
      desc: 'Groq Llama 3.3 produces instant drop-in code fixes, PR summaries, and the RAG assistant answers questions with cited OWASP docs.'
    }
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg)] bg-grid-matrix text-[var(--color-text-primary)] transition-colors">
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            {/* Vibrant Blue 3D Logo & Title */}
            <div className="flex items-center gap-3">
              <img
                src={logoDark}
                alt="Secoria Logo"
                className="h-9 w-auto drop-shadow-[0_2px_12px_rgba(99,102,241,0.35)] transition-transform hover:scale-105"
              />
              <div className="flex items-baseline gap-2.5">
                <span className="text-xl font-black tracking-widest text-[var(--color-text-primary)] font-brand">
                  SECORIA
                </span>
                <span className="hidden lg:inline text-xs font-semibold text-[var(--color-text-secondary)] border-l border-[var(--color-border)] pl-2.5">
                  Smart Code Inspection Platform
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[var(--color-text-secondary)]">
              <a href="#agents" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Architecture</a>
              <a href="#workflow" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Workflow</a>
              <a href="#demo-samples" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Demo Samples</a>
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <button
                onClick={onLaunchApp}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-4 py-2 text-sm font-bold shadow-md shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Launch Reviewer</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-20 md:pt-16 md:pb-28">
        {/* Radiant Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-sky-400/10 blur-[90px] rounded-full pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-6 text-center">
          {/* Platform Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/90 dark:border-indigo-500/30 dark:bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-6 backdrop-blur-md shadow-xs">
            <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            <span>⚡ Automated Multi-Agent Code Audit Platform</span>
          </div>

          {/* Prominent Blue 3D Logo Centerpiece */}
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/25 blur-3xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
              <img
                src={logoDark}
                alt="Secoria Shield"
                className="relative h-24 sm:h-32 md:h-40 w-auto drop-shadow-[0_14px_36px_rgba(99,102,241,0.45)] transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>

          {/* Primary Brand Name — Pure Text using font-brand (Orbitron) */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest font-brand my-4">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
              SECORIA
            </span>
          </h1>
          
          <div className="mt-3.5 mx-auto max-w-4xl">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[var(--color-text-primary)] leading-snug">
              Development of Smart Code Inspection Platform with Vulnerability Detection System
            </h2>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed font-medium">
            An intelligent multi-agent platform that automatically reviews Python & Java source code for quality issues, complexity anti-patterns, and OWASP-standard security vulnerabilities with instant AI remediation and grounded RAG guidance.
          </p>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onLaunchApp}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-7 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/30 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/40 cursor-pointer"
            >
              <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Launch Live Code Reviewer</span>
            </button>
            <a
              href="#demo-samples"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-7 py-4 text-base font-bold text-[var(--color-text-primary)] shadow-sm transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 cursor-pointer"
            >
              <span>Explore Demo Samples</span>
              <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          {/* Interactive IDE Mockup Preview */}
          <div className="mt-14 mx-auto max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-indigo-500/10 overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-bg-subtle)]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/90 ring-1 ring-rose-500/30" />
                <span className="h-3 w-3 rounded-full bg-amber-500/90 ring-1 ring-amber-500/30" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/90 ring-1 ring-emerald-500/30" />
                <span className="ml-2 text-xs font-mono font-medium text-[var(--color-text-secondary)]">secoria-review-pipeline.py</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                  Health Score: 85/100
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30">
                  1 Security Risk
                </span>
              </div>
            </div>

            <div className="p-5 font-mono text-xs sm:text-sm bg-slate-950 text-slate-200 overflow-x-auto leading-relaxed shadow-inner">
              <div className="text-slate-500"># Secoria Live Inspection Engine (Python & Java)</div>
              <div><span className="text-purple-400 font-semibold">import</span> sqlite3, os</div>
              <div className="mt-1"><span className="text-purple-400 font-semibold">def</span> <span className="text-blue-400 font-semibold">authenticate_user</span>(db_conn, username, password):</div>
              <div className="bg-rose-950/50 border-l-2 border-rose-500 pl-3 py-1 my-1 -ml-3 flex items-center justify-between">
                <span className="text-rose-200">    query = <span className="text-amber-300">"SELECT * FROM users WHERE name='"</span> + username + <span className="text-amber-300">"'"</span></span>
                <span className="text-[10px] text-rose-300 font-sans font-bold bg-rose-900/80 px-2 py-0.5 rounded">OWASP A03: SQL Injection</span>
              </div>
              <div>    cursor = db_conn.cursor()</div>
              <div>    cursor.execute(query)</div>
              <div>    <span className="text-purple-400 font-semibold">return</span> cursor.fetchone()</div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-sans text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Remediation Agent: <strong>Groq Llama 3.3</strong> suggested fix ready</span>
                </div>
                <button
                  onClick={() => onSelectSample('security')}
                  className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer underline underline-offset-2"
                >
                  Load this sample in Reviewer →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Metrics Banner */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/70 py-12 shadow-xs">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {metrics.map((m, idx) => (
              <div key={idx} className="text-center p-3">
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-heading">
                  {m.value}
                </div>
                <div className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                  {m.label}
                </div>
                <div className="mt-0.5 text-xs text-[var(--color-text-secondary)] font-medium">
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Multi-Agent Architecture (5 Agents) */}
      <section id="agents" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30">
              Core Intelligence
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
              Multi-Agent Collaborative Pipeline
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)] font-medium">
              Rather than a single monolithic script, Secoria deploys coordinated, specialized agents communicating via stable data contracts.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="premium-card group rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 group-hover:scale-110 transition-transform">
                      {agent.icon}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${agent.badgeColor}`}>
                      {agent.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-[var(--color-text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {agent.title}
                  </h3>

                  <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed font-medium">
                    {agent.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-1.5">
                  {agent.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 4-Step Operational Flow */}
      <section id="workflow" className="py-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
              Inspection Lifecycle
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
              How Secoria Operates in Real-Time
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)] font-medium">
              End-to-end automation from raw file ingestion to intelligent remediation and grounding.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="premium-card rounded-2xl p-6 flex flex-col"
              >
                <div className="text-2xl font-black text-indigo-600/40 dark:text-indigo-400/40 mb-3 font-mono">
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1 font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Demo Samples Showcase */}
      <section id="demo-samples" className="py-20 border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              Ready-To-Test Suite
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
              Try Pre-Built Code Complexity Tiers
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)] font-medium">
              Click any sample below to immediately load it into the reviewer and test the multi-agent detection accuracy.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sample 1: Clean */}
            <div className="premium-card rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/30 p-6 flex flex-col justify-between hover:border-emerald-500/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                    Health Score: 100/100
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">Tier 1</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  01 Clean & Secure Code
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
                  Demonstrates parameterized SQL queries, modular methods, and strict clean code standards.
                </p>
              </div>
              <button
                onClick={() => onSelectSample('clean')}
                className="mt-6 w-full rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 font-bold py-3 text-sm shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
              >
                Load Clean Sample →
              </button>
            </div>

            {/* Sample 2: Smells */}
            <div className="premium-card rounded-2xl border-2 border-amber-500/30 dark:border-amber-500/30 p-6 flex flex-col justify-between hover:border-amber-500/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
                    Health Score: ~70/100
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">Tier 2</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  02 Code Smells & Complexity
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
                  Demonstrates high cyclomatic complexity, deep conditional nesting, and long methods.
                </p>
              </div>
              <button
                onClick={() => onSelectSample('smells')}
                className="mt-6 w-full rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 font-bold py-3 text-sm shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
              >
                Load Complexity Sample →
              </button>
            </div>

            {/* Sample 3: Security Risks */}
            <div className="premium-card rounded-2xl border-2 border-rose-500/30 dark:border-rose-500/30 p-6 flex flex-col justify-between hover:border-rose-500/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30">
                    Health Score: &lt; 50/100
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">Tier 3</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  03 Critical OWASP Risks
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
                  Contains SQLi, command injection, hardcoded credentials, weak MD5 crypto, and unsafe pickle deserialization.
                </p>
              </div>
              <button
                onClick={() => onSelectSample('security')}
                className="mt-6 w-full rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 font-bold py-3 text-sm shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
              >
                Load Vulnerability Sample →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Call-To-Action Banner */}
      <section className="py-16 border-t border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] to-indigo-500/10">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
            Ready to Inspect Your Code?
          </h2>
          <p className="mt-3 text-[var(--color-text-secondary)] max-w-xl mx-auto font-medium">
            Test your Python or Java files against comprehensive OWASP security rules and complexity analyzers right now.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={onLaunchApp}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all cursor-pointer"
            >
              <span>Launch Secoria Reviewer Workspace</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-[var(--color-text-secondary)]">
          <div>
            <span className="font-bold text-[var(--color-text-primary)]">Secoria</span> — Development of Smart Code Inspection Platform with Vulnerability Detection System
          </div>
          <div className="flex items-center gap-4">
            <span>AI Code Review & Security Analysis Agent</span>
            <span>•</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
