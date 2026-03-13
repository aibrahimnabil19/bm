import React from 'react'

const AdminDashboard = () => {
  return (
    <div className="w-full">
      {/* Only put your page-specific content here */}
      <h2 className="text-2xl font-bold mb-4">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white shadow rounded-lg">Statistiques...</div>
        <div className="p-6 bg-white shadow rounded-lg">Ventes...</div>
        <div className="p-6 bg-white shadow rounded-lg">Utilisateurs...</div>
      </div>
    </div>
  )
}

export default AdminDashboard