"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import PayerFactureModal from "./PayerFactureModal";
import {
  groupLivraisonsByPeriod,
  isPeriodClosed,
  computeMontant,
  shouldHideFacture,
  exportFacturePDF,
} from "@/utils/facturePeriods";

export default function FactureTab({ livraisons, reservations, onDuChange }) {
  const [factures, setFactures] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [syncing, setSyncing] = useState(true);
  const [payingFacture, setPayingFacture] = useState(null);

  // 2. Keep track of the latest callback without triggering re-renders
  const onDuChangeRef = useRef(onDuChange);
  useEffect(() => {
    onDuChangeRef.current = onDuChange;
  }, [onDuChange]);

  const processFactures = useCallback((dbFactures, periods) => {
    const enriched = dbFactures
      .map((f) => {
        const period = periods.find(
          (p) => p.debut === f.periode_debut && p.fin === f.periode_fin
        );
        const livs = period?.livraisons ?? [];
        // Always recompute montant_total from actual livraisons, never trust the DB value
        const realMontant = computeMontant(livs);
        return { ...f, livraisons: livs, montant_total: realMontant };
      })
      .filter((f) => f.livraisons.length > 0)
      .filter((f) => !shouldHideFacture(f));

    setFactures(enriched);

    const totalDu = enriched
      .filter((f) => f.statut === "en_attente")
      .reduce((acc, f) => acc + f.montant_total, 0);

    onDuChangeRef.current?.(totalDu);
  }, []);

  const syncFactures = useCallback(async () => {
    // 3. Only set syncing to true if it isn't already (prevents redundant updates)
    setSyncing(true);

    const { data: existing } = await supabase
      .from("factures")
      .select("*")
      .order("periode_debut", { ascending: false });

    const existingKeys = new Set((existing ?? []).map((f) => `${f.periode_debut}__${f.periode_fin}`));
    const periods = groupLivraisonsByPeriod(livraisons);
    
    const toCreate = periods
      .filter((p) => isPeriodClosed(p.fin) && !existingKeys.has(`${p.debut}__${p.fin}`))
      .map((p) => ({
        periode_debut: p.debut,
        periode_fin: p.fin,
        montant_total: computeMontant(p.livraisons),
      }));

    const toUpdate = (existing ?? []).filter((f) => {
      const period = periods.find(
        (p) => p.debut === f.periode_debut && p.fin === f.periode_fin
      );
      if (!period) return false;
      const realMontant = computeMontant(period.livraisons);
      return Math.abs(realMontant - Number(f.montant_total)) > 0.01; // only if it differs
    });

    await Promise.all(
      toUpdate.map((f) => {
        const period = periods.find(
          (p) => p.debut === f.periode_debut && p.fin === f.periode_fin
        );
        return supabase
          .from("factures")
          .update({ montant_total: computeMontant(period.livraisons) })
          .eq("id", f.id);
      })
    );

    // ... inside syncFactures ...

    // 1. Identify invoices that need reopening 
    // (Only if the recomputed montant is different from the recorded montant)
    const toReopen = (existing ?? []).filter((f) => {
      if (f.statut !== "payee") return false;
      
      const period = periods.find(
        (p) => p.debut === f.periode_debut && p.fin === f.periode_fin
      );
      if (!period) return false;

      const realMontant = computeMontant(period.livraisons);
      // Reopen only if the price changed (meaning new slips were added or edited)
      return Math.abs(realMontant - Number(f.montant_total)) > 0.01;
    });

    // 2. Execute the reopen updates
    if (toReopen.length > 0) {
      await Promise.all(
        toReopen.map((f) => {
          const period = periods.find(
            (p) => p.debut === f.periode_debut && p.fin === f.periode_fin
          );
          return supabase
            .from("factures")
            .update({
              statut: "en_attente",
              date_paiement: null,
              montant_total: computeMontant(period.livraisons),
            })
            .eq("id", f.id);
        })
      );
    }

    // 3. Handle creation of new periods
    if (toCreate.length > 0) {
      await supabase.from("factures").insert(toCreate);
    } 

    // 4. Finally, fetch the absolute latest state to show the user
    const { data: refreshed } = await supabase
      .from("factures")
      .select("*")
      .order("periode_debut", { ascending: false });

    processFactures(refreshed ?? [], periods);
    setSyncing(false);

  }, [livraisons, processFactures]); 

  useEffect(() => {
    // We wrap this in a tiny timeout to move the state update 
    // out of the synchronous render phase.
    const timeoutId = setTimeout(() => {
      if (livraisons && livraisons.length > 0) {
        syncFactures();
      } else {
        setSyncing(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [syncFactures, livraisons]); // Added livraisons to deps for safety

  const formatPeriod = (debut, fin) => {
    const d = new Date(debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const f = new Date(fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `${d} — ${f}`;
  };

  if (syncing) return <p className="text-sm text-slate-400">Synchronisation des factures...</p>;

  if (factures.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-100 rounded-xl">
        <p className="text-slate-400 text-sm">Aucune facture en attente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {factures.map((f) => {
        const isExpanded = expandedId === f.id;
        const isPaid = f.statut === "payee";

        return (
          <div key={f.id} className="border border-slate-200 rounded-xl overflow-hidden">

            {/* Facture Header Row */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
              onClick={() => setExpandedId(isExpanded ? null : f.id)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">
                  {formatPeriod(f.periode_debut, f.periode_fin)}
                </span>
                <span className="text-xs text-slate-400">
                  {f.livraisons.length} bon(s) — {Number(f.montant_total).toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Status badge */}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  isPaid
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {isPaid ? "Payée" : "En attente"}
                </span>

                {/* PDF Export */}
                <button
                  onClick={() => exportFacturePDF(f, f.livraisons, reservations)}
                  className="p-2 text-slate-400 hover:text-[#d27045] transition"
                  title="Exporter en PDF"
                >
                  <i className="fa-solid fa-file-pdf text-sm" />
                </button>

                {/* Payé button — non-functional for now */}
                {!isPaid && (
                  <button
                    onClick={() => setPayingFacture(f)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#d27045] text-white rounded-md hover:bg-[#b85b34] transition"
                  >
                    Marquer payée
                  </button>
                )}

                {/* Expand chevron */}
                <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </div>

            {/* BL Detail Table */}
            {isExpanded && (
              <div className="p-4 animate-in fade-in duration-200">
                {f.livraisons.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Aucun bon pour cette période.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase">
                          <th className="pb-2 font-medium">N° Bon</th>
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Réservation</th>
                          <th className="pb-2 font-medium">Type</th>
                          <th className="pb-2 font-medium text-right">Litres</th>
                          <th className="pb-2 font-medium text-right">Prix/L</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {f.livraisons.map((l) => {
                          const res = reservations.find((r) => r.id === l.reservation_id);
                          return (
                            <tr key={l.id} className="hover:bg-slate-50">
                              <td className="py-2 font-semibold text-slate-700">{l.numero_bon}</td>
                              <td className="py-2 text-slate-500">{new Date(l.date_livraison).toLocaleDateString("fr-FR")}</td>
                              <td className="py-2 text-slate-500">{res?.numero_reservation ?? "—"}</td>
                              <td className="py-2 capitalize text-slate-500">{l.type}</td>
                              <td className="py-2 text-right font-medium text-blue-600">{Number(l.litre).toLocaleString("fr-FR")}</td>
                              <td className="py-2 text-right text-slate-500">{Number(l.prix).toLocaleString("fr-FR")}</td>
                              <td className="py-2 text-right font-bold text-slate-700">
                                {(Number(l.litre) * Number(l.prix)).toLocaleString("fr-FR")} F
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan={6} className="pt-2 text-sm font-bold text-slate-600">Total</td>
                          <td className="pt-2 text-right font-bold text-[#d27045]">
                            {Number(f.montant_total).toLocaleString("fr-FR")} FCFA
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })}
      <PayerFactureModal
        isOpen={!!payingFacture}
        facture={payingFacture}
        onClose={() => setPayingFacture(null)}
        onSaved={() => { setPayingFacture(null); syncFactures(); }}
      />
    </div>
  );
}