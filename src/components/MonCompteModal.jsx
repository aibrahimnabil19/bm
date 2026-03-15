"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MonCompteModal({ isOpen, onClose, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ username: "", nom: "" });
  const [passwordData, setPasswordData] = useState({ current: "", nouveau: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [tab, setTab] = useState("infos");
  const [emailData, setEmailData] = useState({ nouvelEmail: "", passwordConfirm: "" });
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles")
        .select("*").eq("id", user.id).single();
      if (prof) {
        setProfile(prof);
        setFormData({ username: prof.username ?? "" });
      }
    };
    load();
    setTab("infos");
    setPasswordData({ current: "", nouveau: "", confirm: "" });
    setEmailData({ nouvelEmail: "", passwordConfirm: "" });
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const handleSaveInfos = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
        const { error: profErr } = await supabase.from("profiles").update({
            username: formData.username.trim().toLowerCase(),
        }).eq("id", profile.id);
      if (profErr) throw new Error(profErr.message);

      alert("Informations mises à jour.");
      onSaved?.();
      onClose();
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.nouveau !== passwordData.confirm) {
      alert("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (passwordData.nouveau.length < 6) {
      alert("Le nouveau mot de passe doit avoir au moins 6 caractères.");
      return;
    }
    setSavingPwd(true);
    try {
      // Verify current password first
      const email = profile.email;
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email, password: passwordData.current
      });
      if (verifyErr) throw new Error("Mot de passe actuel incorrect.");

      // Update password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: passwordData.nouveau
      });
      if (updateErr) throw new Error(updateErr.message);

      alert("Mot de passe changé avec succès.");
      setPasswordData({ current: "", nouveau: "", confirm: "" });
      onClose();
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setSavingPwd(false);
    }
  };

    const handleChangeEmail = async (e) => {
        e.preventDefault();
        if (!emailData.nouvelEmail.includes("@")) {
            alert("Veuillez entrer une adresse email valide.");
            return;
        }
        setSavingEmail(true);
        try {
            // Verify password using the current stored email
            const { error: verifyErr } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: emailData.passwordConfirm,
            });
            if (verifyErr) throw new Error("Mot de passe incorrect.");

            // Update email in Supabase Auth
            const { error: updateErr } = await supabase.auth.updateUser({
            email: emailData.nouvelEmail.trim().toLowerCase(),
            });
            if (updateErr) throw new Error(updateErr.message);

            // Update email in profiles table immediately
            const { error: profErr } = await supabase.from("profiles")
            .update({ email: emailData.nouvelEmail.trim().toLowerCase() })
            .eq("id", profile.id);
            if (profErr) throw new Error(profErr.message);

            alert("Email mis à jour. Un email de confirmation a été envoyé à " + emailData.nouvelEmail + ".");
            setEmailData({ nouvelEmail: "", passwordConfirm: "" });
            onSaved?.();
            onClose();
        } catch (err) {
            alert("Erreur: " + err.message);
        } finally {
            setSavingEmail(false);
        }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Mon Compte</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {[
            { key: "infos", label: "Informations", icon: "fa-solid fa-user" },
            { key: "email", label: "Email", icon: "fa-solid fa-envelope" },
            { key: "password", label: "Mot de passe", icon: "fa-solid fa-lock" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition border-b-2 ${
                tab === t.key
                  ? "border-[#d27045] text-[#d27045]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <i className={t.icon} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto">

          {tab === "infos" && (
            <form onSubmit={handleSaveInfos} className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="text" disabled value={profile.email ?? "—"}
                  className="w-full border border-slate-200 rounded-md p-2 bg-slate-50 text-slate-400 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Modifiable depuis l&apos;onglet Email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom d&apos;utilisateur *
                </label>
                <input type="text" required value={formData.username}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom complet
                  <span className="text-xs text-slate-400 font-normal ml-1">optionnel</span>
                </label>
                <input type="text" value={formData.nom}
                  onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))}
                  placeholder="Votre nom"
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                <input type="text" disabled value="Admin"
                  className="w-full border border-slate-200 rounded-md p-2 bg-slate-50 text-slate-400 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
                  {saving ? "Enregistrement..." : "Sauvegarder"}
                </button>
              </div>
            </form>
          )}

          {tab === "email" && (
            <form onSubmit={handleChangeEmail} className="space-y-4">

                {/* Current email */}
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email actuel</label>
                <input type="text" disabled
                    value={profile.email ?? "—"}
                    className="w-full border border-slate-200 rounded-md p-2 bg-slate-50 text-slate-400 text-sm"
                />
                </div>

                {/* New email */}
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nouvel email *
                </label>
                <input
                    type="email"
                    required
                    value={emailData.nouvelEmail}
                    onChange={(e) => setEmailData((p) => ({ ...p, nouvelEmail: e.target.value }))}
                    placeholder="exemple@gmail.com"
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                />
                </div>

                {/* Password confirmation */}
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirmer avec votre mot de passe *
                </label>
                <input
                    type="password"
                    required
                    value={emailData.passwordConfirm}
                    onChange={(e) => setEmailData((p) => ({ ...p, passwordConfirm: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                />
                </div>

                {/* Info notice */}
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs text-blue-700">
                    <i className="fa-solid fa-circle-info mr-1" />
                    Un email de confirmation sera envoyé à votre nouvelle adresse. Le changement sera effectif après confirmation.
                </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                    Annuler
                </button>
                <button type="submit" disabled={savingEmail}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
                    {savingEmail ? "Envoi en cours..." : "Changer l'email"}
                </button>
                </div>
            </form>
            )}

          {tab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe actuel *
                </label>
                <input type="password" required value={passwordData.current}
                  onChange={(e) => setPasswordData((p) => ({ ...p, current: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nouveau mot de passe *
                </label>
                <input type="password" required minLength={6} value={passwordData.nouveau}
                  onChange={(e) => setPasswordData((p) => ({ ...p, nouveau: e.target.value }))}
                  placeholder="Min. 6 caractères"
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirmer le nouveau mot de passe *
                </label>
                <input type="password" required value={passwordData.confirm}
                  onChange={(e) => setPasswordData((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="••••••••"
                  className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none transition ${
                    passwordData.confirm && passwordData.nouveau !== passwordData.confirm
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                />
                {passwordData.confirm && passwordData.nouveau !== passwordData.confirm && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                  Annuler
                </button>
                <button type="submit" disabled={savingPwd}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60">
                  {savingPwd ? "Mise à jour..." : "Changer le mot de passe"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}