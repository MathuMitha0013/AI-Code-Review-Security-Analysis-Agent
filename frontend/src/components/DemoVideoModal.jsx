import React, { useState, useEffect } from 'react'
import defaultDemoVideo from '../assets/Screen Recording 2026-09-04 220906.mp4'

export default function DemoVideoModal({ isOpen, onClose, onLaunchApp }) {
  const [activeTab, setActiveTab] = useState('tour') // 'tour' | 'video'
  const [currentChapter, setCurrentChapter] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [customVideoUrl, setCustomVideoUrl] = useState(defaultDemoVideo)
  const [inputUrl, setInputUrl] = useState('')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const CHAPTER_DURATION = 8000 // 8 seconds per chapter at 1x
  const chapters = [
    {
      id: 'scan',
      badge: '01 / Parallel Multi-Agent Scan',
      title: 'Real-Time OWASP & AST Code Inspection',
      subtitle: 'Concurrently executes Code Quality AST & Security Vulnerability rule engine.',
      color: 'from-indigo-500 to-purple-600',
      tagColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      points: [
        'Detects SQL Injection, Command Injection (Runtime.exec / os.system), Hardcoded Secrets',
        'Computes Cyclomatic Complexity score and identifies God Objects and Deep Nesting',
        'Aggregates findings and assigns an automated 0–100 Code Health Score'
      ],
      codeSample: `// Analyzing user input flow...
String query = "SELECT * FROM users WHERE user = '" + input + "'"; // [CRITICAL] SQL Injection
Runtime.getRuntime().exec(cmd); // [CRITICAL] Command Injection
// Severity Penalty: -45 pts | Merge Gate: BLOCKED`,
      metrics: { score: '42 / 100', status: 'CRITICAL', issues: '3 Found', gate: 'BLOCKED' }
    },
    {
      id: 'remediation',
      badge: '02 / AI Auto-Remediation',
      title: '1-Click AST-Validated Auto-Patching',
      subtitle: 'Groq Llama 3.3 generates secure drop-in fixes with side-by-side diff comparison.',
      color: 'from-emerald-500 to-teal-600',
      tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      points: [
        'Generates drop-in parameterized queries and safe subprocess executions',
        'Validates target AST to prevent syntax corruption before presenting diff',
        '1-Click "Apply Remediation" writes verified fix directly to the code editor'
      ],
      codeSample: `// Secure Parameterized Remediation Applied:
PreparedStatement stmt = conn.prepareStatement(
    "SELECT * FROM users WHERE user = ?"
);
stmt.setString(1, input); // ✅ Protected against injection attacks`,
      metrics: { score: '95 / 100', status: 'SECURE', issues: '0 Remaining', gate: 'PASSED' }
    },
    {
      id: 'reports',
      badge: '03 / Multi-Format Export Hub',
      title: 'Executive PDF, HTML & DevSecOps Exports',
      subtitle: 'Download professional 2-pass ReportLab PDF reports with SLA resolution matrix.',
      color: 'from-amber-500 to-rose-600',
      tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      points: [
        'Executive PDF with dynamic "Page X of Y" canvas, SLA matrix, & remediation roadmap',
        'Interactive Standalone HTML with embedded dark-mode styling and print CSS',
        'DevSecOps JSON, GitHub-flavored Markdown, and CSV tabular spreadsheets'
      ],
      codeSample: `📄 secoria_security_audit_report_20260906.pdf
├── 1. Executive Summary & Code Health Gauge (95/100)
├── 2. Vulnerability Breakdown & SLA Resolution Matrix
├── 3. Detailed Findings Inventory (OWASP A03 / CWE-89)
└── 4. Actionable 4-Phase Remediation Roadmap`,
      metrics: { formats: '5 Formats', pages: 'Page 1 of 2', standard: 'OWASP Top 10', readiness: 'Audit Ready' }
    },
    {
      id: 'pr-bot',
      badge: '04 / GitHub PR Bot & CI/CD',
      title: 'Automated Pull Request Review Webhook',
      subtitle: 'Paste any GitHub PR URL or trigger webhook on commit to review diffs automatically.',
      color: 'from-purple-500 to-pink-600',
      tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      points: [
        'Parses unified git diffs directly from GitHub Pull Request URLs',
        'Posts automated line-by-line security feedback directly to GitHub PR discussion',
        'Enforces CI/CD merge gating for Python (.py) and Java (.java) codebases'
      ],
      codeSample: `// Secoria GitHub PR Review Bot Output:
🤖 Secoria AI Review: Found 1 Critical Vulnerability in PR #42
📍 Line 15 (src/main/App.java): Possible SQL Injection
❌ Merge Gate: BLOCKED (Remediate before merging to main)`,
      metrics: { pr: 'PR #42', diff: '14 Lines Added', review: 'Automated', merge: 'Gate Active' }
    }
  ]

  // Auto-play timer for interactive walkthrough
  useEffect(() => {
    if (!isOpen || activeTab !== 'tour' || !isPlaying) return

    const interval = 50 // update every 50ms
    const step = (interval / (CHAPTER_DURATION / playbackSpeed)) * 100

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentChapter(c => (c + 1) % chapters.length)
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isOpen, activeTab, isPlaying, currentChapter, playbackSpeed, chapters.length])

  // Reset progress when chapter changes manually
  const selectChapter = (index) => {
    setCurrentChapter(index)
    setProgress(0)
  }

  const handleNext = () => {
    setCurrentChapter(c => (c + 1) % chapters.length)
    setProgress(0)
  }

  const handlePrev = () => {
    setCurrentChapter(c => (c - 1 + chapters.length) % chapters.length)
    setProgress(0)
  }

  if (!isOpen) return null

  const activeChapterData = chapters[currentChapter]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-indigo-500/20 text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-brand tracking-wide">
                  SECORIA AI PLATFORM DEMO
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Interactive Tour
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Experience automated code security scanning, AI auto-remediation & report generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
              <button
                onClick={() => { setActiveTab('tour'); setIsPlaying(true); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'tour'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎬 Interactive Tour
              </button>
              <button
                onClick={() => { setActiveTab('video'); setIsPlaying(false); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📹 Video / Embed
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'tour' ? (
            <>
              {/* Chapter Navigation Scrubber */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {chapters.map((ch, idx) => {
                  const isActive = idx === currentChapter
                  return (
                    <button
                      key={ch.id}
                      onClick={() => selectChapter(idx)}
                      className={`relative text-left p-3 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                          : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-700'
                      }`}
                    >
                      {/* Active chapter progress fill */}
                      {isActive && (
                        <div
                          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all ease-linear"
                          style={{ width: `${progress}%` }}
                        />
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          0{idx + 1}
                        </span>
                        {isActive && (
                          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {ch.title.split(' ')[0]} {ch.title.split(' ')[1]}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {ch.id === 'scan' ? 'OWASP & AST' : ch.id === 'remediation' ? '1-Click Fix' : ch.id === 'reports' ? 'PDF & Reports' : 'PR Review Bot'}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Main Simulated Stage */}
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-0" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Side: Chapter Information & Features */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border border-slate-700 bg-slate-900 text-indigo-400">
                      <span>{activeChapterData.badge}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {activeChapterData.title}
                    </h2>

                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {activeChapterData.subtitle}
                    </p>

                    <ul className="space-y-2.5 pt-2">
                      {activeChapterData.points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                            ✓
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Metrics Badge Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                      {Object.entries(activeChapterData.metrics).map(([k, v]) => (
                        <div key={k} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 text-center">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {k}
                          </div>
                          <div className="text-xs font-bold text-white mt-0.5 truncate">
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side: Animated Code / Feature Showcase Terminal */}
                  <div className="lg:col-span-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
                      {/* Window titlebar */}
                      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-slate-950/70">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <span className="ml-2 text-[11px] font-mono text-slate-400">
                            secoria-live-agent-simulation.py
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          LIVE SIMULATION
                        </span>
                      </div>

                      {/* Monospace Code Visualizer */}
                      <div className="p-4 font-mono text-xs text-slate-200 bg-slate-950 overflow-x-auto leading-relaxed">
                        <pre className="text-emerald-400 whitespace-pre-wrap">{activeChapterData.codeSample}</pre>
                      </div>

                      {/* Live Action Status Footer */}
                      <div className="border-t border-slate-800 px-4 py-2 bg-slate-900/90 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>Status: Processing AST tokens</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-400">
                          Groq Llama 3.3 + ChromaDB
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          ) : (
            /* Video / Embed Player View */
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl text-center">
                <p className="text-xs text-slate-400 mb-3">
                  Paste a direct video link (<code className="text-indigo-400">.mp4</code>, <code className="text-indigo-400">.webm</code>) or YouTube embed URL below to stream custom video:
                </p>
                <div className="flex gap-2 max-w-xl mx-auto">
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/embed/YOUR_VIDEO_ID or /demo.mp4"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setCustomVideoUrl(inputUrl)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Load Video
                  </button>
                </div>
              </div>

              {/* Video Player Display */}
              <div className="aspect-video w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex items-center justify-center">
                {customVideoUrl ? (
                  customVideoUrl.includes('youtube.com') || customVideoUrl.includes('youtu.be') ? (
                    <iframe
                      src={customVideoUrl}
                      title="Secoria Demo Video"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={customVideoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                    >
                      Your browser does not support HTML5 video.
                    </video>
                  )
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-white">Custom Video Player Ready</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Switch to the <strong>"Interactive Tour"</strong> tab above for an animated live demo, or enter your video URL to stream recorded walkthroughs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Player Controls Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4">
          {activeTab === 'tour' ? (
            <div className="flex items-center gap-3">
              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Prev / Next buttons */}
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Previous Chapter"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Next Chapter"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Speed Switcher */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold ml-2">
                <span>Speed:</span>
                {[1, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      playbackSpeed === speed
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Playing custom video presentation
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose()
                if (onLaunchApp) onLaunchApp()
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              <span>Launch Live Reviewer</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
