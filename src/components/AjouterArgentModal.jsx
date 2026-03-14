"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const SOUS_TYPES = [
  { value: "depot_station", label: "Depuis une station", icon: "fa-solid fa-gas-pump" },
  { value: "depot_direct",  label: "Dépôt direct",       icon: "fa-solid fa-building-columns" },
];

export default function AjouterArgentModal({ isOpen, onClose, onSaved, banque }) {
  const [sousType, setSousType] = useState("depot_direct");
  const [stations, setStations] = useState([]);
  const [formData, setFormData] = useState({
    stationId: "",
    montant: "",
    reference: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    supabase.from("stations").select("id, nom, ville, solde")
      .order("nom").then(({ data }) => setStations(data ?? []));
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedStation = stations.find((s) => s.id === formData.stationId);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (prefix) => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("recus-banque").upload(fileName, imageFile, { upsert: true });
    if (error) throw new Error("Upload échoué: " + error.message);
    const { data } = supabase.storage.from("recus-banque").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const montantNum = Number(formData.montant);

    try {
      // Validate station has enough solde
      if (sousType === "depot_station") {
        if (!selectedStation) throw new Error("Veuillez choisir une station.");
        if (montantNum > Number(selectedStation.solde)) {
          throw new Error(`La station n'a que ${Number(selectedStation.solde).toLocaleString("fr-FR")} FCFA.`);
        }
      }

      const recu_image_url = await uploadImage("recu_entree");

      // 1. Record transaction
      const { error: txError } = await supabase.from("transactions_banque").insert({
        banque_id: banque.id,
        direction: "entree",
        sous_type: sousType,
        montant: montantNum,
        reference: formData.reference.trim() || null,
        recu_image_url,
        station_id: sousType === "depot_station" ? formData.stationId : null,
      });
      if (txError) throw new Error(txError.message);

      // 2. Credit the bank
      const { error: bankError } = await supabase.from("banques")
        .update({ solde: Number(banque.solde) + montantNum })
        .eq("id", banque.id);
      if (bankError) throw new Error(bankError.message);

      // 3. Deduct from station if applicable
      if (sousType === "depot_station" && selectedStation) {
        const { error: stError } = await supabase.from("stations")
          .update({ solde: Number(selectedStation.solde) - montantNum })
          .eq("id", selectedStation.id);
        if (stError) throw new Error(stError.message);

        // After deducting station solde, add:
      await supabase.from("station_activites").insert({
        station_id: selectedStation.id,
        type: "depot_banque",
        description: `Dépôt en banque: ${banque.nom}`,
        montant: -montantNum,
      });
      }

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
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ajouter de l&apos;argent</h2>
            <p className="text-xs text-slate-500">{banque.nom}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Current solde */}
          <div className="rounded-lg bg-green-50 border border-green-100 p-3">
            <p className="text-xs text-slate-500 mb-1">Solde actuel</p>
            <p className="text-lg font-bold text-green-700">
              {Number(banque.solde).toLocaleString("fr-FR")} FCFA
            </p>
          </div>

          {/* Source type picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
            <div className="grid grid-cols-2 gap-2">
              {SOUS_TYPES.map((s) => (
                <button key={s.value} type="button"
                  onClick={() => { setSousType(s.value); setFormData((p) => ({ ...p, stationId: "", montant: "" })); }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition ${
                    sousType === s.value
                      ? "border-[#d27045] bg-orange-50 text-[#d27045]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <i className={s.icon} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Station picker */}
          {sousType === "depot_station" && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">Station</label>
              <select value={formData.stationId}
                onChange={(e) => setFormData((p) => ({ ...p, stationId: e.target.value }))}
                required className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
              >
                <option value="">— Choisir une station —</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} ({s.ville}) — {Number(s.solde).toLocaleString("fr-FR")} FCFA
                  </option>
                ))}
              </select>
              {selectedStation && (
                <p className="text-xs text-slate-500 mt-1">
                  Solde station : <span className="font-semibold">{Number(selectedStation.solde).toLocaleString("fr-FR")} FCFA</span>
                </p>
              )}
            </div>
          )}

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Montant (FCFA) <span className="text-red-400">*</span>
            </label>
            <input type="number" required min="1" value={formData.montant} placeholder="0"
              onChange={(e) => setFormData((p) => ({ ...p, montant: e.target.value }))}
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          {/* Reference (for depot_direct) */}
          {sousType === "depot_direct" && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Numéro de reçu
                <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
              </label>
              <input type="text" value={formData.reference} placeholder="Ex: REC-2026-001"
                onChange={(e) => setFormData((p) => ({ ...p, reference: e.target.value }))}
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />

              {/* Receipt photo */}
              <div className="mt-3">
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
            </div>
          )}

          {/* New total preview */}
          {formData.montant && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-sm">
              Nouveau solde :{" "}
              <span className="font-bold text-[#d27045]">
                {(Number(banque.solde) + Number(formData.montant)).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition disabled:opacity-60">
              {saving ? "Traitement..." : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}