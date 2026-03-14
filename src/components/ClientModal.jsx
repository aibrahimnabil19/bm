"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ClientModal({ isOpen, onClose, onSaved, editData }) {
  const [formData, setFormData] = useState({
    nom: editData?.nom ?? "",
    numero: editData?.numero ?? "",
    dette: editData?.dette ?? "",
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nom: formData.nom.trim(),
      numero: formData.numero.trim() || null,
      dette: Number(formData.dette) || 0,
    };

    let error;
    if (editData?.id) {
      ({ error } = await supabase.from("clients").update(payload).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("clients").insert(payload));
    }

    setSaving(false);
    if (error) { alert("Erreur: " + error.message); return; }
    onClose();
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">
            {editData?.id ? "Modifier le Client" : "Nouveau Client"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du client <span className="text-red-400">*</span>
            </label>
            <input
              type="text" name="nom" value={formData.nom} onChange={handleChange} required
              placeholder="Ex: Moussa Issa"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Numéro de téléphone
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <input
              type="tel" name="numero" value={formData.numero} onChange={handleChange}
              placeholder="Ex: +227 90 00 00 00"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dette initiale (FCFA)
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <input
              type="number" name="dette" value={formData.dette} onChange={handleChange}
              min="0" placeholder="0"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}