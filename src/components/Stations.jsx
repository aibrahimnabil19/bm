"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StationModal from "./StationModal";
import ApprovisionnerModal from "./ApprovisionnerModal";

// ── Station Card ──────────────────────────────────────────────────────────────
const StationCard = ({ station, onEdit, onDelete, onApprovisionner }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
    {/* Header */}
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-800">{station.nom}</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          <i className="fa-solid fa-location-dot mr-1" />
          {station.ville}
        </p>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onEdit(station)}
          className="p-2 text-slate-400 hover:text-blue-600 transition"
          title="Modifier"
        >
          <i className="fa-solid fa-pen text-sm" />
        </button>
        <button
          onClick={() => onDelete(station.id)}
          className="p-2 text-slate-400 hover:text-red-600 transition"
          title="Supprimer"
        >
          <i className="fa-solid fa-trash text-sm" />
        </button>
      </div>
    </div>

    {/* Stock pills */}
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
        <p className="text-xs text-orange-500 font-medium uppercase tracking-wider mb-1">Essence</p>
        <p className="text-lg font-bold text-orange-700">
          {Number(station.stock_essence).toLocaleString("fr-FR")} <span className="text-sm font-normal">L</span>
        </p>
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
        <p className="text-xs text-blue-500 font-medium uppercase tracking-wider mb-1">Gasoil</p>
        <p className="text-lg font-bold text-blue-700">
          {Number(station.stock_gasoil).toLocaleString("fr-FR")} <span className="text-sm font-normal">L</span>
        </p>
      </div>
    </div>

    {/* Solde */}
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Solde caisse</p>
      <p className="text-lg font-bold text-slate-800">
        {Number(station.solde).toLocaleString("fr-FR")} <span className="text-sm font-normal">FCFA</span>
      </p>
    </div>

    {/* Actions */}
    <div className="flex gap-2 pt-1 border-t border-slate-100">
      <button
        onClick={() => onApprovisionner(station)}
        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium bg-[#d27045] text-white rounded-lg hover:bg-[#b85b34] transition"
      >
        <i className="fa-solid fa-gas-pump" />
        Approvisionner
      </button>
      <button
        disabled
        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
        title="À venir"
      >
        <i className="fa-solid fa-money-bill" />
        Dépense
      </button>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function Stations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. The trigger state replaces useCallback(fetchStations)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [approvStation, setApprovStation] = useState(null);

  // Password verification
  const [verifyingAction, setVerifyingAction] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");

  // 2. A simple function to increment the trigger and fire the useEffect
  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  // 3. Move the fetching logic safely inside the effect
  useEffect(() => {
    let isMounted = true; // Prevents memory leaks if component unmounts quickly

    const fetchStations = async () => {
      const { data, error } = await supabase
        .from("stations")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (isMounted) {
        if (!error) setStations(data ?? []);
        setLoading(false);
      }
    };

    fetchStations();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]); // The effect listens to the trigger

  const confirmAction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: adminPassword,
    });
    if (error) { alert("Mot de passe incorrect."); return; }

    const { type, id, data } = verifyingAction;

    if (type === "delete") {
      await supabase.from("stations").delete().eq("id", id);
      refreshData(); // Call the trigger instead of fetchStations
    } else if (type === "edit") {
      setEditingStation(data);
      setIsStationModalOpen(true);
    }

    setVerifyingAction(null);
    setAdminPassword("");
  };

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Stations</h2>
          <p className="text-sm text-slate-500">{stations.length} station(s) enregistrée(s)</p>
        </div>
        <button
          onClick={() => { setEditingStation(null); setIsStationModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-lg hover:bg-[#b85b34] transition shadow-sm"
        >
          <i className="fa-solid fa-plus" />
          Nouvelle Station
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : stations.length === 0 ? (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm">Aucune station pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((s) => (
            <StationCard
              key={s.id}
              station={s}
              onEdit={(data) => setVerifyingAction({ type: "edit", id: data.id, data })}
              onDelete={(id) => setVerifyingAction({ type: "delete", id })}
              onApprovisionner={(s) => setApprovStation(s)}
            />
          ))}
        </div>
      )}

      {/* Password Modal */}
      {verifyingAction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmation Requise</h3>
            <p className="text-sm text-slate-500 mb-4">
              Entrez votre mot de passe pour {verifyingAction.type === "delete" ? "supprimer" : "modifier"} cette station.
            </p>
            <input
              type="password"
              autoFocus
              className="w-full border rounded-lg p-3 mb-4 outline-none focus:ring-2 focus:ring-[#d27045]"
              placeholder="Mot de passe"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAction()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setVerifyingAction(null); setAdminPassword(""); }}
                className="flex-1 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-black"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Station Add/Edit Modal */}
      <StationModal
        key={editingStation?.id ?? "new-station"}
        isOpen={isStationModalOpen}
        onClose={() => { setIsStationModalOpen(false); setEditingStation(null); }}
        onSaved={refreshData} // Passed the trigger
        editData={editingStation}
      />

      {/* Approvisionner Modal */}
      {approvStation && (
        <ApprovisionnerModal
          key={approvStation.id}
          isOpen={!!approvStation}
          station={approvStation}
          onClose={() => setApprovStation(null)}
          onSaved={refreshData} // Passed the trigger
        />
      )}
    </div>
  );
}