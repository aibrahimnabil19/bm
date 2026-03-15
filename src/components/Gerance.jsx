"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import UserModal from "./UserModal";
import MonCompteModal from "./MonCompteModal";

const ROLE_CONFIG = {
  admin:   { label: "Admin",   color: "bg-red-100 text-red-700",    icon: "fa-solid fa-shield" },
  gerant:  { label: "Gérant",  color: "bg-blue-100 text-blue-700",  icon: "fa-solid fa-user-tie" },
  lecteur: { label: "Lecteur", color: "bg-slate-100 text-slate-600", icon: "fa-solid fa-eye" },
};

const UserRow = ({ user, stations, onEdit, onDelete, isCurrentUser }) => {
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.lecteur;
  const assignedStation = stations.find((s) => s.id === user.station_id);

  return (
    <div className={`flex items-center justify-between py-4 px-5 bg-white rounded-xl border shadow-sm hover:shadow-md transition gap-4 ${isCurrentUser ? "border-[#d27045]" : "border-slate-200"}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <i className={`${cfg.icon} text-sm text-[#d27045]`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">{user.username}</p>
            {isCurrentUser && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Vous</span>
            )}
          </div>
          {user.nom && <p className="text-xs text-slate-500">{user.nom}</p>}
          {assignedStation && (
            <p className="text-xs text-slate-400 mt-0.5">
              <i className="fa-solid fa-gas-pump mr-1" />
              {assignedStation.nom} — {assignedStation.ville}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
          {cfg.label}
        </span>
        <div className="flex gap-1 border-l pl-3 border-slate-200">
          <button onClick={() => onEdit(user)}
            className="p-2 text-slate-400 hover:text-blue-600 transition" title="Modifier">
            <i className="fa-solid fa-pen text-sm" />
          </button>
          {!isCurrentUser && (
            <button onClick={() => onDelete(user.id)}
              className="p-2 text-slate-400 hover:text-red-600 transition" title="Supprimer">
              <i className="fa-solid fa-trash text-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Gerance() {
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isMonCompteOpen, setIsMonCompteOpen] = useState(false);

  const [verifyingAction, setVerifyingAction] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);

    const [{ data: profilesData }, { data: stationsData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("stations").select("id, nom, ville").order("nom"),
    ]);

    setUsers(profilesData ?? []);
    setStations(stationsData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
      // Wrap in a 0ms timeout to move state updates out of the 
      // synchronous render phase and avoid cascading render warnings.
      const timeoutId = setTimeout(() => {
        fetchAll();
      }, 0);
  
      return () => clearTimeout(timeoutId);
    }, [fetchAll]);

  const confirmAction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles")
      .select("username").eq("id", user.id).single();
    const email = `${profile.username}@bmtrading.app`;

    const { error } = await supabase.auth.signInWithPassword({ email, password: adminPassword });
    if (error) { alert("Mot de passe incorrect."); return; }

    const { type, id, data } = verifyingAction;

    if (type === "delete") {
      // Delete from auth via admin API isn't available client-side
      // So we mark as inactive by clearing username (soft approach)
      // Or use supabase edge function — for now just delete profile
      await supabase.from("profiles").delete().eq("id", id);
      fetchAll();
    } else if (type === "edit") {
      setEditingUser(data);
      setIsUserModalOpen(true);
    }

    setVerifyingAction(null);
    setAdminPassword("");
  };

  const nonAdminUsers = users.filter((u) => u.role !== "admin");
  const adminUsers = users.filter((u) => u.role === "admin");

  return (
    <div className="w-full space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gérance</h2>
          <p className="text-sm text-slate-500">{users.length} utilisateur(s) enregistré(s)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMonCompteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
          >
            <i className="fa-solid fa-user-gear" />
            Mon compte
          </button>
          <button
            onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-lg hover:bg-[#b85b34] transition shadow-sm"
          >
            <i className="fa-solid fa-plus" />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Admin accounts (read-only display) */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Administrateurs
        </h3>
        {adminUsers.map((u) => (
          <UserRow key={u.id} user={u} stations={stations}
            isCurrentUser={u.id === currentUserId}
            onEdit={(data) => setVerifyingAction({ type: "edit", id: data.id, data })}
            onDelete={(id) => setVerifyingAction({ type: "delete", id })}
          />
        ))}
      </div>

      {/* Gérants & Lecteurs */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Gérants & Lecteurs
        </h3>
        {loading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : nonAdminUsers.length === 0 ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-400 text-sm">Aucun utilisateur pour le moment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {nonAdminUsers.map((u) => (
              <UserRow key={u.id} user={u} stations={stations}
                isCurrentUser={u.id === currentUserId}
                onEdit={(data) => setVerifyingAction({ type: "edit", id: data.id, data })}
                onDelete={(id) => setVerifyingAction({ type: "delete", id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Rôles</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(ROLE_CONFIG).map(([key, val]) => (
            <div key={key} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${val.color}`}>
                <i className={`${val.icon} text-xs`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{val.label}</p>
                <p className="text-xs text-slate-400">
                  {key === "admin" && "Accès complet à toutes les fonctionnalités"}
                  {key === "gerant" && "Gère sa station assignée, accès limité"}
                  {key === "lecteur" && "Consultation uniquement, aucune modification"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Password verification modal */}
      {verifyingAction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmation Requise</h3>
            <p className="text-sm text-slate-500 mb-4">
              Entrez votre mot de passe pour {verifyingAction.type === "delete" ? "supprimer" : "modifier"} cet utilisateur.
            </p>
            <input type="password" autoFocus
              className="w-full border rounded-lg p-3 mb-4 outline-none focus:ring-2 focus:ring-[#d27045]"
              placeholder="Mot de passe"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAction()}
            />
            <div className="flex gap-3">
              <button onClick={() => { setVerifyingAction(null); setAdminPassword(""); }}
                className="flex-1 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg">
                Annuler
              </button>
              <button onClick={confirmAction}
                className="flex-1 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-black">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <UserModal
        key={editingUser?.id ?? "new-user"}
        isOpen={isUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
        onSaved={fetchAll}
        editData={editingUser}
        stations={stations}
      />

      <MonCompteModal
        isOpen={isMonCompteOpen}
        onClose={() => setIsMonCompteOpen(false)}
        onSaved={fetchAll}
      />
    </div>
  );
}