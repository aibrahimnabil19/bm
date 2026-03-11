"use client";
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'

const navItems = [
  { href: '/', label: 'Accueil', icon: (<i className="fa-solid fa-house" aria-hidden="true" />) },
  { href: '/sonidep', label: 'Sonidep', icon: (<i className="fa-solid fa-truck-droplet" aria-hidden="true" />) },
  { href: '/stations', label: 'Station', icon: (<i className="fa-solid fa-gas-pump" aria-hidden="true" />) },
  { href: '/clients', label: 'Client', icon: (<i className="fa-solid fa-user" aria-hidden="true" />) },
  { href: '/bank', label: 'Banque', icon: (<i className="fa-solid fa-bank" aria-hidden="true" />) },
  { href: '/expenses', label: 'Depense', icon: (<i className="fa-solid fa-money-bill" aria-hidden="true" />) },
  { href: '/management', label: 'Gerence', icon: (<i className="fa-solid fa-users" aria-hidden="true" />) },
  { href: '/stats', label: 'Statistique', icon: (<i className="fa-solid fa-chart-bar" aria-hidden="true" />) },
]

export default function AdminSideBar({ className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <aside className={`bg-linear-to-b from-white to-[#e46c37] text-slate-900 ${className}`}>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center font-semibold text-white">BM</div>
          <span className="font-semibold">BM Trading</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((s) => !s)}
            className="p-2 rounded-md bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar layout for md+ or sliding panel on mobile */}
      <div className={`flex flex-col md:flex-row md:items-stretch`}> 
        {/* Drawer / sidebar */}
        <nav className={`transform md:translate-x-0 ${open ? 'translate-x-0' : ' -translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out md:w-64 w-64 md:min-h-screen bg-transparent p-6`}>
          <div className="flex flex-col items-center md:items-start gap-6">
            <Image src="/BM.png" alt="BM logo" width={96} height={96} className="w-20 rounded-md object-cover" />

            <div className="w-full">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 w-full mb-2 text-sm font-medium rounded-md px-3 py-2 hover:bg-white/20">
                  <span className="w-6 text-center text-slate-900/90">{item.icon}</span>
                  <span className="text-slate-900">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-6 w-full">
              <Link href="/logout" className="flex items-center gap-3 text-sm text-red-700 font-medium px-3 py-2 rounded-md hover:bg-white/20">
                <i className="fa-solid fa-sign-out-alt" aria-hidden="true" />
                <span className="ml-2">Déconnexion</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Transparent spacer for content (keeps layout stable on md+) */}
        <div className="flex-1 hidden md:block" />
      </div>
    </aside>
  )
}

// Example usage (page)
export function AdminLayoutPage({ children }) {
  return (
    <div className="min-h-screen flex">
      <AdminSideBar />

      <main className="flex-1 bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto"> 
          {/* replace with your page content */}
          <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
          <p className="text-sm text-slate-600">Your content goes here.</p>
        </div>
      </main>
    </div>
  )
}
