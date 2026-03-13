"use client";

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { navItems } from '../lib/navItems'

export default function AdminSideBar({ open = false, onClose = () => {} }) {
  return (
    <>
      {/* 1. MOBILE OVERLAY (The Drawer) */}
      <div 
        className={`fixed inset-0 z-50 md:hidden transition-visibility duration-300 ${open ? 'visible' : 'invisible'}`}
      >
        {/* Backdrop - dims the background */}
        <div 
          onClick={onClose}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} 
        />
        
        {/* Actual Drawer */}
        <nav className={`absolute top-0 left-0 bottom-0 w-64 bg-linear-to-b from-white to-[#e46c37] p-6 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-8">
             <Image src="/BM.png" alt="BM logo" width={80} height={80} className="rounded-md" />
             <button onClick={onClose} className="p-2 text-slate-500"><i className="fa-solid fa-xmark text-xl"></i></button>
          </div>
          <NavLinks onClose={onClose} />
        </nav>
      </div>

      {/* 2. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r bg-linear-to-b from-white to-[#e46c37] p-6 shrink-0">
        <div className="mb-8">
          <Image src="/BM.png" alt="BM logo" width={96} height={96} className="rounded-md" />
        </div>
        <NavLinks />
      </aside>
    </>
  )
}

// Sub-component to avoid repeating the menu list
function NavLinks({ onClose }) {
  return (
    <div className="flex flex-col gap-2">
      {navItems.map((item) => (
        <Link 
          key={item.href} 
          href={item.href} 
          onClick={() => onClose?.()}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100 transition-colors"
        >
          <span className="w-5 text-center"><i className={item.iconClass} /></span>
          <span>{item.label}</span>
        </Link>
      ))}
      <Link href="/logout" className="flex items-center gap-3 px-3 py-2 mt-4 text-sm font-medium text-red-600 rounded-md hover:bg-red-50">
        <i className="fa-solid fa-sign-out-alt" />
        <span>Déconnexion</span>
      </Link>
    </div>
  )
}