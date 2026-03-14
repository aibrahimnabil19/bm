import AdminLayout from '@/components/AdminLayout'

export default function Page() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
      <p className="text-slate-500 mt-1">Bienvenue dans votre espace de gestion.</p>
    </AdminLayout>
  )
}