"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function LivraisonModal({ isOpen, onClose, onSaved, editData }) {
  const [reservations, setReservations] = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    reservationId: "",
    type: "essence",        // used only when reservation is "essence et gasoil"
    numeroBon: "",
    dateLivraison: "",
    litre: "",
    prix: "",
  });

  // Fetch all reservations for the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoadingRes(true);
      const { data } = await supabase
        .from("reservations")
        .select("id, numero_reservation, type, price_essence, price_gasoil")
        .order("date_reservation", { ascending: false });
      setReservations(data ?? []);
      setLoadingRes(false);
    };
    load();
  }, [isOpen]);

  // Pre-fill when editing
  useEffect(() => {
    if (editData) {
      setFormData({
        reservationId: editData.reservation_id ?? "",
        type: editData.type,
        numeroBon: editData.numero_bon,
        dateLivraison: editData.date_livraison,
        litre: editData.litre,
        prix: editData.prix,
      });
      if (editData.bon_image_url) setImagePreview(editData.bon_image_url);
    } else {
      setFormData({ reservationId: "", type: "essence", numeroBon: "", dateLivraison: "", litre: "", prix: "" });
      setImageFile(null);
      setImagePreview(null);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const selectedReservation = reservations.find((r) => r.id === formData.reservationId);
  const reservationIsMixed = selectedReservation?.type === "essence et gasoil";
  const showTypePicker = reservationIsMixed; // only show radio when reservation has both

  const handleChange = (e) => {
    const { name, value } = e.target;

    // When reservation changes, auto-fill price
    if (name === "reservationId") {
      const res = reservations.find((r) => r.id === value);
      if (res) {
        const autoType = res.type === "gasoil" ? "gasoil" : "essence";
        const autoPrice =
          res.type === "gasoil" ? res.price_gasoil :
          res.type === "essence" ? res.price_essence :
          res.price_essence; // mixed defaults to essence price first
        setFormData((prev) => ({ ...prev, reservationId: value, type: autoType, prix: autoPrice ?? "" }));
      }
      return;
    }

    // When type changes on mixed reservation, update price
    if (name === "type" && selectedReservation) {
      const autoPrice = value === "gasoil" ? selectedReservation.price_gasoil : selectedReservation.price_essence;
      setFormData((prev) => ({ ...prev, type: value, prix: autoPrice ?? prev.prix }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let bon_image_url = editData?.bon_image_url ?? null;

      // Upload image if a new one was selected
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `bon_${formData.numeroBon}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("bons-livraison")
          .upload(fileName, imageFile, { upsert: true });

        if (uploadError) throw new Error("Upload échoué: " + uploadError.message);

        const { data: urlData } = supabase.storage.from("bons-livraison").getPublicUrl(fileName);
        bon_image_url = urlData.publicUrl;
      }

      const payload = {
        reservation_id: formData.reservationId || null,
        numero_bon: formData.numeroBon,
        date_livraison: formData.dateLivraison,
        type: showTypePicker ? formData.type : (selectedReservation?.type ?? formData.type),
        litre: Number(formData.litre),
        prix: Number(formData.prix),
        bon_image_url,
      };

      let error;
      if (editData?.id) {
        ({ error } = await supabase.from("livraisons").update(payload).eq("id", editData.id));
      } else {
        ({ error } = await supabase.from("livraisons").insert(payload));
      }

      if (error) throw new Error(error.message);

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
          <h2 className="text-lg font-bold text-slate-800">
            {editData?.id ? "Modifier la Livraison" : "Nouvelle Livraison"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Reservation picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Réservation associée
            </label>
            {loadingRes ? (
              <p className="text-sm text-slate-400">Chargement des réservations...</p>
            ) : (
              <select
                name="reservationId"
                value={formData.reservationId}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] focus:border-[#d27045] outline-none bg-white"
              >
                <option value="">— Choisir une réservation —</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.numero_reservation} ({r.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Type picker — only for mixed reservations */}
          {showTypePicker && (
            <div className="flex gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100 animate-in fade-in duration-200">
              <p className="text-sm font-medium text-slate-700 mr-2">Type de livraison :</p>
              {["essence", "gasoil"].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={formData.type === t}
                    onChange={handleChange}
                    className="accent-[#d27045]"
                  />
                  <span className="text-sm capitalize text-slate-700">{t}</span>
                </label>
              ))}
            </div>
          )}

          {/* Numero bon */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Numéro de bon de livraison
            </label>
            <input
              type="text"
              name="numeroBon"
              value={formData.numeroBon}
              onChange={handleChange}
              required
              placeholder="Ex: BL-2026-001"
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de livraison
            </label>
            <input
              type="date"
              name="dateLivraison"
              value={formData.dateLivraison}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition bg-white"
            />
          </div>

          {/* Litres + Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Litres livrés</label>
              <input
                type="number"
                name="litre"
                value={formData.litre}
                onChange={handleChange}
                required
                min="0.1"
                step="0.1"
                placeholder="0"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prix / L
                <span className="text-xs text-slate-400 font-normal ml-1">(pré-rempli)</span>
              </label>
              <input
                type="number"
                name="prix"
                value={formData.prix}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
              />
            </div>
          </div>

          {/* Total preview */}
          {formData.litre && formData.prix && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-sm text-slate-700">
              Total estimé :{" "}
              <span className="font-bold text-[#d27045]">
                {(Number(formData.litre) * Number(formData.prix)).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bon de livraison (photo)
            </label>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-lg py-4 hover:border-[#d27045] hover:bg-orange-50 transition">
                <i className="fa-solid fa-camera text-slate-400" />
                <span className="text-sm text-slate-500">
                  {imageFile ? imageFile.name : "Cliquer pour photo / upload"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Aperçu bon"
                    className="w-full max-h-40 object-contain rounded-lg border border-slate-200"
                    width={500}
                    height={500}
                  ></Image>
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-slate-500 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition shadow-sm disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}