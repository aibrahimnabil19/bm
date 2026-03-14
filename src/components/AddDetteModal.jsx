"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddDetteModal({ isOpen, onClose, onSaved, client }) {
  const [formData, setFormData] = useState({ montant: "", note: "" });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const montantNum = Number(formData.montant);

    try {
      // 1. Record the dette entry for history
      const { error: detteError } = await supabase.from("client_dettes").insert({
        client_id: client.id,
        montant: montantNum,
        note: formData.note.trim() || null,
      });
      if (detteError) throw new Error(detteError.message);

      // 2. Add to client's total dette
      const { error: clientError } = await supabase
        .from("clients")
        .update({ dette: Number(client.dette) + montantNum })
        .eq("id", client.id);
      if (clientError) throw new Error(clientError.message);

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
            <h2 className="text-lg font-bold text-slate-800">Ajouter une Dette</h2>
            <p className="text-xs text-slate-500">{client.nom}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Current dette info */}
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <p className="text-xs text-slate-500 mb-1">Dette actuelle</p>
            <p className="text-lg font-bold text-red-600">
              {Number(client.dette).toLocaleString("fr-FR")} FCFA
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Montant à ajouter (FCFA) <span className="text-red-400">*</span>
            </label>
            <input
              type="number" name="montant" value={formData.montant} onChange={handleChange}
              required min="1" placeholder="0"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note
              <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
            </label>
            <input
              type="text" name="note" value={formData.note} onChange={handleChange}
              placeholder="Ex: Achat gasoil du 14/03"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          {/* Preview new total */}
          {formData.montant && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-sm">
              Nouvelle dette :{" "}
              <span className="font-bold text-[#d27045]">
                {(Number(client.dette) + Number(formData.montant)).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition disabled:opacity-60">
              {saving ? "Ajout..." : "Ajouter la dette"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}