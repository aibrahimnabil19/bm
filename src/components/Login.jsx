"use client";
import React, { useState } from 'react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Please enter both username and password.')
      return
    }
    console.log('logging in', { username, password })
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-4xl w-full bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">

        {/* Left: Illustration / brand */}
        <div className="hidden md:flex flex-col items-start justify-center gap-6 p-10 bg-linear-to-br from-blue-600 to-indigo-700 text-white">
          <div className="text-3xl font-semibold tracking-tight">BM Trading</div>
          <p className="text-sm opacity-90 max-w-xs">Bon retour, connectez-vous pour gérer vos stations, consulter vos rapports et reprendre là où vous vous étiez arrêté.</p>

          <div className="rounded-lg bg-white/10 p-4">
            <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="6" y="6" width="148" height="88" rx="10" stroke="white" strokeOpacity="0.18" />
              <circle cx="40" cy="50" r="16" stroke="white" strokeOpacity="0.18" />
              <rect x="68" y="36" width="64" height="28" rx="6" stroke="white" strokeOpacity="0.12" />
            </svg>
          </div>
        </div>

        {/* Right: Form */}
        <div className="p-8 md:p-10 flex items-center justify-center">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Bienvenue</h2>
            <p className="text-sm text-slate-500 mb-6">Connectez-vous à votre tableau de bord</p>

            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-slate-600 mb-1">Nom d&apos;utilisateur</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="Votre nom d'utilisateur"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                    placeholder="••••••••"
                    aria-describedby="togglePassword"
                  />

                  <button
                    type="button"
                    id="togglePassword"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-sm text-slate-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Cacher' : 'Afficher'}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="text-sm text-red-600">{error}</div>
              )}

              <div className="flex items-center justify-between">
                <a href="#" className="text-sm text-indigo-600 hover:underline">Mot de passe oublié?</a>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-3 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              >
                Se connecter
              </button>

            </form>

            <p className="mt-6 text-xs text-slate-400">En continuant, vous acceptez nos conditions d&apos;utilisation et notre politique de confidentialité.</p>
          </div>
        </div>

      </section>
    </main>
  )
}
