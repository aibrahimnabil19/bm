"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import DepenseModal from "./DepenseModal";

const CATEGORIE_LABELS = {
  electricite: { label: "Électricité", icon: "fa-solid fa-bolt", color: "text-yellow-600 bg-yellow-50" },
  eau:         { label: "Eau",          icon: "fa-solid fa-droplet", color: "text-blue-600 bg-blue-50" },
  loyer:       { label: "Loyer",        icon: "fa-solid fa-building", color: "text-purple-600 bg-purple-50" },
  salaire:     { label: "Salaire",      icon: "fa-solid fa-users", color: "text-green-600 bg-green-50" },
  transport:   { label: "Transport",    icon: "fa-solid fa-truck", color: "text-orange-600 bg-orange-50" },
  autre:       { label: "Autre",        icon: "fa-solid fa-ellipsis", color: "text-slate-600 bg-slate-100" },
};

const DepenseRow = ({ dep, banques, stations }) => {
  const cat = CATEGORIE_LABELS[dep.categorie] ?? CATEGORIE_LABELS.autre;
  const source = dep.source === "banque"
    ? banques.find((b) => b.id === dep.banque_id)?.nom ?? "Banque"
    : stations.find((s) => s.id === dep.station_id)?.nom ?? "Station";

  return (
    <div className="flex items-center justify-between py-4 px-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-4">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cat.color}`}>
          <i className={`${cat.icon} text-sm`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {dep.categorie === "autre" ? dep.description : cat.label}
          </p>
          <p className="text-xs text-slate-400">
            {source} — {new Date(dep.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {dep.recu_image_url && (
          <a href={dep.recu_image_url} target="_blank" rel="noopener noreferrer"
            className="text-slate-400 hover:text-[#d27045] p-1" title="Voir reçu">
            <i className="fa-solid fa-image text-sm" />
          </a>
        )}
        <span className="text-sm font-bold text-red-600">
          -{Number(dep.montant).toLocaleString("fr-FR")} FCFA
        </span>
      </div>
    </div>
  );
};

export default function Depenses() {
  const [depenses, setDepenses] = useState([]);
  const [banques, setBanques] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("tous");

  const fetchAll = useCallback(async () => {
    const [{ data: depData }, { data: bData }, { data: sData }] = await Promise.all([
      supabase.from("depenses").select("*").order("created_at", { ascending: false }),
      supabase.from("banques").select("id, nom"),
      supabase.from("stations").select("id, nom"),
    ]);
    setDepenses(depData ?? []);
    setBanques(bData ?? []);
    setStations(sData ?? []);
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

  const totalMois = depenses
    .filter((d) => {
      const now = new Date();
      const dd = new Date(d.created_at);
      return dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear();
    })
    .reduce((acc, d) => acc + Number(d.montant), 0);

  const filtered = filterCat === "tous" ? depenses : depenses.filter((d) => d.categorie === filterCat);

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dépenses</h2>
          <p className="text-sm text-slate-500">
            Ce mois :{" "}
            <span className="font-medium text-red-500">
              {totalMois.toLocaleString("fr-FR")} FCFA
            </span>
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-lg hover:bg-[#b85b34] transition shadow-sm"
        >
          <i className="fa-solid fa-plus" />
          Nouvelle Dépense
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("tous")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
            filterCat === "tous" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Tous
        </button>
        {Object.entries(CATEGORIE_LABELS).map(([key, val]) => (
          <button key={key}
            onClick={() => setFilterCat(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
              filterCat === key ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm">Aucune dépense.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((d) => (
            <DepenseRow key={d.id} dep={d} banques={banques} stations={stations} />
          ))}
        </div>
      )}

      <DepenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchAll}
      />
    </div>
  );
}