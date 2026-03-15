"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UserModal({ isOpen, onClose, onSaved, editData, stations, adminEmail }) {
    const [formData, setFormData] = useState({
        username: editData?.username ?? "",
        role: editData?.role ?? "gerant",
        stationId: editData?.station_id ?? "",
        password: "",
    });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const isEdit = !!editData?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEdit) {
                const { error: profErr } = await supabase.from("profiles").update({
                    username: formData.username.trim().toLowerCase(),
                    role: formData.role,
                    station_id: formData.role === "gerant" ? (formData.stationId || null) : null,
                }).eq("id", editData.id);
                if (profErr) throw new Error(profErr.message);

            } else {
                if (!formData.password || formData.password.length < 6) {
                    throw new Error("Le mot de passe doit avoir au moins 6 caractères.");
                }

                const res = await fetch('/api/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.username.trim().toLowerCase(),
                        password: formData.password,
                        role: formData.role,
                        stationId: formData.stationId || null,
                        adminEmail,
                    }),
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error ?? "Échec de la création.");
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
                    <h2 className="text-lg font-bold text-slate-800">
                        {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nom d&apos;utilisateur *
                        </label>
                        <input type="text" required value={formData.username}
                            onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                            placeholder="Ex: station_nord"
                            className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                        />
                    </div>

                    {/* Role picker */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Rôle *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "gerant", label: "Gérant", icon: "fa-solid fa-user-tie", desc: "Gère sa station" },
                                { value: "lecteur", label: "Lecteur", icon: "fa-solid fa-eye", desc: "Lecture seule" },
                            ].map((r) => (
                                <button key={r.value} type="button"
                                    onClick={() => setFormData((p) => ({ ...p, role: r.value }))}
                                    className={`flex flex-col items-start p-3 rounded-lg border text-left transition ${formData.role === r.value
                                        ? "border-[#d27045] bg-orange-50"
                                        : "border-slate-200 hover:bg-slate-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <i className={`${r.icon} text-sm ${formData.role === r.value ? "text-[#d27045]" : "text-slate-500"}`} />
                                        <span className={`text-sm font-semibold ${formData.role === r.value ? "text-[#d27045]" : "text-slate-700"}`}>
                                            {r.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400">{r.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Station assignment */}
                    {formData.role === "gerant" && (
                        <div className="animate-in fade-in duration-200">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Station assignée
                                <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
                            </label>
                            <select value={formData.stationId}
                                onChange={(e) => setFormData((p) => ({ ...p, stationId: e.target.value }))}
                                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
                            >
                                <option value="">— Aucune station —</option>
                                {stations.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nom} — {s.ville}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Password — only for new users */}
                    {!isEdit && (
                        <div className="animate-in fade-in duration-200">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mot de passe *
                            </label>
                            <input type="password" required minLength={6} value={formData.password}
                                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                                placeholder="Min. 6 caractères"
                                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                            />
                        </div>
                    )}

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