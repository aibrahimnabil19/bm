"use client";

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { navItems } from '../lib/navItems'

export default function AdminHeader({ onToggle = () => {} }) {
  const pathname = usePathname()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const active = navItems.find((n) => pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href))) || navItems[0]

  const formatDateTime = (date) => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }

  return (
    <header className="w-full h-16 flex items-center justify-between bg-white border-b px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onToggle} aria-label="Open menu" className="p-2 rounded-md bg-white/10 md:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center font-semibold text-white">BM</div>
          <div className="text-sm font-semibold truncate max-w-40">{active.label}</div>
        </div>
      </div>

      <div className="text-xs text-slate-600 text-center hidden sm:block">{formatDateTime(now)}</div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-md bg-white/10">
          <i className="fa-solid fa-bell" aria-hidden="true" />
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] font-medium leading-none rounded-full bg-red-600 text-white w-4 h-4">3</span>
        </button>

        <div className="hidden md:flex items-center gap-2">
          <Image src="/BM.png" alt="BM" width={36} height={36} className="rounded-full object-cover" />
          <div className="text-sm">Admin</div>
        </div>
      </div>
    </header>
  )
}
