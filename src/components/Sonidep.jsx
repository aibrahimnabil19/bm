"use client";

import React, { useState, useEffect } from "react";
import ReserveModal from "./ReserveModal";
import { supabase } from "@/lib/supabase";

// ── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard = ({ title, a, b, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 min-w-32 rounded-xl border border-white/20 shadow-sm p-4 flex flex-col justify-between aspect-square text-left transition hover:brightness-110 active:scale-95"
    style={{ backgroundColor: "#d27045" }}
  >
    <div className="text-sm font-medium text-white/90 truncate">{title}</div>
    <div className="flex flex-col">
      <div className="text-2xl md:text-3xl font-bold text-white">{a}</div>
      <div className="text-[10px] md:text-xs font-medium text-white/70 uppercase tracking-wider">
        {b}
      </div>
    </div>
  </button>
);

// ── Reservation Row ───────────────────────────────────────────────────────────
const ReservationRow = ({ res }) => {
  const totalLitres =
    (res.litre_essence ?? 0) + (res.litre_gasoil ?? 0);

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">
          {res.numero_reservation}
        </span>
        <span className="text-xs text-slate-400">
          {new Date(res.date_reservation).toLocaleDateString("fr-FR")}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium capitalize">
          {res.type}
        </span>
        <span className="text-sm font-bold text-slate-700">
          {totalLitres.toLocaleString("fr-FR")} L
        </span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Sonidep() {
  const [activeTab, setActiveTab] = useState("Reserve");
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null); // for the panel later

  const tabs = ["Reserve", "Livraison", "Facture"];

  // Fetch reservations from Supabase
 const fetchReservations = React.useCallback(async () => {
  // We no longer need setLoading(true) here because it's true by default
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .order("date_reservation", { ascending: false });

    if (!error) setReservations(data ?? []);
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    setLoading(false); // Only update state when the async work is DONE
  }
}, []);

  useEffect(() => {
  fetchReservations();
}, [fetchReservations]);

  // Metric cards — only reserve count is real for now
  const metrics = [
    { key: "reserve",   title: "Réserve",          a: reservations.length, b: "réservations" },
    { key: "livraison", title: "Livraison Totale",  a: 0,                   b: "ce mois" },
    { key: "restant",   title: "Livraison Restante",a: 0,                   b: "ce mois" },
    { key: "du",        title: "Dû à Sonidep",      a: 0,                   b: "FCFA" },
  ];

  return (
    <div className="w-full space-y-10 relative">

      {/* Metric Cards */}
      <div className="flex flex-row flex-nowrap gap-4 w-full overflow-x-auto pb-2 scrollbar-hide">
        {metrics.map((m) => (
          <MetricCard
            key={m.key}
            title={m.title}
            a={m.a}
            b={m.b}
            onClick={() => setActiveCard(activeCard === m.key ? null : m.key)}
          />
        ))}
      </div>

      {/* Card Panel (placeholder — you'll build each one later) */}
      {activeCard && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-slate-700 capitalize">{activeCard}</h4>
            <button
              onClick={() => setActiveCard(null)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕ Fermer
            </button>
          </div>
          <p className="text-sm text-slate-400">Panneau de détails — à venir.</p>
        </div>
      )}

      {/* Gestion Sonidep */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Gestion Sonidep</h3>
            <p className="text-xs text-slate-500">Flux de travail centralisé</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 bg-slate-100/50">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === t
                  ? "bg-white text-[#d27045] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-75">

          {activeTab === "Reserve" && (
            <div className="animate-in fade-in duration-300 flex flex-col">
              <div className="w-full flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  État de la Réserve
                </h4>
                <button
                  onClick={() => setIsReserveModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-md hover:bg-[#b85b34] transition shadow-sm"
                >
                  <i className="fa-solid fa-plus" />
                  Nouvelle Réservation
                </button>
              </div>

              {/* Reservation List */}
              {loading ? (
                <p className="text-sm text-slate-400">Chargement...</p>
              ) : reservations.length === 0 ? (
                <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-slate-400 text-sm">Aucune réservation pour le moment.</p>
                </div>
              ) : (
                <div>
                  {reservations.map((res) => (
                    <ReservationRow key={res.id} res={res} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "Livraison" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">
                Module de Livraison
              </h4>
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-slate-400 text-sm">À implémenter...</p>
              </div>
            </div>
          )}

          {activeTab === "Facture" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">
                Facturation
              </h4>
              <p className="text-slate-600">Historique et génération des factures.</p>
            </div>
          )}
        </div>
      </section>

      {/* Modal */}
      <ReserveModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        onSaved={fetchReservations}  // ← refreshes the list after saving
      />
    </div>
  );
}