"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString("fr-FR"); }
function fmtF(n) { return fmt(n) + " FCFA"; }
function fmtL(n) { return fmt(n) + " L"; }
function fdate(d) { return new Date(d).toLocaleDateString("fr-FR"); }

const TABS = [
  { key: "overview",  label: "Vue d'ensemble", icon: "fa-solid fa-chart-pie" },
  { key: "sonidep",   label: "Sonidep",         icon: "fa-solid fa-truck-droplet" },
  { key: "stations",  label: "Stations",         icon: "fa-solid fa-gas-pump" },
  { key: "finances",  label: "Finances",         icon: "fa-solid fa-bank" },
  { key: "clients",   label: "Clients",          icon: "fa-solid fa-user" },
  { key: "rapports",  label: "Rapports",         icon: "fa-solid fa-file-lines" },
  { key: "recus",     label: "Reçus",            icon: "fa-solid fa-images" },
];

const QUICK_PERIODS = [
  { label: "Aujourd'hui", key: "today" },
  { label: "7 jours",     key: "week" },
  { label: "Ce mois",     key: "month" },
  { label: "Cette année", key: "year" },
  { label: "Tout",        key: "all" },
];

const KpiCard = ({ title, value, sub, icon, color = "bg-orange-50 text-[#d27045]" }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        <i className={`${icon} text-sm`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

// ── Print helpers ─────────────────────────────────────────────────────────────
function printReceipt({ title, rows, total, subtitle = "" }) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;font-size:13px;}
    h1{font-size:20px;color:#d27045;margin-bottom:4px;}
    .sub{color:#64748b;font-size:12px;margin-bottom:24px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#f1f5f9;padding:8px 10px;border-bottom:2px solid #e2e8f0;text-align:left;}
    td{padding:8px 10px;border-bottom:1px solid #f8fafc;}
    tfoot td{font-weight:bold;border-top:2px solid #e2e8f0;}
    footer{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;}
  </style></head><body>
  <h1>BM Trading — ${title}</h1>
  <p class="sub">${subtitle} · Généré le ${new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</p>
  <table><thead><tr>${rows[0].map(h=>`<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
  ${total ? `<tfoot><tr><td colspan="${rows[0].length-1}">Total</td><td>${total}</td></tr></tfoot>` : ""}
  </table>
  <footer>BM Trading · Document confidentiel</footer>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
}

function generateRapportPDF(data, periode, type) {
  const { reservations, livraisons, factures, stations, banques, depenses, clients } = data;
  const totalReserved = reservations.reduce((a,r)=>a+(r.litre_essence||0)+(r.litre_gasoil||0),0);
  const totalLivres = livraisons.reduce((a,l)=>a+Number(l.litre),0);
  const totalBanque = banques.reduce((a,b)=>a+Number(b.solde),0);
  const totalDette = clients.reduce((a,c)=>a+Number(c.dette),0);
  const totalDepenses = depenses.reduce((a,d)=>a+Number(d.montant),0);
  const duSonidep = factures.filter(f=>f.statut==="en_attente").reduce((a,f)=>a+Number(f.montant_total),0);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport BM Trading</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;font-size:13px;}
    h1{font-size:22px;color:#d27045;margin-bottom:4px;}
    h2{font-size:15px;margin:24px 0 8px;border-bottom:2px solid #f1f5f9;padding-bottom:4px;}
    .sub{color:#64748b;margin-bottom:24px;font-size:12px;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
    .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
    .card-label{font-size:10px;color:#94a3b8;text-transform:uppercase;}
    .card-value{font-size:18px;font-weight:bold;color:#1e293b;margin-top:4px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;}
    th{background:#f1f5f9;padding:7px 10px;border-bottom:2px solid #e2e8f0;text-align:left;}
    td{padding:7px 10px;border-bottom:1px solid #f8fafc;}
    footer{margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;}
  </style></head><body>
  <h1>BM Trading — Rapport ${type}</h1>
  <p class="sub">Période : ${periode} · Généré le ${new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</p>
  <h2>Vue d'ensemble</h2>
  <div class="grid">
    <div class="card"><div class="card-label">Réserve Sonidep</div><div class="card-value">${fmtL(totalReserved-totalLivres)}</div></div>
    <div class="card"><div class="card-label">Total livré</div><div class="card-value">${fmtL(totalLivres)}</div></div>
    <div class="card"><div class="card-label">Dû à Sonidep</div><div class="card-value">${fmtF(duSonidep)}</div></div>
    <div class="card"><div class="card-label">Solde bancaire</div><div class="card-value">${fmtF(totalBanque)}</div></div>
    <div class="card"><div class="card-label">Dépenses</div><div class="card-value">${fmtF(totalDepenses)}</div></div>
    <div class="card"><div class="card-label">Dettes clients</div><div class="card-value">${fmtF(totalDette)}</div></div>
  </div>
  <h2>Livraisons (${livraisons.length})</h2>
  <table><thead><tr><th>N° Bon</th><th>Date</th><th>Type</th><th>Litres</th><th>Prix/L</th><th>Total</th></tr></thead>
  <tbody>${livraisons.map(l=>`<tr><td>${l.numero_bon}</td><td>${fdate(l.date_livraison)}</td><td>${l.type}</td><td>${fmt(l.litre)}</td><td>${fmt(l.prix)}</td><td>${fmt(Number(l.litre)*Number(l.prix))} F</td></tr>`).join("")}</tbody></table>
  <h2>Stations (${stations.length})</h2>
  <table><thead><tr><th>Station</th><th>Ville</th><th>Essence</th><th>Gasoil</th><th>Caisse</th></tr></thead>
  <tbody>${stations.map(s=>`<tr><td>${s.nom}</td><td>${s.ville}</td><td>${fmtL(s.stock_essence)}</td><td>${fmtL(s.stock_gasoil)}</td><td>${fmtF(s.solde)}</td></tr>`).join("")}</tbody></table>
  <h2>Banques</h2>
  <table><thead><tr><th>Banque</th><th>Solde</th></tr></thead>
  <tbody>${banques.map(b=>`<tr><td>${b.nom}</td><td>${fmtF(b.solde)}</td></tr>`).join("")}</tbody></table>
  <h2>Dépenses (${depenses.length})</h2>
  <table><thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Source</th><th>Montant</th></tr></thead>
  <tbody>${depenses.map(d=>`<tr><td>${fdate(d.created_at)}</td><td>${d.categorie}</td><td>${d.description||"—"}</td><td>${d.source}</td><td>${fmtF(d.montant)}</td></tr>`).join("")}</tbody></table>
  <h2>Clients (${clients.length})</h2>
  <table><thead><tr><th>Client</th><th>Téléphone</th><th>Dette</th></tr></thead>
  <tbody>${clients.map(c=>`<tr><td>${c.nom}</td><td>${c.numero||"—"}</td><td style="color:${Number(c.dette)>0?"#dc2626":"#16a34a"}">${fmtF(c.dette)}</td></tr>`).join("")}</tbody></table>
  <footer>BM Trading · Rapport confidentiel</footer>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
}

// ── Filter bar component ──────────────────────────────────────────────────────
function FilterBar({ filter, setFilter, extras = null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
      {/* Quick period pills */}
      <div className="flex flex-wrap gap-1">
        {QUICK_PERIODS.map(p => (
          <button key={p.key}
            onClick={() => setFilter(f => ({ ...f, quick: p.key, from: "", to: "" }))}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
              filter.quick === p.key
                ? "bg-[#d27045] text-white border-[#d27045]"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      {/* Custom range */}
      <div className="flex items-center gap-2">
        <input type="date" value={filter.from}
          onChange={e => setFilter(f => ({ ...f, from: e.target.value, quick: "custom" }))}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#d27045] outline-none"
        />
        <span className="text-xs text-slate-400">—</span>
        <input type="date" value={filter.to}
          onChange={e => setFilter(f => ({ ...f, to: e.target.value, quick: "custom" }))}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#d27045] outline-none"
        />
      </div>

      {extras}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Stats() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    reservations: [], livraisons: [], factures: [],
    stations: [], approvisionnements: [],
    banques: [], transactions: [],
    depenses: [], clients: [], clientPaiements: [],
  });

  // Shared filter state
  const [filter, setFilter] = useState({ quick: "month", from: "", to: "" });

  // Per-tab extra filters
  const [stationFilter, setStationFilter] = useState("all");
  const [livraisonTypeFilter, setLivraisonTypeFilter] = useState("all");
  const [depenseCatFilter, setDepenseCatFilter] = useState("all");
  const [txDirectionFilter, setTxDirectionFilter] = useState("all");

  // Rapport state
  const [rapportType, setRapportType] = useState("mensuel");
  const [rapportFrom, setRapportFrom] = useState("");
  const [rapportTo, setRapportTo] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: res }, { data: liv }, { data: fac },
      { data: sta }, { data: approv },
      { data: ban }, { data: tx },
      { data: dep }, { data: cli }, { data: cpay },
    ] = await Promise.all([
      supabase.from("reservations").select("*").order("date_reservation", { ascending: false }),
      supabase.from("livraisons").select("*").order("date_livraison", { ascending: false }),
      supabase.from("factures").select("*").order("periode_debut", { ascending: false }),
      supabase.from("stations").select("*").order("nom"),
      supabase.from("approvisionnements").select("*").order("created_at", { ascending: false }),
      supabase.from("banques").select("*").order("nom"),
      supabase.from("transactions_banque").select("*").order("created_at", { ascending: false }),
      supabase.from("depenses").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("nom"),
      supabase.from("client_paiements").select("*, client_paiement_lignes(*)").order("created_at", { ascending: false }),
    ]);
    setData({
      reservations: res??[], livraisons: liv??[], factures: fac??[],
      stations: sta??[], approvisionnements: approv??[],
      banques: ban??[], transactions: tx??[],
      depenses: dep??[], clients: cli??[], clientPaiements: cpay??[],
    });
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchAll(), 0); return () => clearTimeout(t); }, [fetchAll]);

  // ── Date filter function ──────────────────────────────────────────────────
  const getRange = useCallback(() => {
    const now = new Date(); now.setHours(23,59,59,999);
    if (filter.quick === "custom" && filter.from && filter.to) {
      return { from: new Date(filter.from), to: new Date(filter.to + "T23:59:59") };
    }
    const from = new Date();
    from.setHours(0,0,0,0);
    if (filter.quick === "today") { /* from = today */ }
    else if (filter.quick === "week") { from.setDate(from.getDate() - 6); }
    else if (filter.quick === "month") { from.setDate(1); }
    else if (filter.quick === "year") { from.setMonth(0,1); }
    else if (filter.quick === "all") { return { from: new Date(0), to: now }; }
    return { from, to: now };
  }, [filter]);

  const inRange = useCallback((dateStr) => {
    if (!dateStr) return false;
    const { from, to } = getRange();
    const d = new Date(dateStr);
    return d >= from && d <= to;
  }, [getRange]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => ({
    reservations: data.reservations.filter(r => inRange(r.date_reservation)),
    livraisons: data.livraisons.filter(l => inRange(l.date_livraison)),
    factures: data.factures.filter(f => inRange(f.created_at)),
    approvisionnements: data.approvisionnements.filter(a => inRange(a.created_at)),
    transactions: data.transactions.filter(t => inRange(t.created_at)),
    depenses: data.depenses.filter(d => inRange(d.created_at)),
    clientPaiements: data.clientPaiements.filter(p => inRange(p.created_at)),
  }), [data, inRange]);

  // ── KPI computed from filtered ────────────────────────────────────────────
  const totalReserved = filtered.reservations.reduce((a,r)=>a+(r.litre_essence||0)+(r.litre_gasoil||0),0);
  const totalLivres = filtered.livraisons.reduce((a,l)=>a+Number(l.litre),0);
  const totalDistribue = filtered.livraisons.reduce((a,l)=>a+Number(l.litre_distribue||0),0);
  const totalBanque = data.banques.reduce((a,b)=>a+Number(b.solde),0); // always current
  const totalDette = data.clients.reduce((a,c)=>a+Number(c.dette),0); // always current
  const totalDepenses = filtered.depenses.reduce((a,d)=>a+Number(d.montant),0);
  const totalCaisseStations = data.stations.reduce((a,s)=>a+Number(s.solde),0);
  const facturesAttente = data.factures.filter(f=>f.statut==="en_attente");
  const duSonidep = facturesAttente.reduce((a,f)=>a+Number(f.montant_total),0);

  // Extra filtered lists
  const livraisonsList = filtered.livraisons
    .filter(l => livraisonTypeFilter === "all" || l.type === livraisonTypeFilter);

  const depensesList = filtered.depenses
    .filter(d => depenseCatFilter === "all" || d.categorie === depenseCatFilter);

  const txList = filtered.transactions
    .filter(t => txDirectionFilter === "all" || t.direction === txDirectionFilter);

  const approvsFiltered = filtered.approvisionnements
    .filter(a => stationFilter === "all" || a.station_id === stationFilter);

  const allRecus = [
    ...data.livraisons.filter(l=>l.bon_image_url).map(l=>({ label:`BL ${l.numero_bon}`, date:l.date_livraison, url:l.bon_image_url, type:"Livraison" })),
    ...data.transactions.filter(t=>t.recu_image_url).map(t=>({ label:"Transaction banque", date:t.created_at, url:t.recu_image_url, type:"Banque" })),
    ...data.depenses.filter(d=>d.recu_image_url).map(d=>({ label:`Dépense: ${d.categorie}`, date:d.created_at, url:d.recu_image_url, type:"Dépense" })),
  ].filter(r => inRange(r.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const handleGenerateRapport = () => {
    let from = rapportFrom, to = rapportTo;
    if (rapportType !== "personnalise") {
      const n = new Date();
      if (rapportType === "hebdomadaire") {
        const day = n.getDay();
        const monday = new Date(n); monday.setDate(n.getDate()-(day===0?6:day-1));
        from = monday.toISOString().split("T")[0];
        to = n.toISOString().split("T")[0];
      } else if (rapportType === "mensuel") {
        from = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`;
        to = n.toISOString().split("T")[0];
      } else if (rapportType === "annuel") {
        from = `${n.getFullYear()}-01-01`;
        to = n.toISOString().split("T")[0];
      }
    }
    const label = { hebdomadaire:"Hebdomadaire", mensuel:"Mensuel", annuel:"Annuel", personnalise:"Personnalisé" }[rapportType];
    const periode = `${new Date(from).toLocaleDateString("fr-FR")} — ${new Date(to).toLocaleDateString("fr-FR")}`;
    const inR = (d) => { const x=new Date(d); return x>=new Date(from)&&x<=new Date(to+"T23:59:59"); };
    generateRapportPDF({
      ...data,
      livraisons: data.livraisons.filter(l=>inR(l.date_livraison)),
      depenses: data.depenses.filter(d=>inR(d.created_at)),
      transactions: data.transactions.filter(t=>inR(t.created_at)),
    }, periode, label);
  };

  const rangeLabel = () => {
    const { from, to } = getRange();
    if (filter.quick === "all") return "Tout le temps";
    return `${from.toLocaleDateString("fr-FR")} — ${to.toLocaleDateString("fr-FR")}`;
  };

  if (loading) return <p className="text-sm text-slate-400 p-6">Chargement des statistiques...</p>;

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Statistiques</h2>
          <p className="text-xs text-slate-400 mt-0.5">Période : {rangeLabel()}</p>
        </div>
        <button onClick={fetchAll}
          className="p-2 text-slate-400 hover:text-[#d27045] transition" title="Actualiser">
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === t.key ? "bg-white text-[#d27045] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <i className={t.icon} />{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FilterBar filter={filter} setFilter={setFilter} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard title="Réserve Sonidep" value={fmtL(totalReserved - totalLivres)} sub="Stock restant" icon="fa-solid fa-truck-droplet" />
            <KpiCard title="Total livré" value={fmtL(totalLivres)} sub="Période filtrée" icon="fa-solid fa-gas-pump" color="bg-blue-50 text-blue-600" />
            <KpiCard title="Non distribué" value={fmtL(totalLivres - totalDistribue)} icon="fa-solid fa-clock" color="bg-yellow-50 text-yellow-600" />
            <KpiCard title="Dû à Sonidep" value={fmtF(duSonidep)} sub={`${facturesAttente.length} facture(s)`} icon="fa-solid fa-file-invoice" color="bg-red-50 text-red-600" />
            <KpiCard title="Solde bancaire" value={fmtF(totalBanque)} sub="Solde actuel" icon="fa-solid fa-bank" color="bg-green-50 text-green-600" />
            <KpiCard title="Caisse stations" value={fmtF(totalCaisseStations)} sub="Solde actuel" icon="fa-solid fa-gas-pump" color="bg-purple-50 text-purple-600" />
            <KpiCard title="Dépenses" value={fmtF(totalDepenses)} sub="Période filtrée" icon="fa-solid fa-money-bill" color="bg-red-50 text-red-500" />
            <KpiCard title="Dettes clients" value={fmtF(totalDette)} sub={`${data.clients.filter(c=>Number(c.dette)>0).length} client(s)`} icon="fa-solid fa-user" color="bg-orange-50 text-orange-500" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Résumé de la période</h3>
              <button onClick={() => printReceipt({
                title: "Résumé statistiques",
                subtitle: rangeLabel(),
                rows: [
                  ["Indicateur","Valeur"],
                  ["Réserve Sonidep", fmtL(totalReserved - totalLivres)],
                  ["Total livré", fmtL(totalLivres)],
                  ["Non distribué", fmtL(totalLivres - totalDistribue)],
                  ["Dû à Sonidep", fmtF(duSonidep)],
                  ["Solde bancaire", fmtF(totalBanque)],
                  ["Caisse stations", fmtF(totalCaisseStations)],
                  ["Dépenses", fmtF(totalDepenses)],
                  ["Dettes clients", fmtF(totalDette)],
                ],
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-[#d27045]">{filtered.livraisons.length}</p>
                <p className="text-xs text-slate-400 mt-1">Livraisons</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-blue-600">{fmtL(totalLivres)}</p>
                <p className="text-xs text-slate-400 mt-1">Litres livrés</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-red-500">{fmtF(totalDepenses)}</p>
                <p className="text-xs text-slate-400 mt-1">Dépenses</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-2xl font-bold text-green-600">
                  {filtered.transactions.filter(t=>t.direction==="entree").length}
                </p>
                <p className="text-xs text-slate-400 mt-1">Entrées bancaires</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SONIDEP ──────────────────────────────────────────────────────── */}
      {activeTab === "sonidep" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FilterBar filter={filter} setFilter={setFilter}
            extras={
              <select value={livraisonTypeFilter} onChange={e=>setLivraisonTypeFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#d27045] outline-none bg-white">
                <option value="all">Tous types</option>
                <option value="essence">Essence</option>
                <option value="gasoil">Gasoil</option>
              </select>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Réservations" value={filtered.reservations.length} icon="fa-solid fa-clipboard-list" />
            <KpiCard title="Total réservé" value={fmtL(totalReserved)} icon="fa-solid fa-warehouse" />
            <KpiCard title="BLs" value={filtered.livraisons.length} icon="fa-solid fa-file" color="bg-blue-50 text-blue-600" />
            <KpiCard title="Factures en attente" value={facturesAttente.length} sub={fmtF(duSonidep)} icon="fa-solid fa-clock" color="bg-red-50 text-red-600" />
          </div>

          {/* Reservations */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Réservations ({filtered.reservations.length})</h3>
              <button onClick={() => printReceipt({
                title: "Réservations Sonidep", subtitle: rangeLabel(),
                rows: [["N° Réservation","Date","Type","Essence (L)","Gasoil (L)","Total (L)"],
                  ...filtered.reservations.map(r=>[r.numero_reservation,fdate(r.date_reservation),r.type,fmt(r.litre_essence),fmt(r.litre_gasoil),fmt((r.litre_essence||0)+(r.litre_gasoil||0))])],
                total: fmtL(totalReserved),
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="p-3 text-left">N° Réservation</th><th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Type</th><th className="p-3 text-right">Essence</th>
                  <th className="p-3 text-right">Gasoil</th><th className="p-3 text-right">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.reservations.map(r=>(
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">{r.numero_reservation}</td>
                      <td className="p-3 text-slate-500">{fdate(r.date_reservation)}</td>
                      <td className="p-3 capitalize text-slate-500">{r.type}</td>
                      <td className="p-3 text-right text-orange-600">{fmt(r.litre_essence)}</td>
                      <td className="p-3 text-right text-blue-600">{fmt(r.litre_gasoil)}</td>
                      <td className="p-3 text-right font-bold text-[#d27045]">{fmt((r.litre_essence||0)+(r.litre_gasoil||0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Livraisons */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Bons de Livraison ({livraisonsList.length})</h3>
              <button onClick={() => printReceipt({
                title: "Bons de Livraison", subtitle: rangeLabel(),
                rows: [["N° Bon","Date","Type","Litres","Distribué","Restant","Total FCFA"],
                  ...livraisonsList.map(l=>[l.numero_bon,fdate(l.date_livraison),l.type,fmt(l.litre),fmt(l.litre_distribue||0),fmt(Number(l.litre)-Number(l.litre_distribue||0)),fmt(Number(l.litre)*Number(l.prix))+" F"])],
                total: fmtL(totalLivres),
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="p-3 text-left">N° Bon</th><th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Type</th><th className="p-3 text-right">Litres</th>
                  <th className="p-3 text-right">Distribué</th><th className="p-3 text-right">Restant</th>
                  <th className="p-3 text-right">Total FCFA</th><th className="p-3 text-center">Reçu</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {livraisonsList.map(l=>{
                    const restant = Number(l.litre)-Number(l.litre_distribue||0);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-700">{l.numero_bon}</td>
                        <td className="p-3 text-slate-500">{fdate(l.date_livraison)}</td>
                        <td className="p-3 capitalize text-slate-500">{l.type}</td>
                        <td className="p-3 text-right text-blue-600 font-medium">{fmt(l.litre)}</td>
                        <td className="p-3 text-right text-slate-500">{fmt(l.litre_distribue||0)}</td>
                        <td className="p-3 text-right font-bold text-[#d27045]">{fmt(restant)}</td>
                        <td className="p-3 text-right text-slate-700 font-medium">{fmt(Number(l.litre)*Number(l.prix))} F</td>
                        <td className="p-3 text-center">
                          {l.bon_image_url
                            ? <a href={l.bon_image_url} target="_blank" rel="noopener noreferrer" className="text-[#d27045] hover:underline text-xs">Voir</a>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Factures */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Factures Sonidep ({filtered.factures.length})</h3>
              <button onClick={() => printReceipt({
                title: "Factures Sonidep", subtitle: rangeLabel(),
                rows: [["Période","Montant","Statut","Payée le"],
                  ...filtered.factures.map(f=>[`${fdate(f.periode_debut)} — ${fdate(f.periode_fin)}`,fmtF(f.montant_total),f.statut==="payee"?"Payée":"En attente",f.date_paiement?fdate(f.date_paiement):"—"])],
                total: fmtF(filtered.factures.reduce((a,f)=>a+Number(f.montant_total),0)),
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="p-3 text-left">Période</th><th className="p-3 text-right">Montant</th>
                  <th className="p-3 text-center">Statut</th><th className="p-3 text-left">Payée le</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.factures.map(f=>(
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-700">{fdate(f.periode_debut)} — {fdate(f.periode_fin)}</td>
                      <td className="p-3 text-right font-bold text-slate-700">{fmtF(f.montant_total)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.statut==="payee"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>
                          {f.statut==="payee"?"Payée":"En attente"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{f.date_paiement?fdate(f.date_paiement):"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STATIONS ─────────────────────────────────────────────────────── */}
      {activeTab === "stations" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FilterBar filter={filter} setFilter={setFilter}
            extras={
              <select value={stationFilter} onChange={e=>setStationFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#d27045] outline-none bg-white">
                <option value="all">Toutes les stations</option>
                {data.stations.map(s=><option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard title="Stations" value={data.stations.length} icon="fa-solid fa-gas-pump" />
            <KpiCard title="Stock essence" value={fmtL(data.stations.filter(s=>stationFilter==="all"||s.id===stationFilter).reduce((a,s)=>a+Number(s.stock_essence),0))} icon="fa-solid fa-droplet" color="bg-orange-50 text-orange-600" />
            <KpiCard title="Stock gasoil" value={fmtL(data.stations.filter(s=>stationFilter==="all"||s.id===stationFilter).reduce((a,s)=>a+Number(s.stock_gasoil),0))} icon="fa-solid fa-droplet" color="bg-blue-50 text-blue-600" />
          </div>
          {data.stations.filter(s=>stationFilter==="all"||s.id===s.id).map(s=>{
            if (stationFilter !== "all" && s.id !== stationFilter) return null;
            const approvs = approvsFiltered.filter(a=>a.station_id===s.id);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">{s.nom}</h3>
                    <p className="text-xs text-slate-400"><i className="fa-solid fa-location-dot mr-1"/>{s.ville}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-right items-center">
                    <div><p className="text-xs text-slate-400">Essence</p><p className="text-sm font-bold text-orange-600">{fmtL(s.stock_essence)}</p></div>
                    <div><p className="text-xs text-slate-400">Gasoil</p><p className="text-sm font-bold text-blue-600">{fmtL(s.stock_gasoil)}</p></div>
                    <div><p className="text-xs text-slate-400">Caisse</p><p className="text-sm font-bold text-green-600">{fmtF(s.solde)}</p></div>
                    <button onClick={()=>printReceipt({
                      title:`État Station: ${s.nom}`, subtitle: rangeLabel(),
                      rows:[["Date","Type","Litres"],
                        ...approvs.map(a=>[fdate(a.created_at),a.type,fmtL(a.litre)])],
                      total: fmtL(approvs.reduce((acc,a)=>acc+Number(a.litre),0)),
                    })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                      <i className="fa-solid fa-print" />
                    </button>
                  </div>
                </div>
                {approvs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-slate-50 text-slate-400 uppercase">
                        <th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Litres</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {approvs.map(a=>(
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500">{fdate(a.created_at)}</td>
                            <td className="p-3 capitalize text-slate-600">{a.type}</td>
                            <td className="p-3 text-right font-medium text-[#d27045]">{fmtL(a.litre)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FINANCES ─────────────────────────────────────────────────────── */}
      {activeTab === "finances" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FilterBar filter={filter} setFilter={setFilter}
            extras={
              <div className="flex gap-2">
                <select value={txDirectionFilter} onChange={e=>setTxDirectionFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#d27045] outline-none bg-white">
                  <option value="all">Entrées & sorties</option>
                  <option value="entree">Entrées seulement</option>
                  <option value="sortie">Sorties seulement</option>
                </select>
                <select value={depenseCatFilter} onChange={e=>setDepenseCatFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#d27045] outline-none bg-white">
                  <option value="all">Toutes catégories</option>
                  <option value="electricite">Électricité</option>
                  <option value="eau">Eau</option>
                  <option value="loyer">Loyer</option>
                  <option value="salaire">Salaire</option>
                  <option value="transport">Transport</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Solde bancaire" value={fmtF(totalBanque)} icon="fa-solid fa-bank" color="bg-green-50 text-green-600" />
            <KpiCard title="Dépenses période" value={fmtF(totalDepenses)} icon="fa-solid fa-money-bill" color="bg-red-50 text-red-600" />
            <KpiCard title="Transactions" value={txList.length} icon="fa-solid fa-arrows-left-right" color="bg-blue-50 text-blue-600" />
            <KpiCard title="Entrées bancaires" value={fmtF(filtered.transactions.filter(t=>t.direction==="entree").reduce((a,t)=>a+Number(t.montant),0))} icon="fa-solid fa-arrow-down" color="bg-green-50 text-green-500" />
          </div>

          {/* Per bank */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Soldes par banque</h3>
              <button onClick={()=>printReceipt({
                title:"Relevé des banques", subtitle: rangeLabel(),
                rows:[["Banque","Solde actuel","Entrées","Sorties"],
                  ...data.banques.map(b=>{
                    const ent=txList.filter(t=>t.banque_id===b.id&&t.direction==="entree").reduce((a,t)=>a+Number(t.montant),0);
                    const sor=txList.filter(t=>t.banque_id===b.id&&t.direction==="sortie").reduce((a,t)=>a+Number(t.montant),0);
                    return [b.nom,fmtF(b.solde),"+"+fmtF(ent),"-"+fmtF(sor)];
                  })],
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.banques.map(b=>{
                const ent=txList.filter(t=>t.banque_id===b.id&&t.direction==="entree").reduce((a,t)=>a+Number(t.montant),0);
                const sor=txList.filter(t=>t.banque_id===b.id&&t.direction==="sortie").reduce((a,t)=>a+Number(t.montant),0);
                return (
                  <div key={b.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-700 mb-2">{b.nom}</p>
                    <p className="text-xl font-bold text-green-600 mb-2">{fmtF(b.solde)}</p>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span><i className="fa-solid fa-arrow-down text-green-500 mr-1"/>+{fmtF(ent)}</span>
                      <span><i className="fa-solid fa-arrow-up text-red-500 mr-1"/>-{fmtF(sor)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Transactions ({txList.length})</h3>
              <button onClick={()=>printReceipt({
                title:"Transactions bancaires", subtitle: rangeLabel(),
                rows:[["Date","Banque","Type","Direction","Montant"],
                  ...txList.map(t=>[fdate(t.created_at),data.banques.find(b=>b.id===t.banque_id)?.nom??"—",t.sous_type,t.direction==="entree"?"Entrée":"Sortie",fmtF(t.montant)])],
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="p-3 text-left">Date</th><th className="p-3 text-left">Banque</th>
                  <th className="p-3 text-left">Type</th><th className="p-3 text-center">Direction</th>
                  <th className="p-3 text-right">Montant</th><th className="p-3 text-left">Description</th>
                  <th className="p-3 text-center">Reçu</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {txList.map(t=>{
                    const b = data.banques.find(b=>b.id===t.banque_id);
                    const isEntree = t.direction==="entree";
                    const labelMap = { depot_station:"Dépôt station", depot_direct:"Dépôt direct", paiement_sonidep:"Paiement Sonidep", paiement_facture:"Paiement facture", autre:"Autre" };
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500">{fdate(t.created_at)}</td>
                        <td className="p-3 text-slate-600">{b?.nom??"—"}</td>
                        <td className="p-3 text-slate-600 text-xs">{labelMap[t.sous_type]??t.sous_type}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isEntree?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
                            {isEntree?"Entrée":"Sortie"}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${isEntree?"text-green-600":"text-red-600"}`}>
                          {isEntree?"+":"-"}{fmtF(t.montant)}
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{t.description||"—"}</td>
                        <td className="p-3 text-center">
                          {t.recu_image_url
                            ? <a href={t.recu_image_url} target="_blank" rel="noopener noreferrer" className="text-[#d27045] hover:underline text-xs">Voir</a>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Depenses */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Dépenses ({depensesList.length})</h3>
              <button onClick={()=>printReceipt({
                title:"Dépenses", subtitle: rangeLabel(),
                rows:[["Date","Catégorie","Description","Source","Montant"],
                  ...depensesList.map(d=>[fdate(d.created_at),d.categorie,d.description||"—",d.source,fmtF(d.montant)])],
                total: fmtF(depensesList.reduce((a,d)=>a+Number(d.montant),0)),
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="p-3 text-left">Date</th><th className="p-3 text-left">Catégorie</th>
                  <th className="p-3 text-left">Description</th><th className="p-3 text-left">Source</th>
                  <th className="p-3 text-right">Montant</th><th className="p-3 text-center">Reçu</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {depensesList.map(d=>(
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500">{fdate(d.created_at)}</td>
                      <td className="p-3 capitalize text-slate-700">{d.categorie}</td>
                      <td className="p-3 text-slate-500">{d.description||"—"}</td>
                      <td className="p-3 capitalize text-slate-500">{d.source}</td>
                      <td className="p-3 text-right font-bold text-red-600">{fmtF(d.montant)}</td>
                      <td className="p-3 text-center">
                        {d.recu_image_url
                          ? <a href={d.recu_image_url} target="_blank" rel="noopener noreferrer" className="text-[#d27045] text-xs hover:underline">Voir</a>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENTS ──────────────────────────────────────────────────────── */}
      {activeTab === "clients" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FilterBar filter={filter} setFilter={setFilter} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Clients" value={data.clients.length} icon="fa-solid fa-users" />
            <KpiCard title="Total dettes" value={fmtF(totalDette)} icon="fa-solid fa-triangle-exclamation" color="bg-red-50 text-red-600" />
            <KpiCard title="Clients endettés" value={data.clients.filter(c=>Number(c.dette)>0).length} icon="fa-solid fa-user-xmark" color="bg-orange-50 text-orange-600" />
            <KpiCard title="Paiements période" value={filtered.clientPaiements.length} icon="fa-solid fa-hand-holding-dollar" color="bg-green-50 text-green-600" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Clients ({data.clients.length})</h3>
              <button onClick={()=>printReceipt({
                title:"Liste des clients", subtitle: rangeLabel(),
                rows:[["Client","Téléphone","Dette"],
                  ...data.clients.sort((a,b)=>Number(b.dette)-Number(a.dette)).map(c=>[c.nom,c.numero||"—",fmtF(c.dette)])],
                total: fmtF(totalDette),
              })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                <i className="fa-solid fa-print" />Imprimer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="p-3 text-left">Client</th><th className="p-3 text-left">Téléphone</th>
                  <th className="p-3 text-right">Dette</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {data.clients.sort((a,b)=>Number(b.dette)-Number(a.dette)).map(c=>(
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-700">{c.nom}</td>
                      <td className="p-3 text-slate-500">{c.numero||"—"}</td>
                      <td className={`p-3 text-right font-bold ${Number(c.dette)>0?"text-red-600":"text-green-600"}`}>{fmtF(c.dette)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RAPPORTS ─────────────────────────────────────────────────────── */}
      {activeTab === "rapports" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">Générer un rapport complet</h3>
            <p className="text-xs text-slate-400 mb-6">PDF imprimable avec toutes les données de la période choisie.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
              {[
                { value:"hebdomadaire", label:"Hebdomadaire", icon:"fa-solid fa-calendar-week" },
                { value:"mensuel",      label:"Mensuel",      icon:"fa-solid fa-calendar" },
                { value:"annuel",       label:"Annuel",       icon:"fa-solid fa-calendar-days" },
                { value:"personnalise", label:"Personnalisé", icon:"fa-solid fa-sliders" },
              ].map(r=>(
                <button key={r.value} type="button" onClick={()=>setRapportType(r.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition ${
                    rapportType===r.value ? "border-[#d27045] bg-orange-50 text-[#d27045]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <i className={`${r.icon} text-lg`}/>{r.label}
                </button>
              ))}
            </div>
            {rapportType==="personnalise" && (
              <div className="grid grid-cols-2 gap-4 mb-6 animate-in fade-in duration-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Du</label>
                  <input type="date" value={rapportFrom} onChange={e=>setRapportFrom(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Au</label>
                  <input type="date" value={rapportTo} onChange={e=>setRapportTo(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"/>
                </div>
              </div>
            )}
            <button onClick={handleGenerateRapport}
              disabled={rapportType==="personnalise"&&(!rapportFrom||!rapportTo)}
              className="flex items-center gap-2 px-6 py-3 bg-[#d27045] text-white font-medium rounded-lg hover:bg-[#b85b34] transition disabled:opacity-60"
            >
              <i className="fa-solid fa-print"/>Générer et imprimer
            </button>
          </div>
        </div>
      )}

      {/* ── RECUS ────────────────────────────────────────────────────────── */}
      {activeTab === "recus" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FilterBar filter={filter} setFilter={setFilter} />
          <p className="text-sm text-slate-500">{allRecus.length} reçu(s) sur la période</p>
          {allRecus.length===0 ? (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 text-sm">Aucun reçu sur cette période.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allRecus.map((r,i)=>(
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-image text-[#d27045] text-lg"/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{r.label}</p>
                    <p className="text-xs text-slate-400">{r.type} · {fdate(r.date)}</p>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square text-slate-300 group-hover:text-[#d27045] transition ml-auto shrink-0"/>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}