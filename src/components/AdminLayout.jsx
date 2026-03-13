
"use client";

import React, { useState } from 'react'
import AdminSideBar from './AdminSideBar'
import AdminHeader from './AdminHeader'

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      <AdminSideBar open={open} onClose={() => setOpen(false)} />

      <div className="flex-1 min-w-0 w-full overflow-hidden">
        <AdminHeader onToggle={() => setOpen((s) => !s)} />

        <main className="p-4 md:p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
