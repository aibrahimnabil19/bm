"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const SOUS_TYPES = [
  { value: "paiement_sonidep", label: "Paiement Sonidep", icon: "fa-solid fa-truck-droplet", needsRef: true,  needsDesc: false },
  { value: "paiement_facture", label: "Paiement facture",  icon: "fa-solid fa-file-invoice",  needsRef: false, needsDesc: true  },
  { value: "autre",            label: "Autre",             icon: "fa-solid fa-ellipsis",       needsRef: false, needsDesc: true  },
];

export default function RetirerArgentModal({ isOpen, onClose, onSaved, banque }) {
  const [sousType, setSousType] = useState("paiement_sonidep");
  const [formData, setFormData] = useState({ montant: "", reference: "", description: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const selectedType = SOUS_TYPES.find((s) => s.value === sousType);

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

    if (montantNum > Number(banque.solde)) {
      alert(`Solde insuffisant. Solde actuel : ${Number(banque.solde).toLocaleString("fr-FR")} FCFA`);
      setSaving(false);
      return;
    }

    try {
      let recu_image_url = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `recu_sortie_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("recus-banque").upload(fileName, imageFile, { upsert: true });
        if (upErr) throw new Error("Upload échoué: " + upErr.message);
        const { data } = supabase.storage.from("recus-banque").getPublicUrl(fileName);
        recu_image_url = data.publicUrl;
      }

      // 1. Record transaction
      const { error: txError } = await supabase.from("transactions_banque").insert({
        banque_id: banque.id,
        direction: "sortie",
        sous_type: sousType,
        montant: montantNum,
        reference: formData.reference.trim() || null,
        description: formData.description.trim() || null,
        recu_image_url,
      });
      if (txError) throw new Error(txError.message);

      // 2. Debit the bank
      const { error: bankError } = await supabase.from("banques")
        .update({ solde: Number(banque.solde) - montantNum })
        .eq("id", banque.id);
      if (bankError) throw new Error(bankError.message);

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
            <h2 className="text-lg font-bold text-slate-800">Retirer de l&apos;argent</h2>
            <p className="text-xs text-slate-500">{banque.nom}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Current solde */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-1">Solde actuel</p>
            <p className="text-lg font-bold text-slate-800">
              {Number(banque.solde).toLocaleString("fr-FR")} FCFA
            </p>
          </div>

          {/* Reason picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Motif</label>
            <div className="flex flex-col gap-2">
              {SOUS_TYPES.map((s) => (
                <button key={s.value} type="button"
                  onClick={() => { setSousType(s.value); setFormData((p) => ({ ...p, reference: "", description: "" })); }}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition text-left ${
                    sousType === s.value
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <i className={s.icon} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Montant (FCFA) <span className="text-red-400">*</span>
            </label>
            <input type="number" required min="1" value={formData.montant} placeholder="0"
              onChange={(e) => setFormData((p) => ({ ...p, montant: e.target.value }))}
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
            {formData.montant && Number(formData.montant) > Number(banque.solde) && (
              <p className="text-xs text-red-500 mt-1">Montant supérieur au solde disponible.</p>
            )}
          </div>

          {/* Reference (Sonidep) */}
          {selectedType?.needsRef && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Numéro de reçu
                <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
              </label>
              <input type="text" value={formData.reference} placeholder="Ex: REC-SONIDEP-001"
                onChange={(e) => setFormData((p) => ({ ...p, reference: e.target.value }))}
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
          )}

          {/* Description (facture / autre) */}
          {selectedType?.needsDesc && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {sousType === "paiement_facture" ? "Quelle facture ?" : "Préciser"}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input type="text" required value={formData.description}
                placeholder={sousType === "paiement_facture" ? "Ex: Facture électricité mars" : "Ex: Achat matériel"}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
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

          {/* New total preview */}
          {formData.montant && Number(formData.montant) <= Number(banque.solde) && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm">
              Nouveau solde :{" "}
              <span className="font-bold text-red-600">
                {(Number(banque.solde) - Number(formData.montant)).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-60">
              {saving ? "Traitement..." : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}