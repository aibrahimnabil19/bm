"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const CATEGORIES = [
  { value: "electricite", label: "Électricité", icon: "fa-solid fa-bolt" },
  { value: "eau",         label: "Eau",          icon: "fa-solid fa-droplet" },
  { value: "loyer",       label: "Loyer",        icon: "fa-solid fa-building" },
  { value: "salaire",     label: "Salaire",      icon: "fa-solid fa-users" },
  { value: "transport",   label: "Transport",    icon: "fa-solid fa-truck" },
  { value: "autre",       label: "Autre",        icon: "fa-solid fa-ellipsis" },
];

export default function StationDepenseModal({ isOpen, onClose, onSaved, station }) {
  const [formData, setFormData] = useState({ categorie: "", description: "", montant: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const montantNum = Number(formData.montant);

    if (formData.categorie === "autre" && !formData.description.trim()) {
      alert("Veuillez préciser la nature de la dépense.");
      setSaving(false);
      return;
    }

    if (montantNum > Number(station.solde)) {
      alert(`Solde insuffisant. Caisse station : ${Number(station.solde).toLocaleString("fr-FR")} FCFA`);
      setSaving(false);
      return;
    }

    try {
      let recu_image_url = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `depense_station_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("recus-banque").upload(fileName, imageFile, { upsert: true });
        if (upErr) throw new Error("Upload échoué: " + upErr.message);
        const { data: urlData } = supabase.storage.from("recus-banque").getPublicUrl(fileName);
        recu_image_url = urlData.publicUrl;
      }

      const catLabel = CATEGORIES.find((c) => c.value === formData.categorie)?.label ?? formData.categorie;
      const depLabel = formData.categorie === "autre" ? formData.description.trim() : catLabel;

      // 1. Record in depenses table (shows in Dépenses tab)
      const { error: depErr } = await supabase.from("depenses").insert({
        source: "station",
        station_id: station.id,
        categorie: formData.categorie,
        description: formData.description.trim() || null,
        montant: montantNum,
        recu_image_url,
      });
      if (depErr) throw new Error(depErr.message);

      // 2. Deduct from station solde
      const { error: sErr } = await supabase.from("stations")
        .update({ solde: Number(station.solde) - montantNum })
        .eq("id", station.id);
      if (sErr) throw new Error(sErr.message);

      // 3. Log in station activities
      const { error: actErr } = await supabase.from("station_activites").insert({
        station_id: station.id,
        type: "depense",
        description: `Dépense: ${depLabel}`,
        montant: -montantNum,
      });
      if (actErr) throw new Error(actErr.message);

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
            <h2 className="text-lg font-bold text-slate-800">Dépense Station</h2>
            <p className="text-xs text-slate-500">{station.nom} — {station.ville}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Caisse info */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1">Caisse disponible</p>
            <p className="text-lg font-bold text-slate-800">
              {Number(station.solde).toLocaleString("fr-FR")} FCFA
            </p>
          </div>

          {/* Category grid */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Catégorie *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button"
                  onClick={() => setFormData((p) => ({ ...p, categorie: c.value, description: "" }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition ${
                    formData.categorie === c.value
                      ? "border-[#d27045] bg-orange-50 text-[#d27045]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <i className={`${c.icon} text-base`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description for "autre" */}
          {formData.categorie === "autre" && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Préciser la dépense *
              </label>
              <input type="text" required value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Achat fournitures"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
          )}

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA) *</label>
            <input type="number" required min="1" value={formData.montant} placeholder="0"
              onChange={(e) => setFormData((p) => ({ ...p, montant: e.target.value }))}
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
            {formData.montant && Number(formData.montant) > Number(station.solde) && (
              <p className="text-xs text-red-500 mt-1">
                Solde insuffisant ({Number(station.solde).toLocaleString("fr-FR")} FCFA disponible)
              </p>
            )}
          </div>

          {/* Preview */}
          {formData.montant && Number(formData.montant) <= Number(station.solde) && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm">
              Nouveau solde caisse :{" "}
              <span className="font-bold text-red-600">
                {(Number(station.solde) - Number(formData.montant)).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}

          {/* Receipt photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Photo du reçu
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <label className="cursor-pointer flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-lg py-4 hover:border-[#d27045] hover:bg-orange-50 transition">
              <i className="fa-solid fa-camera text-slate-400" />
              <span className="text-sm text-slate-500">{imageFile ? imageFile.name : "Photo / upload"}</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
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
            <button type="submit" disabled={saving || !formData.categorie}
              className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}