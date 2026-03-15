"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { groupLivraisonsByPeriod, isPeriodClosed, computeMontant } from "@/utils/facturePeriods";

function fmt(n) { return Number(n || 0).toLocaleString("fr-FR"); }
function fmtF(n) { return fmt(n) + " FCFA"; }
function fmtL(n) { return fmt(n) + " L"; }
function fdate(d) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }
function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`;
  return fdate(d);
}

const StatCard = ({ title, value, sub, icon, color, onClick }) => (
  <button onClick={onClick}
    className={`w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition group ${onClick ? "cursor-pointer" : "cursor-default"}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <i className={`${icon} text-base`} />
      </div>
      {onClick && <i className="fa-solid fa-arrow-right text-slate-300 group-hover:text-[#d27045] transition text-xs mt-1" />}
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs font-semibold text-slate-500 mt-1">{title}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </button>
);

const QuickAction = ({ label, icon, color, onClick }) => (
  <button onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition font-medium text-sm ${color}`}>
    <i className={`${icon} text-xl`} />
    <span className="text-center leading-tight">{label}</span>
  </button>
);

const AlertItem = ({ icon, color, title, sub, action, onAction }) => (
  <div className={`flex items-start gap-3 p-3 rounded-lg border ${color}`}>
    <i className={`${icon} text-sm mt-0.5`} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs opacity-75">{sub}</p>
    </div>
    {action && (
      <button onClick={onAction}
        className="text-xs font-semibold underline underline-offset-2 opacity-75 hover:opacity-100 transition shrink-0">
        {action}
      </button>
    )}
  </div>
);

export default function Accueil() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [username, setUsername] = useState("");

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    setUsername(profile?.username ?? "");

    const h = new Date().getHours();
    setGreeting(h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir");

    const [
      { data: livraisons }, { data: reservations }, { data: factures },
      { data: stations }, { data: banques }, { data: clients },
      { data: depenses }, { data: activites }, { data: transactions },
    ] = await Promise.all([
      supabase.from("livraisons").select("*").order("date_livraison", { ascending: false }),
      supabase.from("reservations").select("*").order("date_reservation", { ascending: false }),
      supabase.from("factures").select("*").order("periode_debut", { ascending: false }),
      supabase.from("stations").select("*").order("nom"),
      supabase.from("banques").select("*").order("nom"),
      supabase.from("clients").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("depenses").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("station_activites").select("*, stations(nom)").order("created_at", { ascending: false }).limit(20),
      supabase.from("transactions_banque").select("*").order("created_at", { ascending: false }).limit(10),
    ]);

    setData({ livraisons: livraisons??[], reservations: reservations??[], factures: factures??[],
               stations: stations??[], banques: banques??[], clients: clients??[],
               depenses: depenses??[], activites: activites??[], transactions: transactions??[] });
    setLoading(false);
  }, []);

  useEffect(() => {
      // Wrap in a 0ms timeout to move state updates out of the 
      // synchronous render phase and avoid cascading render warnings.
      const timeoutId = setTimeout(() => {
        fetchAll();
      }, 0);
  
      return () => clearTimeout(timeoutId);
    }, [fetchAll]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#d27045] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const { livraisons, reservations, factures, stations, banques, clients, depenses, activites, transactions } = data;

  // ── Computed stats ──────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = (d) => { const x = new Date(d); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); };

  const totalReserved = reservations.reduce((a,r) => a + (r.litre_essence||0) + (r.litre_gasoil||0), 0);
  const totalLivres = livraisons.reduce((a,l) => a + Number(l.litre), 0);
  const totalDistribue = livraisons.reduce((a,l) => a + Number(l.litre_distribue||0), 0);
  const netReserve = Math.max(0, totalReserved - totalLivres);
  const livraisonRestante = Math.max(0, totalLivres - totalDistribue);
  const totalBanque = banques.reduce((a,b) => a + Number(b.solde), 0);
  const totalCaisse = stations.reduce((a,s) => a + Number(s.solde), 0);
  const totalDette = clients.reduce((a,c) => a + Number(c.dette), 0);

  const facturesAttente = factures.filter(f => f.statut === "en_attente");
  const periods = groupLivraisonsByPeriod(livraisons);
  const { data: facData } = { data: factures };
  const paidPeriods = new Set(factures.filter(f => f.statut === "payee").map(f => `${f.periode_debut}__${f.periode_fin}`));
  const duSonidep = periods.filter(p => isPeriodClosed(p.fin) && !paidPeriods.has(`${p.debut}__${p.fin}`)).reduce((a,p) => a + computeMontant(p.livraisons), 0);

  const livraisonsMois = livraisons.filter(l => thisMonth(l.date_livraison));
  const depensesMois = depenses.filter(d => thisMonth(d.created_at));
  const totalDepensesMois = depensesMois.reduce((a,d) => a + Number(d.montant), 0);

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alerts = [];
  if (facturesAttente.length > 0) {
    alerts.push({
      icon: "fa-solid fa-file-invoice text-red-600",
      color: "bg-red-50 border-red-200 text-red-800",
      title: `${facturesAttente.length} facture(s) Sonidep en attente`,
      sub: `${fmtF(duSonidep)} à payer`,
      action: "Voir",
      route: "/admin/sonidep",
    });
  }
  if (netReserve < 5000) {
    alerts.push({
      icon: "fa-solid fa-triangle-exclamation text-orange-600",
      color: "bg-orange-50 border-orange-200 text-orange-800",
      title: "Réserve Sonidep faible",
      sub: `${fmtL(netReserve)} restant`,
      action: "Réserver",
      route: "/admin/sonidep",
    });
  }
  if (livraisonRestante > 0) {
    alerts.push({
      icon: "fa-solid fa-clock text-yellow-600",
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      title: "Stock non distribué aux stations",
      sub: `${fmtL(livraisonRestante)} en attente`,
      action: "Distribuer",
      route: "/admin/stations",
    });
  }
  const clientsEndettes = clients.filter(c => Number(c.dette) > 0);
  if (clientsEndettes.length > 0) {
    alerts.push({
      icon: "fa-solid fa-user-xmark text-blue-600",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      title: `${clientsEndettes.length} client(s) avec des dettes`,
      sub: `Total: ${fmtF(totalDette)}`,
      action: "Voir",
      route: "/admin/clients",
    });
  }

  // ── Recent activity feed ────────────────────────────────────────────────────
  const activityFeed = [
    ...livraisons.slice(0,3).map(l => ({
      icon: "fa-solid fa-truck-droplet", color: "bg-blue-100 text-blue-600",
      text: `BL ${l.numero_bon} — ${fmtL(l.litre)} ${l.type}`,
      time: l.date_livraison, route: "/admin/sonidep",
    })),
    ...depenses.slice(0,3).map(d => ({
      icon: "fa-solid fa-money-bill", color: "bg-red-100 text-red-600",
      text: `Dépense ${d.categorie}: ${fmtF(d.montant)}`,
      time: d.created_at, route: "/admin/expenses",
    })),
    ...transactions.slice(0,3).map(t => ({
      icon: t.direction === "entree" ? "fa-solid fa-arrow-down" : "fa-solid fa-arrow-up",
      color: t.direction === "entree" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
      text: `${t.direction === "entree" ? "Entrée" : "Sortie"} banque: ${fmtF(t.montant)}`,
      time: t.created_at, route: "/admin/bank",
    })),
    ...activites.slice(0,3).map(a => ({
      icon: "fa-solid fa-gas-pump", color: "bg-orange-100 text-orange-600",
      text: `${a.stations?.nom ?? "Station"}: ${a.description}`,
      time: a.created_at, route: "/admin/stations",
    })),
  ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

  return (
    <div className="w-full space-y-8">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting}, <span className="text-[#d27045]">{username}</span> 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={fetchAll}
          className="p-2 text-slate-400 hover:text-[#d27045] transition" title="Actualiser">
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alerts.map((a, i) => (
              <AlertItem key={i}
                icon={a.icon} color={a.color}
                title={a.title} sub={a.sub}
                action={a.action}
                onAction={() => router.push(a.route)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vue d&apos;ensemble</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="Réserve Sonidep" value={fmtL(netReserve)} sub="Stock restant"
            icon="fa-solid fa-truck-droplet" color="bg-orange-100 text-[#d27045]"
            onClick={() => router.push("/admin/sonidep")} />
          <StatCard title="À distribuer" value={fmtL(livraisonRestante)} sub="Non envoyé aux stations"
            icon="fa-solid fa-clock" color="bg-yellow-100 text-yellow-600"
            onClick={() => router.push("/admin/stations")} />
          <StatCard title="Solde bancaire" value={fmtF(totalBanque)} sub={`${banques.length} compte(s)`}
            icon="fa-solid fa-bank" color="bg-green-100 text-green-600"
            onClick={() => router.push("/admin/bank")} />
          <StatCard title="Caisse stations" value={fmtF(totalCaisse)} sub={`${stations.length} station(s)`}
            icon="fa-solid fa-gas-pump" color="bg-purple-100 text-purple-600"
            onClick={() => router.push("/admin/stations")} />
          <StatCard title="Dû à Sonidep" value={fmtF(duSonidep)} sub={`${facturesAttente.length} facture(s)`}
            icon="fa-solid fa-file-invoice" color="bg-red-100 text-red-600"
            onClick={() => router.push("/admin/sonidep")} />
          <StatCard title="Livraisons ce mois" value={livraisonsMois.length} sub={fmtL(livraisonsMois.reduce((a,l)=>a+Number(l.litre),0))}
            icon="fa-solid fa-gas-pump" color="bg-blue-100 text-blue-600"
            onClick={() => router.push("/admin/sonidep")} />
          <StatCard title="Dépenses ce mois" value={fmtF(totalDepensesMois)} sub={`${depensesMois.length} transaction(s)`}
            icon="fa-solid fa-money-bill" color="bg-red-100 text-red-500"
            onClick={() => router.push("/admin/expenses")} />
          <StatCard title="Dettes clients" value={fmtF(totalDette)} sub={`${clientsEndettes.length} client(s) endettés`}
            icon="fa-solid fa-user" color="bg-slate-100 text-slate-600"
            onClick={() => router.push("/admin/clients")} />
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction label="Nouvelle réservation" icon="fa-solid fa-plus"
            color="border-orange-200 text-[#d27045] hover:bg-orange-50"
            onClick={() => router.push("/admin/sonidep")} />
          <QuickAction label="Nouvelle livraison" icon="fa-solid fa-truck-droplet"
            color="border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => router.push("/admin/sonidep")} />
          <QuickAction label="Approvisionner station" icon="fa-solid fa-gas-pump"
            color="border-purple-200 text-purple-600 hover:bg-purple-50"
            onClick={() => router.push("/admin/stations")} />
          <QuickAction label="Ajouter client" icon="fa-solid fa-user-plus"
            color="border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => router.push("/admin/clients")} />
          <QuickAction label="Mouvement banque" icon="fa-solid fa-bank"
            color="border-green-200 text-green-600 hover:bg-green-50"
            onClick={() => router.push("/admin/bank")} />
          <QuickAction label="Nouvelle dépense" icon="fa-solid fa-money-bill"
            color="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => router.push("/admin/expenses")} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Stations summary ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Stations</h2>
            <button onClick={() => router.push("/admin/stations")}
              className="text-xs text-[#d27045] hover:underline font-medium">
              Voir tout →
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {stations.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">Aucune station.</p>
            ) : stations.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{s.nom}</p>
                  <p className="text-xs text-slate-400">{s.ville}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-orange-500 font-medium">{fmtL(s.stock_essence)}</p>
                    <p className="text-[10px] text-slate-400">Essence</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500 font-medium">{fmtL(s.stock_gasoil)}</p>
                    <p className="text-[10px] text-slate-400">Gasoil</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-bold">{fmtF(s.solde)}</p>
                    <p className="text-[10px] text-slate-400">Caisse</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Banques summary ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Banques</h2>
            <button onClick={() => router.push("/admin/bank")}
              className="text-xs text-[#d27045] hover:underline font-medium">
              Voir tout →
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {banques.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">Aucun compte bancaire.</p>
            ) : banques.map(b => {
              const entrees = transactions.filter(t => t.banque_id === b.id && t.direction === "entree").reduce((a,t) => a+Number(t.montant), 0);
              const sorties = transactions.filter(t => t.banque_id === b.id && t.direction === "sortie").reduce((a,t) => a+Number(t.montant), 0);
              return (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-bank text-blue-600 text-xs" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{b.nom}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-green-500">+{fmtF(entrees)}</p>
                      <p className="text-xs text-red-500">-{fmtF(sorties)}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{fmtF(b.solde)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">Total</span>
            <span className="text-sm font-bold text-green-600">{fmtF(totalBanque)}</span>
          </div>
        </div>

        {/* ── Recent activity ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Activité récente</h2>
            <button onClick={() => router.push("/admin/stats")}
              className="text-xs text-[#d27045] hover:underline font-medium">
              Statistiques →
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {activityFeed.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">Aucune activité.</p>
            ) : activityFeed.map((a, i) => (
              <button key={i} onClick={() => router.push(a.route)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${a.color}`}>
                  <i className={`${a.icon} text-xs`} />
                </div>
                <p className="text-xs text-slate-600 flex-1 truncate">{a.text}</p>
                <p className="text-[10px] text-slate-400 shrink-0">{timeAgo(a.time)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Clients with debt ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Clients endettés</h2>
            <button onClick={() => router.push("/admin/clients")}
              className="text-xs text-[#d27045] hover:underline font-medium">
              Voir tout →
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {clientsEndettes.length === 0 ? (
              <div className="p-6 text-center">
                <i className="fa-solid fa-check-circle text-green-400 text-2xl mb-2" />
                <p className="text-sm text-slate-400">Aucun client endetté</p>
              </div>
            ) : clientsEndettes.slice(0,5).map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#d27045]">{c.nom.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{c.nom}</p>
                    {c.numero && <p className="text-xs text-slate-400">{c.numero}</p>}
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600">{fmtF(c.dette)}</p>
              </div>
            ))}
          </div>
          {totalDette > 0 && (
            <div className="p-3 bg-red-50 border-t border-red-100 flex justify-between items-center">
              <span className="text-xs text-red-500 font-medium">Total dettes</span>
              <span className="text-sm font-bold text-red-600">{fmtF(totalDette)}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}