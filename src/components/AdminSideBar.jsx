"use client";

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { navItems } from '../lib/navItems'

export default function AdminSideBar({ className = '', open = true, onClose = () => {} }) {
  // Note: this keeps your original markup and classes. We only remove the mobile topbar
  // so the header can be the single place that controls the mobile toggle (as you asked).
  return (
    <aside className={`w-0 md:w-64 md:shrink-0 text-slate-900 ${className}`}>    
      <nav className={`fixed top-0 left-0 bottom-0 w-64 z-40 p-6 bg-linear-to-b from-white to-[#e46c37] transform transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-full md:min-h-screen md:bottom-auto`}>        
        <div className="flex flex-col items-center md:items-start gap-6">
          <div className="w-full flex items-center justify-between md:justify-start">
            <Image src="/BM.png" alt="BM logo" width={96} height={96} className="w-20 rounded-md object-cover" />
            {/* mobile close button (keeps existing design) */}
            <button className="md:hidden p-2 rounded-md bg-white/10" onClick={onClose} aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="w-full">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 w-full mb-2 text-sm font-medium rounded-md px-3 py-2 hover:bg-white/20" onClick={() => onClose()}>
                <span className="w-6 text-center text-slate-900/90"><i className={item.iconClass} aria-hidden="true" /></span>
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

      {/* backdrop when open on mobile */}
      <div aria-hidden={!open} onClick={onClose} className={`fixed inset-0 bg-black/40 z-30 ${open ? 'block md:hidden' : 'hidden'}`} />
    </aside>
  )
}
