"use client";

import React, { useState } from "react";

export default function ReserveModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    numeroReservation: "",
    type: "essence", // default value
    litre: "",
    price: "",
    litreEssence: "",
    litreGasoil: "",
    priceEssence: "",
    priceGasoil: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Data Submitted:", formData);
    // Add your submit logic here (e.g., API call)
    onClose();
  };

  const isMixed = formData.type === "essence et gasoil";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Nouvelle Réservation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Numéro de réservation
            </label>
            <input
              type="text"
              name="numeroReservation"
              value={formData.numeroReservation}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] focus:border-[#d27045] outline-none transition"
              placeholder="Ex: RES-2026-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de carburant
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] focus:border-[#d27045] outline-none transition bg-white"
            >
              <option value="essence">Essence</option>
              <option value="gasoil">Gasoil</option>
              <option value="essence et gasoil">Essence et Gasoil</option>
            </select>
          </div>

          {/* Conditional Rendering Based on Type */}
          {!isMixed ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Litres</label>
                <input
                  type="number"
                  name="litre"
                  value={formData.litre}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prix</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                  min="0"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 bg-slate-50 border border-slate-100 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-600">Détails Essence</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Litres</label>
                  <input
                    type="number"
                    name="litreEssence"
                    value={formData.litreEssence}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prix/L</label>
                  <input
                    type="number"
                    name="priceEssence"
                    value={formData.priceEssence}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                    min="0"
                    required
                  />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-600 mt-4">Détails Gasoil</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Litres</label>
                  <input
                    type="number"
                    name="litreGasoil"
                    value={formData.litreGasoil}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prix/L</label>
                  <input
                    type="number"
                    name="priceGasoil"
                    value={formData.priceGasoil}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition shadow-sm"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}