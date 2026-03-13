"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReserveModal from "./ReserveModal";
import { supabase } from "@/lib/supabase";

// ── Metric Card Component ───────────────────────────────────────────────────
const MetricCard = ({ title, a, b, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 min-w-32 rounded-xl border border-white/20 shadow-sm p-4 flex flex-col justify-between aspect-square text-left transition hover:brightness-110 active:scale-95"
    style={{ backgroundColor: "#d27045" }}
  >
    <div className="text-sm font-medium text-white/90 truncate">{title}</div>
    <div className="flex flex-col">
      <div className="text-xl md:text-2xl font-bold text-white">{a}</div>
      <div className="text-[10px] md:text-xs font-medium text-white/70 uppercase tracking-wider">
        {b}
      </div>
    </div>
  </button>
);

// ── Reservation Row (For the bottom list) ───────────────────────────────────
const ReservationRow = ({ res }) => {
  const totalLitres = (res.litre_essence ?? 0) + (res.litre_gasoil ?? 0);
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">{res.numero_reservation}</span>
        <span className="text-xs text-slate-400">
          {new Date(res.date_reservation).toLocaleDateString("fr-FR")}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium capitalize">{res.type}</span>
        <span className="text-sm font-bold text-slate-700">{totalLitres.toLocaleString("fr-FR")} L</span>
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
  const [activeCard, setActiveCard] = useState(null);

  const tabs = ["Reserve", "Livraison", "Facture"];

  const fetchReservations = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("date_reservation", { ascending: false });
      if (!error) setReservations(data ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // ── Calculation Logic for Monthly Total ─────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter reservations for the current month only
    const monthlyData = reservations.filter(res => {
      const d = new Date(res.date_reservation);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Sum up all litres (essence + gasoil)
    const totalLitres = monthlyData.reduce((acc, res) => {
      return acc + (res.litre_essence ?? 0) + (res.litre_gasoil ?? 0);
    }, 0);

    return {
      totalLitres,
      count: monthlyData.length,
      monthlyData // we keep this to show in the overlay
    };
  }, [reservations]);

  const metrics = [
    { key: "reserve", title: "Réserve", a: `${stats.totalLitres.toLocaleString("fr-FR")} L`, b: "Total ce mois" },
    { key: "livraison", title: "Livraison Totale", a: "0 L", b: "ce mois" },
    { key: "restant", title: "Livraison Restante", a: "0 L", b: "ce mois" },
    { key: "du", title: "Dû à Sonidep", a: "0", b: "FCFA" },
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

      {/* ── Detailed Overlay Panel ── */}
      {activeCard === "reserve" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-lg p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-bold text-slate-800 text-lg">Détails de la Réserve ({new Date().toLocaleString('fr-FR', { month: 'long' })})</h4>
              <p className="text-sm text-slate-500">{stats.count} réservations trouvées</p>
            </div>
            <button onClick={() => setActiveCard(null)} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">✕</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-4 py-3">N° Réservation</th>
                  <th className="px-4 py-3">Créé le</th>
                  <th className="px-4 py-3">Essence (L)</th>
                  <th className="px-4 py-3">Prix Essence</th>
                  <th className="px-4 py-3">Gasoil (L)</th>
                  <th className="px-4 py-3">Total (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.monthlyData.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-700">{res.numero_reservation}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(res.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{res.litre_essence ?? 0}</td>
                    <td className="px-4 py-3 text-slate-400">{res.price_essence?.toLocaleString() || 0} F</td>
                    <td className="px-4 py-3 text-orange-600 font-medium">{res.litre_gasoil ?? 0}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{(res.litre_essence ?? 0) + (res.litre_gasoil ?? 0)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gestion Sonidep (The tabs and existing list) */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* ... (Keep your existing Tabs and Tab Content code here) ... */}
        {/* Reservation List code remains the same */}
      </section>

      <ReserveModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        onSaved={fetchReservations}
      />
    </div>
  );
}