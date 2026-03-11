// Header.jsx
import React from 'react'

export default function Header() {
  return (
    <header className="w-full bg-white/0">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center sm:flex-row sm:justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white bg-indigo-600">
            BM
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 leading-none">
            BM Trading
          </h1>
        </div>

        {/* Welcome text */}
        <p className="text-sm text-slate-600">
          Bienvenue
        </p>
      </div>
    </header>
  )
}