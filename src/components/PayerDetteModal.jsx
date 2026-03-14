"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const EMPTY_LINE = { methode: "cash", montant: "", stationId: "", banqueId: "", reference: "", imageFile: null, imagePreview: null };

export default function PayerDetteModal({ isOpen, onClose, onSaved, client }) {
  const [stations, setStations] = useState([]);
  const [banques, setBanques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lignes, setLignes] = useState([{ ...EMPTY_LINE }]);

  useEffect(() => {
    if (!isOpen) return;
    setLignes([{ ...EMPTY_LINE }]);
    setLoading(true);
    Promise.all([
      supabase.from("stations").select("id, nom, ville, solde").order("nom"),
      supabase.from("banques").select("id, nom, solde").order("nom"),
    ]).then(([{ data: sData }, { data: bData }]) => {
      setStations(sData ?? []);
      setBanques(bData ?? []);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen || !client) return null;

  const totalSaisi = lignes.reduce((acc, l) => acc + (Number(l.montant) || 0), 0);
  const dette = Number(client.dette);

  const updateLigne = (index, field, value) => {
    setLignes((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const handleImageChange = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateLigne(index, "imageFile", file);
    updateLigne(index, "imagePreview", URL.createObjectURL(file));
  };

  const addLigne = () => setLignes((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLigne = (index) => setLignes((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validate
    for (const l of lignes) {
      if (!l.montant || Number(l.montant) <= 0) {
        alert("Veuillez saisir un montant valide pour chaque ligne.");
        setSaving(false);
        return;
      }
      if (l.methode === "cash" && !l.stationId) {
        alert("Veuillez sélectionner une station pour le paiement en espèces.");
        setSaving(false);
        return;
      }
      if (l.methode === "banque" && !l.banqueId) {
        alert("Veuillez sélectionner une banque.");
        setSaving(false);
        return;
      }
    }

    if (totalSaisi > dette) {
      alert(`Le total (${totalSaisi.toLocaleString("fr-FR")} FCFA) dépasse la dette (${dette.toLocaleString("fr-FR")} FCFA).`);
      setSaving(false);
      return;
    }

    try {
      // 1. Create the parent paiement record
      const { data: paiementData, error: pErr } = await supabase
        .from("client_paiements")
        .insert({ client_id: client.id, montant_total: totalSaisi })
        .select("id")
        .single();
      if (pErr) throw new Error(pErr.message);

      const paiementId = paiementData.id;

      // 2. Process each ligne
      for (const l of lignes) {
        const montantNum = Number(l.montant);

        // Upload image if bank with receipt
        let recu_image_url = null;
        if (l.methode === "banque" && l.imageFile) {
          const ext = l.imageFile.name.split(".").pop();
          const fileName = `recu_client_${client.id}_${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("recus-banque")
            .upload(fileName, l.imageFile, { upsert: true });
          if (upErr) throw new Error("Upload échoué: " + upErr.message);
          const { data: urlData } = supabase.storage.from("recus-banque").getPublicUrl(fileName);
          recu_image_url = urlData.publicUrl;
        }

        // Insert ligne
        const { error: ligneErr } = await supabase.from("client_paiement_lignes").insert({
          paiement_id: paiementId,
          methode: l.methode,
          montant: montantNum,
          station_id: l.methode === "cash" ? l.stationId : null,
          banque_id: l.methode === "banque" ? l.banqueId : null,
          reference: l.reference.trim() || null,
          recu_image_url,
        });
        if (ligneErr) throw new Error(ligneErr.message);

        // Update station or bank balance
        if (l.methode === "cash") {
          const station = stations.find((s) => s.id === l.stationId);
          const { error: sErr } = await supabase
            .from("stations")
            .update({ solde: Number(station.solde) + montantNum })
            .eq("id", l.stationId);
          if (sErr) throw new Error(sErr.message);
        } else {
          const banque = banques.find((b) => b.id === l.banqueId);
          const { error: bErr } = await supabase
            .from("banques")
            .update({ solde: Number(banque.solde) + montantNum })
            .eq("id", l.banqueId);
          if (bErr) throw new Error(bErr.message);

          await supabase.from("station_activites").insert({
            station_id: l.stationId,
            type: "paiement_client",
            description: `Paiement dette client: ${client.nom}`,
            montant: montantNum,
          });

          // Record bank transaction
          const { error: txErr } = await supabase.from("transactions_banque").insert({
            banque_id: l.banqueId,
            direction: "entree",
            sous_type: "depot_direct",
            montant: montantNum,
            reference: l.reference.trim() || null,
            description: `Paiement dette client: ${client.nom}`,
            recu_image_url,
          });
          if (txErr) throw new Error(txErr.message);
        }
      }

      // 3. Deduct from client dette
      const { error: clientErr } = await supabase
        .from("clients")
        .update({ dette: Math.max(0, dette - totalSaisi) })
        .eq("id", client.id);
      if (clientErr) throw new Error(clientErr.message);

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
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Payer la Dette</h2>
            <p className="text-xs text-slate-500">{client.nom}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Dette actuelle */}
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <p className="text-xs text-slate-500 mb-1">Dette actuelle</p>
            <p className="text-2xl font-bold text-red-600">
              {dette.toLocaleString("fr-FR")} FCFA
            </p>
          </div>

          {/* Payment lines */}
          {loading ? (
            <p className="text-sm text-slate-400">Chargement...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Méthodes de paiement</p>
                <button type="button" onClick={addLigne}
                  className="text-xs text-[#d27045] hover:underline font-medium">
                  + Ajouter une méthode
                </button>
              </div>

              {lignes.map((l, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-3">
                  {/* Header of line */}
                  <div className="flex items-center justify-between">
                    {/* Method toggle */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                      {["cash", "banque"].map((m) => (
                        <button key={m} type="button"
                          onClick={() => updateLigne(i, "methode", m)}
                          className={`px-4 py-1.5 text-xs font-semibold transition ${
                            l.methode === m
                              ? "bg-[#d27045] text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {m === "cash" ? "Espèces" : "Banque"}
                        </button>
                      ))}
                    </div>
                    {lignes.length > 1 && (
                      <button type="button" onClick={() => removeLigne(i)}
                        className="text-slate-400 hover:text-red-500 p-1">
                        <i className="fa-solid fa-xmark text-sm" />
                      </button>
                    )}
                  </div>

                  {/* Montant */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Montant (FCFA) *
                    </label>
                    <input type="number" required min="1" value={l.montant} placeholder="0"
                      onChange={(e) => updateLigne(i, "montant", e.target.value)}
                      className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#d27045] outline-none"
                    />
                  </div>

                  {/* Cash: station picker */}
                  {l.methode === "cash" && (
                    <div className="animate-in fade-in duration-150">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Station destinataire *
                      </label>
                      <select required value={l.stationId}
                        onChange={(e) => updateLigne(i, "stationId", e.target.value)}
                        className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
                      >
                        <option value="">— Choisir une station —</option>
                        {stations.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nom} ({s.ville}) — {Number(s.solde).toLocaleString("fr-FR")} FCFA
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Bank: bank picker + reference + photo */}
                  {l.methode === "banque" && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Banque *
                        </label>
                        <select required value={l.banqueId}
                          onChange={(e) => updateLigne(i, "banqueId", e.target.value)}
                          className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
                        >
                          <option value="">— Choisir une banque —</option>
                          {banques.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nom} — {Number(b.solde).toLocaleString("fr-FR")} FCFA
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          N° de reçu
                          <span className="text-slate-400 font-normal ml-1">optionnel</span>
                        </label>
                        <input type="text" value={l.reference} placeholder="Ex: REC-001"
                          onChange={(e) => updateLigne(i, "reference", e.target.value)}
                          className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[#d27045] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Photo du reçu
                          <span className="text-slate-400 font-normal ml-1">optionnel</span>
                        </label>
                        <label className="cursor-pointer flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-lg py-3 hover:border-[#d27045] hover:bg-orange-50 transition">
                          <i className="fa-solid fa-camera text-slate-400 text-sm" />
                          <span className="text-xs text-slate-500">
                            {l.imageFile ? l.imageFile.name : "Photo / upload"}
                          </span>
                          <input type="file" accept="image/*" capture="environment"
                            onChange={(e) => handleImageChange(i, e)} className="hidden" />
                        </label>
                        {l.imagePreview && (
                          <div className="relative mt-2">
                            <Image src={l.imagePreview} alt="Reçu" width={400} height={200}
                              className="w-full max-h-32 object-contain rounded-lg border border-slate-200" />
                            <button type="button"
                              onClick={() => { updateLigne(i, "imageFile", null); updateLigne(i, "imagePreview", null); }}
                              className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow text-slate-400 hover:text-red-500 text-xs">
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Running total */}
          {lignes.some((l) => l.montant) && (
            <div className={`rounded-lg p-3 text-sm border ${
              totalSaisi > dette ? "bg-red-50 border-red-200"
              : totalSaisi === dette ? "bg-green-50 border-green-200"
              : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-600">Total à payer</span>
                <span className="font-bold">{totalSaisi.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-600">Reste à devoir</span>
                <span className={`font-bold ${
                  totalSaisi > dette ? "text-red-600"
                  : totalSaisi === dette ? "text-green-600"
                  : "text-orange-600"
                }`}>
                  {Math.max(0, dette - totalSaisi).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition disabled:opacity-60">
              {saving ? "Traitement..." : "Confirmer le paiement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}