"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StationModal({ isOpen, onClose, onSaved, editData }) {
  const [formData, setFormData] = useState({
    nom: editData?.nom ?? "",
    ville: editData?.ville ?? "",
    solde: editData?.solde ?? "",
    stock_essence: editData?.stock_essence ?? "",
    stock_gasoil: editData?.stock_gasoil ?? "",
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
      ville: formData.ville.trim(),
      solde: Number(formData.solde) || 0,
      stock_essence: Number(formData.stock_essence) || 0,
      stock_gasoil: Number(formData.stock_gasoil) || 0,
    };

    let error;
    if (editData?.id) {
      ({ error } = await supabase.from("stations").update(payload).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("stations").insert(payload));
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
            {editData?.id ? "Modifier la Station" : "Nouvelle Station"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la station *</label>
              <input
                type="text" name="nom" value={formData.nom} onChange={handleChange} required
                placeholder="Ex: Station Nord"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ville *</label>
              <input
                type="text" name="ville" value={formData.ville} onChange={handleChange} required
                placeholder="Ex: Niamey"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Solde initial (FCFA)
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <input
              type="number" name="solde" value={formData.solde} onChange={handleChange}
              min="0" placeholder="0"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Essence (L)
                <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
              </label>
              <input
                type="number" name="stock_essence" value={formData.stock_essence} onChange={handleChange}
                min="0" step="0.1" placeholder="0"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Gasoil (L)
                <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
              </label>
              <input
                type="number" name="stock_gasoil" value={formData.stock_gasoil} onChange={handleChange}
                min="0" step="0.1" placeholder="0"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
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