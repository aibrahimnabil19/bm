"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function PayerFactureModal({ isOpen, onClose, onSaved, facture }) {
  const [banques, setBanques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Each entry: { banqueId, montant }
  const [selections, setSelections] = useState([{ banqueId: "", montant: "" }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    supabase.from("banques").select("id, nom, solde").order("nom")
      .then(({ data }) => { setBanques(data ?? []); setLoading(false); });
    // Reset
    setSelections([{ banqueId: "", montant: "" }]);
    setImageFile(null);
    setImagePreview(null);
    setReference("");
  }, [isOpen]);

  if (!isOpen || !facture) return null;

  const totalSaisi = selections.reduce((acc, s) => acc + (Number(s.montant) || 0), 0);
  const remaining = Number(facture.montant_total) - totalSaisi;

  const updateSelection = (index, field, value) => {
    setSelections((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addBank = () => setSelections((prev) => [...prev, { banqueId: "", montant: "" }]);
  const removeBank = (index) => setSelections((prev) => prev.filter((_, i) => i !== index));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validate
    for (const s of selections) {
      if (!s.banqueId || !s.montant || Number(s.montant) <= 0) {
        alert("Veuillez remplir toutes les banques sélectionnées.");
        setSaving(false);
        return;
      }
      const banque = banques.find((b) => b.id === s.banqueId);
      if (Number(s.montant) > Number(banque.solde)) {
        alert(`Solde insuffisant pour ${banque.nom} (${Number(banque.solde).toLocaleString("fr-FR")} FCFA disponible).`);
        setSaving(false);
        return;
      }
    }

    if (Math.abs(totalSaisi - Number(facture.montant_total)) > 0.01) {
      alert(`Le total saisi (${totalSaisi.toLocaleString("fr-FR")} FCFA) doit être égal au montant de la facture (${Number(facture.montant_total).toLocaleString("fr-FR")} FCFA).`);
      setSaving(false);
      return;
    }

    try {
      // Upload receipt if provided
      let recu_image_url = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `recu_sonidep_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("recus-banque").upload(fileName, imageFile, { upsert: true });
        if (upErr) throw new Error("Upload échoué: " + upErr.message);
        const { data } = supabase.storage.from("recus-banque").getPublicUrl(fileName);
        recu_image_url = data.publicUrl;
      }

      // For each bank: create transaction + deduct balance
      for (const s of selections) {
        const banque = banques.find((b) => b.id === s.banqueId);
        const montantNum = Number(s.montant);

        const { error: txErr } = await supabase.from("transactions_banque").insert({
          banque_id: s.banqueId,
          direction: "sortie",
          sous_type: "paiement_sonidep",
          montant: montantNum,
          reference: reference.trim() || null,
          recu_image_url,
          facture_id: facture.id,
        });
        if (txErr) throw new Error(txErr.message);

        const { error: bankErr } = await supabase.from("banques")
          .update({ solde: Number(banque.solde) - montantNum })
          .eq("id", s.banqueId);
        if (bankErr) throw new Error(bankErr.message);
      }

      // Mark facture as paid
      const { error: facErr } = await supabase.from("factures")
        .update({ statut: "payee", date_paiement: new Date().toISOString() })
        .eq("id", facture.id);
      if (facErr) throw new Error(facErr.message);

      onClose();
      onSaved?.();
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatPeriod = (debut, fin) => {
    const d = new Date(debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const f = new Date(fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `${d} — ${f}`;
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Payer la Facture Sonidep</h2>
            <p className="text-xs text-slate-500">
              {formatPeriod(facture.periode_debut, facture.periode_fin)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Facture summary */}
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Montant à payer</p>
                <p className="text-2xl font-bold text-[#d27045]">
                  {Number(facture.montant_total).toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                {facture.livraisons?.length ?? "?"} bon(s)
              </span>
            </div>
          </div>

          {/* Bank selections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Banque(s) de paiement
              </label>
              <button type="button" onClick={addBank}
                className="text-xs text-[#d27045] hover:underline font-medium">
                + Ajouter une banque
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Chargement des banques...</p>
            ) : (
              <div className="space-y-2">
                {selections.map((s, i) => {
                  const selectedBanque = banques.find((b) => b.id === s.banqueId);
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <select
                          value={s.banqueId}
                          onChange={(e) => updateSelection(i, "banqueId", e.target.value)}
                          required
                          className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
                        >
                          <option value="">— Choisir une banque —</option>
                          {banques.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nom} — {Number(b.solde).toLocaleString("fr-FR")} FCFA
                            </option>
                          ))}
                        </select>
                        {selectedBanque && (
                          <p className="text-xs text-slate-400 pl-1">
                            Solde : {Number(selectedBanque.solde).toLocaleString("fr-FR")} FCFA
                          </p>
                        )}
                      </div>
                      <div className="w-36">
                        <input
                          type="number" min="1" required
                          placeholder="Montant"
                          value={s.montant}
                          onChange={(e) => updateSelection(i, "montant", e.target.value)}
                          className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#d27045] outline-none"
                        />
                      </div>
                      {selections.length > 1 && (
                        <button type="button" onClick={() => removeBank(i)}
                          className="mt-2 text-slate-400 hover:text-red-500 transition p-1">
                          <i className="fa-solid fa-xmark text-sm" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Running total vs facture amount */}
          {selections.some((s) => s.montant) && (
            <div className={`rounded-lg p-3 text-sm border ${
              Math.abs(remaining) < 0.01
                ? "bg-green-50 border-green-200"
                : remaining < 0
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-600">Total saisi</span>
                <span className="font-bold">{totalSaisi.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-600">Restant à couvrir</span>
                <span className={`font-bold ${remaining < 0 ? "text-red-600" : remaining === 0 ? "text-green-600" : "text-orange-600"}`}>
                  {remaining.toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            </div>
          )}

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Numéro de reçu Sonidep
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <input type="text" value={reference} placeholder="Ex: REC-SONIDEP-2026-001"
              onChange={(e) => setReference(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          {/* Receipt photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Photo du reçu
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <label className="cursor-pointer flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-lg py-4 hover:border-[#d27045] hover:bg-orange-50 transition">
              <i className="fa-solid fa-camera text-slate-400" />
              <span className="text-sm text-slate-500">
                {imageFile ? imageFile.name : "Photo / upload"}
              </span>
              <input type="file" accept="image/*" capture="environment"
                onChange={handleImageChange} className="hidden" />
            </label>
            {imagePreview && (
              <div className="relative mt-2">
                <Image src={imagePreview} alt="Reçu" width={500} height={300}
                  className="w-full max-h-40 object-contain rounded-lg border border-slate-200" />
                <button type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-1 right-1 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-slate-500 hover:text-red-500 text-xs">
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
              {saving ? "Paiement en cours..." : "Confirmer le paiement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}