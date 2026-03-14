"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReserveModal from "./ReserveModal";
import LivraisonModal from "./LivraisonModal";
import { supabase } from "@/lib/supabase";
import FactureTab from "./FactureTab";

// ── Metric Card ───────────────────────────────────────────────────────────────
const MetricCard = ({ title, a, b, onClick, active }) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-32 rounded-xl border shadow-sm p-4 flex flex-col justify-between aspect-square text-left transition active:scale-95 ${
      active ? "ring-2 ring-white brightness-110" : "hover:brightness-110 border-white/20"
    }`}
    style={{ backgroundColor: "#d27045" }}
  >
    <div className="text-sm font-medium text-white/90 truncate">{title}</div>
    <div className="flex flex-col">
      <div className="text-2xl md:text-3xl font-bold text-white">{a}</div>
      {b && <div className="text-[10px] md:text-xs font-medium text-white/70 uppercase tracking-wider">{b}</div>}
    </div>
  </button>
);

// ── Reservation Row ───────────────────────────────────────────────────────────
const ReservationRow = ({ res, livraisons, onEdit, onDelete }) => {
  const totalLitres = (res.litre_essence ?? 0) + (res.litre_gasoil ?? 0);
  const delivered = livraisons
    .filter((l) => l.reservation_id === res.id)
    .reduce((acc, l) => acc + Number(l.litre), 0);
  const remaining = Math.max(0, totalLitres - delivered);

  return (
    <div className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2 transition">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">{res.numero_reservation}</span>
        <span className="text-xs text-slate-400">{new Date(res.date_reservation).toLocaleDateString("fr-FR")}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium capitalize">{res.type}</span>
        {/* Show remaining / total */}
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-slate-700">{remaining.toLocaleString("fr-FR")} L</span>
          <span className="text-xs text-slate-400">sur {totalLitres.toLocaleString("fr-FR")} L</span>
        </div>
        <div className="flex items-center gap-2 ml-2 border-l pl-4 border-slate-200">
          <button onClick={() => onEdit(res)} className="p-2 text-slate-400 hover:text-blue-600 transition">
            <i className="fa-solid fa-pen text-sm" />
          </button>
          <button onClick={() => onDelete(res.id)} className="p-2 text-slate-400 hover:text-red-600 transition">
            <i className="fa-solid fa-trash text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Livraison Row ─────────────────────────────────────────────────────────────
const LivraisonRow = ({ liv, reservations, onEdit, onDelete }) => {
  const linkedRes = reservations.find((r) => r.id === liv.reservation_id);
  return (
    <div className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2 transition">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">{liv.numero_bon}</span>
        <span className="text-xs text-slate-400">{new Date(liv.date_livraison).toLocaleDateString("fr-FR")}</span>
        {linkedRes && (
          <span className="text-xs text-slate-400 mt-0.5">→ {linkedRes.numero_reservation}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">{liv.type}</span>
        <span className="text-sm font-bold text-slate-700">{Number(liv.litre).toLocaleString("fr-FR")} L</span>
        {liv.bon_image_url && (
          <a href={liv.bon_image_url} target="_blank" rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-[#d27045] transition" title="Voir bon">
            <i className="fa-solid fa-image text-sm" />
          </a>
        )}
        <div className="flex items-center gap-2 ml-2 border-l pl-4 border-slate-200">
          <button onClick={() => onEdit(liv)} className="p-2 text-slate-400 hover:text-blue-600 transition">
            <i className="fa-solid fa-pen text-sm" />
          </button>
          <button onClick={() => onDelete(liv.id)} className="p-2 text-slate-400 hover:text-red-600 transition">
            <i className="fa-solid fa-trash text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Sonidep() {
  const [activeTab, setActiveTab] = useState("Reserve");
  const [activeCard, setActiveCard] = useState(null);

  // Data
  const [reservations, setReservations] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [isLivraisonModalOpen, setIsLivraisonModalOpen] = useState(false);
  const [editingLiv, setEditingLiv] = useState(null);

  // Password verification
  const [verifyingAction, setVerifyingAction] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");

  const [duASonidep, setDuASonidep] = useState(0);


  const tabs = ["Reserve", "Livraison", "Facture"];
  

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchAll = React.useCallback(async () => {
      try {
        const [{ data: resData }, { data: livData }, { data: facData }] = await Promise.all([
          supabase.from("reservations").select("*").order("date_reservation", { ascending: false }),
          supabase.from("livraisons").select("*").order("date_livraison", { ascending: false }),
          supabase.from("factures").select("*"),  
        ]);
        setReservations(resData ?? []);
        setLivraisons(livData ?? []);

        // ── THE FIX ────────────────────────────────────────────────────────────
        // Compute dû dynamically based on actual livraisons to avoid "ghost" amounts
        const totalDu = (facData ?? [])
          .filter((f) => f.statut === "en_attente")
          .reduce((acc, f) => {
            // 1. Find livraisons that fall inside this facture's period
            const matchingLivs = (livData ?? []).filter(
              (l) => l.date_livraison >= f.periode_debut && l.date_livraison <= f.periode_fin
            );
            
            // 2. Calculate the real amount based on the remaining bons
            const realMontant = matchingLivs.reduce(
              (sum, l) => sum + (Number(l.litre) * Number(l.prix)), 
              0
            );
            
            // 3. Add to total (if matchingLivs is empty, realMontant is 0)
            return acc + realMontant;
          }, 0);

        setDuASonidep(totalDu);
        // ───────────────────────────────────────────────────────────────────────

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }, []);

  // 2. Use an empty dependency array if you only want this to run once on mount,
  // or keep [fetchAll] since useCallback now stabilizes it.
  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Total across all time
    const totalReserved = reservations.reduce(
      (acc, r) => acc + (r.litre_essence ?? 0) + (r.litre_gasoil ?? 0), 0
    );

    const totalDelivered = livraisons.reduce((acc, l) => acc + Number(l.litre), 0);

    // 2. Current balance at Sonidep
    const remainingReserve = Math.max(0, totalReserved - totalDelivered);

    // 3. Logic for "This Month" (The missing part)
    const thisMonthLivraisons = livraisons.filter((l) => {
      const d = new Date(l.date_livraison);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const thisMonthLitres = thisMonthLivraisons.reduce(
      (acc, l) => acc + Number(l.litre), 0
    );

    return { 
      totalReserved, 
      remainingReserve, 
      totalDelivered, 
      thisMonthLitres, 
      thisMonthLivraisons 
    };
  }, [reservations, livraisons]);

  // ── Verify + confirm actions ────────────────────────────────────────────────
  const confirmAction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: adminPassword });
    if (error) { alert("Mot de passe incorrect. Action refusée."); return; }

    const { type, id, data } = verifyingAction;

    if (type === "delete-res") {
      const { error: e } = await supabase.from("reservations").delete().eq("id", id);
      if (!e) fetchAll();
    } else if (type === "edit-res") {
      setEditingRes(data);
      setIsReserveModalOpen(true);
    } else if (type === "delete-liv") {
      const { error: e } = await supabase.from("livraisons").delete().eq("id", id);
      if (!e) fetchAll();
    } else if (type === "edit-liv") {
      setEditingLiv(data);
      setIsLivraisonModalOpen(true);
    }

    setVerifyingAction(null);
    setAdminPassword("");
  };

  // ── Metric cards ─────────────────────────────────────────────────────────────
  const metrics = [
    { 
      key: "reserve", 
      title: "Réserve à la Sonidep", 
      a: stats.remainingReserve.toLocaleString("fr-FR") + " L", // Shows 4000L
      b: "Solde actuel" 
    },
    { 
      key: "livraison", 
      title: "Enlèvements", 
      a: stats.totalDelivered.toLocaleString("fr-FR") + " L", // Shows 2000L
      b: "Total collecté" 
    },
    { 
      key: "restante", 
      title: "Livraison Restante", 
      // Note: To get your 1500L, you'll need a "Distribution" field in your DB.
      // For now, this shows the total you have in hand to distribute.
      a: stats.totalDelivered.toLocaleString("fr-FR") + " L", 
      b: "En attente de déchargement" 
    },
    { key: "du", title: "Dû à Sonidep", a: duASonidep.toLocaleString("fr-FR"), b: "FCFA" },
  ];

  return (
    <div className="w-full space-y-6 relative">

      {/* Metric Cards */}
      <div className="flex flex-row flex-nowrap gap-4 w-full overflow-x-auto pb-2 scrollbar-hide">
        {metrics.map((m) => (
          <MetricCard
            key={m.key}
            title={m.title}
            a={m.a}
            b={m.b}
            active={activeCard === m.key}
            onClick={() => setActiveCard(activeCard === m.key ? null : m.key)}
          />
        ))}
      </div>

      {/* ── Card Detail Panels ────────────────────────────────────────────── */}

      {activeCard === "reserve" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 animate-in fade-in duration-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-700">Détail des Réservations</h4>
            <button onClick={() => setActiveCard(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                  <th className="pb-2 font-medium">N° Réservation</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Essence (L)</th>
                  <th className="pb-2 font-medium text-right">Gasoil (L)</th>
                  <th className="pb-2 font-medium text-right">Total (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reservations.map((r) => {
                  // Calculate delivery for THIS specific reservation
                  const deliveredForThisRes = livraisons
                    .filter((l) => l.reservation_id === r.id)
                    .reduce((acc, l) => acc + Number(l.litre), 0);
                  
                  const totalForThisRes = (r.litre_essence ?? 0) + (r.litre_gasoil ?? 0);
                  const remainingForThisRes = Math.max(0, totalForThisRes - deliveredForThisRes);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 font-semibold text-slate-700">{r.numero_reservation}</td>
                      <td className="py-2 text-slate-500">{new Date(r.date_reservation).toLocaleDateString("fr-FR")}</td>
                      <td className="py-2 capitalize text-slate-500">{r.type}</td>
                      <td className="py-2 text-right text-orange-600">{r.litre_essence ?? "—"}</td>
                      <td className="py-2 text-right text-blue-600">{r.litre_gasoil ?? "—"}</td>
                      {/* Change this cell to show the balance (Restant) */}
                      <td className="py-2 text-right font-bold text-[#d27045]">
                        {remainingForThisRes.toLocaleString("fr-FR")} L
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={5} className="pt-2 text-sm font-bold text-slate-600">Total général</td>
                  <td className="pt-2 text-right font-bold text-[#d27045]">
                    {stats.totalReserved.toLocaleString("fr-FR")} L
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeCard === "livraison" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 animate-in fade-in duration-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold text-slate-700">Livraisons — Ce mois</h4>
              <p className="text-xs text-slate-400">{stats.thisMonthLivraisons.length} livraison(s) — {stats.thisMonthLitres.toLocaleString("fr-FR")} L total</p>
            </div>
            <button onClick={() => setActiveCard(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>
          {stats.thisMonthLivraisons.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune livraison ce mois-ci.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                    <th className="pb-2 font-medium">N° Bon</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Litres</th>
                    <th className="pb-2 font-medium text-right">Prix/L</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-center">Bon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.thisMonthLivraisons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-2 font-semibold text-slate-700">{l.numero_bon}</td>
                      <td className="py-2 text-slate-500">{new Date(l.date_livraison).toLocaleDateString("fr-FR")}</td>
                      <td className="py-2 capitalize text-slate-500">{l.type}</td>
                      <td className="py-2 text-right font-medium text-blue-600">{Number(l.litre).toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right text-slate-500">{Number(l.prix).toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right font-bold text-slate-700">
                        {(Number(l.litre) * Number(l.prix)).toLocaleString("fr-FR")} F
                      </td>
                      <td className="py-2 text-center">
                        {l.bon_image_url
                          ? <a href={l.bon_image_url} target="_blank" rel="noopener noreferrer" className="text-[#d27045] hover:underline text-xs">Voir</a>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={5} className="pt-2 text-sm font-bold text-slate-600">Total ce mois</td>
                    <td className="pt-2 text-right font-bold text-[#d27045]">
                      {stats.thisMonthLivraisons.reduce((a, l) => a + Number(l.litre) * Number(l.prix), 0).toLocaleString("fr-FR")} F
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {activeCard === "restante" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 ...">
          {/* ... Header ... */}
          <div className="space-y-3">
            {reservations.map((r) => {
              const totalRes = (r.litre_essence ?? 0) + (r.litre_gasoil ?? 0);
              const delivered = livraisons
                .filter((l) => l.reservation_id === r.id)
                .reduce((a, l) => a + Number(l.litre), 0);
              
              // FIX: Calculate what is still left to take FROM this specific reservation
              const leftToCollect = Math.max(0, totalRes - delivered);
              const pct = totalRes > 0 ? Math.round((delivered / totalRes) * 100) : 0;

              return (
                <div key={r.id} className="...">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-slate-700">{r.numero_reservation}</span>
                    <span className="text-xs text-slate-500">
                      {leftToCollect.toLocaleString("fr-FR")} L à collecter {/* Changed label */}
                    </span>
                  </div>
                  {/* ... Progress bar ... */}
                  <div className="flex justify-between mt-1 text-xs text-slate-400">
                    <span>{pct}% collecté</span> {/* Changed label */}
                    <span className="font-medium text-slate-600">Total: {totalRes.toLocaleString("fr-FR")} L</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Gestion Sonidep Section ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Gestion Sonidep</h3>
            <p className="text-xs text-slate-500">Flux de travail centralisé</p>
          </div>
        </div>

        <div className="flex p-2 gap-1 bg-slate-100/50">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === t
                  ? "bg-white text-[#d27045] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 min-h-64">

          {/* ── RESERVE TAB ── */}
          {activeTab === "Reserve" && (
            <div className="animate-in fade-in duration-300 flex flex-col">
              <div className="w-full flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">État de la Réserve</h4>
                <button
                  onClick={() => { setEditingRes(null); setIsReserveModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-md hover:bg-[#b85b34] transition shadow-sm"
                >
                  <i className="fa-solid fa-plus" />
                  Nouvelle Réservation
                </button>
              </div>
              {loading ? (
                <p className="text-sm text-slate-400">Chargement...</p>
              ) : reservations.length === 0 ? (
                <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-slate-400 text-sm">Aucune réservation pour le moment.</p>
                </div>
              ) : (
                reservations.map((res) => (
                  <ReservationRow key={res.id} res={res} livraisons={livraisons}
                    onEdit={(data) => setVerifyingAction({ type: "edit-res", id: data.id, data })}
                    onDelete={(id) => setVerifyingAction({ type: "delete-res", id })}
                  />
                ))
              )}
            </div>
          )}

          {/* ── LIVRAISON TAB ── */}
          {activeTab === "Livraison" && (
            <div className="animate-in fade-in duration-300 flex flex-col">
              <div className="w-full flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Module de Livraison</h4>
                <button
                  onClick={() => { setEditingLiv(null); setIsLivraisonModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-md hover:bg-[#b85b34] transition shadow-sm"
                >
                  <i className="fa-solid fa-plus" />
                  Nouvelle Livraison
                </button>
              </div>
              {loading ? (
                <p className="text-sm text-slate-400">Chargement...</p>
              ) : livraisons.length === 0 ? (
                <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-slate-400 text-sm">Aucune livraison pour le moment.</p>
                </div>
              ) : (
                livraisons.map((liv) => (
                  <LivraisonRow key={liv.id} liv={liv} reservations={reservations}
                    onEdit={(data) => setVerifyingAction({ type: "edit-liv", id: data.id, data })}
                    onDelete={(id) => setVerifyingAction({ type: "delete-liv", id })}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "Facture" && (
            <div className="animate-in fade-in duration-300">
              <div className="w-full flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Facturation</h4>
              </div>
              <FactureTab
                livraisons={livraisons}
                reservations={reservations}
                onDuChange={setDuASonidep}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Password Verification Modal ───────────────────────────────────── */}
      {verifyingAction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmation Requise</h3>
            <p className="text-sm text-slate-500 mb-4">
              Entrez votre mot de passe pour {verifyingAction.type.includes("delete") ? "supprimer" : "modifier"} cette donnée.
            </p>
            <input
              type="password"
              autoFocus
              className="w-full border rounded-lg p-3 mb-4 outline-none focus:ring-2 focus:ring-[#d27045]"
              placeholder="Mot de passe"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAction()}
            />
            <div className="flex gap-3">
              <button onClick={() => { setVerifyingAction(null); setAdminPassword(""); }}
                className="flex-1 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg">
                Annuler
              </button>
              <button onClick={confirmAction}
                className="flex-1 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-black">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ReserveModal
        key={editingRes?.id ?? "new-res"}
        isOpen={isReserveModalOpen}
        onClose={() => { setIsReserveModalOpen(false); setEditingRes(null); }}
        onSaved={fetchAll}
        editData={editingRes}
      />

      <LivraisonModal
        key={editingLiv?.id ?? "new-liv"}
        isOpen={isLivraisonModalOpen}
        onClose={() => { setIsLivraisonModalOpen(false); setEditingLiv(null); }}
        onSaved={fetchAll}
        editData={editingLiv}
      />
    </div>
  );
}