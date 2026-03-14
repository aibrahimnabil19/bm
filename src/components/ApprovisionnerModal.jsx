"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ApprovisionnerModal({ isOpen, onClose, onSaved, station }) {
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    livraisonId: "",
    litre: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      // Only show BLs that still have litres available (litre_distribue < litre)
      const { data } = await supabase
        .from("livraisons")
        .select("id, numero_bon, date_livraison, type, litre, litre_distribue")
        .order("date_livraison", { ascending: false });

      // Filter to only those with remaining litres
      const available = (data ?? []).filter(
        (l) => Number(l.litre) - Number(l.litre_distribue) > 0
      );
      setLivraisons(available);
      setLoading(false);
    };
    load();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedBL = livraisons.find((l) => l.id === formData.livraisonId);
  const available = selectedBL
    ? Number(selectedBL.litre) - Number(selectedBL.litre_distribue)
    : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "livraisonId") {
      setFormData({ livraisonId: value, litre: "" });
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const litreNum = Number(formData.litre);

    if (litreNum > available) {
      alert(`Vous ne pouvez pas distribuer plus que les ${available.toLocaleString("fr-FR")} L disponibles sur ce bon.`);
      setSaving(false);
      return;
    }

    try {
      // 1. Record the approvisionnement
      const { error: appError } = await supabase.from("approvisionnements").insert({
        station_id: station.id,
        livraison_id: formData.livraisonId,
        type: selectedBL.type,
        litre: litreNum,
      });
      if (appError) throw new Error(appError.message);

      // 2. Update litre_distribue on the BL
      const { error: livError } = await supabase
        .from("livraisons")
        .update({ litre_distribue: Number(selectedBL.litre_distribue) + litreNum })
        .eq("id", formData.livraisonId);
      if (livError) throw new Error(livError.message);

      // 3. Update station stock
      const stockField = selectedBL.type === "gasoil" ? "stock_gasoil" : "stock_essence";
      const currentStock = Number(station[stockField]);
      const { error: stationError } = await supabase
        .from("stations")
        .update({ [stockField]: currentStock + litreNum })
        .eq("id", station.id);
      if (stationError) throw new Error(stationError.message);

      await supabase.from("station_activites").insert({
        station_id: station.id,
        type: "approvisionnement",
        description: `Approvisionnement depuis BL ${selectedBL.numero_bon}`,
        litre: litreNum,
        carburant: selectedBL.type,
      });

      onClose();
      onSaved?.();
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Approvisionner</h2>
            <p className="text-xs text-slate-500">{station.nom} — {station.ville}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* BL picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bon de livraison source
            </label>
            {loading ? (
              <p className="text-sm text-slate-400">Chargement des bons...</p>
            ) : livraisons.length === 0 ? (
              <p className="text-sm text-orange-500">Aucun bon avec du stock disponible.</p>
            ) : (
              <select
                name="livraisonId" value={formData.livraisonId} onChange={handleChange} required
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
              >
                <option value="">— Choisir un bon —</option>
                {livraisons.map((l) => {
                  const dispo = Number(l.litre) - Number(l.litre_distribue);
                  return (
                    <option key={l.id} value={l.id}>
                      {l.numero_bon} — {l.type} — {dispo.toLocaleString("fr-FR")} L dispo
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Selected BL info */}
          {selectedBL && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm animate-in fade-in duration-150">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium capitalize text-slate-700">{selectedBL.type}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Disponible</span>
                <span className="font-bold text-[#d27045]">{available.toLocaleString("fr-FR")} L</span>
              </div>
            </div>
          )}

          {/* Litres to transfer */}
          {selectedBL && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Litres à transférer
              </label>
              <input
                type="number" name="litre" value={formData.litre} onChange={handleChange}
                required min="0.1" step="0.1" max={available} placeholder="0"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
              {formData.litre && Number(formData.litre) > available && (
                <p className="text-xs text-red-500 mt-1">
                  Dépasse le disponible ({available.toLocaleString("fr-FR")} L)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving || !selectedBL}
              className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
              {saving ? "Transfert..." : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}