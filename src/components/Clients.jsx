"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ClientModal from "./ClientModal";
import AddDetteModal from "./AddDetteModal";
import PayerDetteModal from "./PayerDetteModal";

// ── Client Row ────────────────────────────────────────────────────────────────
const ClientRow = ({ client, onEdit, onDelete, onAddDette, onPayer }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition gap-4">
    
    {/* Left: identity */}
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-[#d27045]">
          {client.nom.charAt(0).toUpperCase()}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{client.nom}</p>
        {client.numero ? (
          <p className="text-xs text-slate-400">
            <i className="fa-solid fa-phone mr-1" />{client.numero}
          </p>
        ) : (
          <p className="text-xs text-slate-300">Pas de numéro</p>
        )}
      </div>
    </div>

    {/* Right: dette + actions */}
    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
      {/* Dette badge */}
      <div className="text-left sm:text-right pr-4 sm:pr-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Dette</p>
        <p className={`text-sm font-bold ${Number(client.dette) > 0 ? "text-red-600" : "text-green-600"}`}>
          {Number(client.dette).toLocaleString("fr-FR")} FCFA
        </p>
      </div>

      <div className="flex gap-2">
        {/* Add dette button */}
        <button
          onClick={() => onAddDette(client)}
          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition"
          title="Ajouter une dette"
        >
          <i className="fa-solid fa-plus mr-1" />
          Dette
        </button>

        {/* Pay dette button (Disabled) */}
        <button
          onClick={() => onPayer(client)}
          disabled={Number(client.dette) === 0}
          className={`px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 border border-green-200 rounded-lg transition ${
            Number(client.dette) === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-green-100"
          }`}
        >
          <i className="fa-solid fa-hand-holding-dollar mr-1" />
          Payer
        </button>

      </div>

      {/* Edit / Delete */}
      <div className="flex gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l sm:pl-3 border-slate-100 sm:border-slate-200 w-full sm:w-auto justify-end">
        <button
          onClick={() => onEdit(client)}
          className="p-2 text-slate-400 hover:text-blue-600 transition"
          title="Modifier"
        >
          <i className="fa-solid fa-pen text-sm" />
        </button>
        <button
          onClick={() => onDelete(client.id)}
          className="p-2 text-slate-400 hover:text-red-600 transition"
          title="Supprimer"
        >
          <i className="fa-solid fa-trash text-sm" />
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payerClient, setPayerClient] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [detteClient, setDetteClient] = useState(null);

  const [verifyingAction, setVerifyingAction] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    let isMounted = true;
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (isMounted) {
        if (!error) setClients(data ?? []);
        setLoading(false);
      }
    };
    fetchClients();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  const confirmAction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: adminPassword,
    });
    if (error) { alert("Mot de passe incorrect."); return; }

    const { type, id, data } = verifyingAction;

    if (type === "delete") {
      await supabase.from("clients").delete().eq("id", id);
      refreshData();
    } else if (type === "edit") {
      setEditingClient(data);
      setIsClientModalOpen(true);
    }

    setVerifyingAction(null);
    setAdminPassword("");
  };

  const filtered = clients.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.numero ?? "").includes(search)
  );

  const totalDette = clients.reduce((acc, c) => acc + Number(c.dette), 0);

  return (
    <div className="w-full space-y-6 px-1 sm:px-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Clients</h2>
          <p className="text-sm text-slate-500">
            {clients.length} client(s) —{" "}
            <span className="text-red-500 font-medium">
              {totalDette.toLocaleString("fr-FR")} FCFA
            </span>
          </p>
        </div>
        <button
          onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d27045] text-white text-sm font-medium rounded-lg hover:bg-[#b85b34] transition shadow-sm w-full sm:w-auto"
        >
          <i className="fa-solid fa-plus" />
          Nouveau Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d27045] bg-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-slate-400">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm">
            {search ? "Aucun client trouvé." : "Aucun client pour le moment."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              onEdit={(data) => setVerifyingAction({ type: "edit", id: data.id, data })}
              onDelete={(id) => setVerifyingAction({ type: "delete", id })}
              onAddDette={(c) => setDetteClient(c)}
              onPayer={(c) => setPayerClient(c)} 
            />
          ))}
        </div>
      )}

      {/* Password Modal */}
      {verifyingAction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 text-center sm:text-left">Confirmation Requise</h3>
            <p className="text-sm text-slate-500 mb-4 text-center sm:text-left">
              Entrez votre mot de passe pour {verifyingAction.type === "delete" ? "supprimer" : "modifier"} ce client.
            </p>
            <input
              type="password" autoFocus
              className="w-full border rounded-lg p-3 mb-4 outline-none focus:ring-2 focus:ring-[#d27045]"
              placeholder="Mot de passe"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAction()}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3">
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

      <ClientModal
        key={editingClient?.id ?? "new-client"}
        isOpen={isClientModalOpen}
        onClose={() => { setIsClientModalOpen(false); setEditingClient(null); }}
        onSaved={refreshData}
        editData={editingClient}
      />

      {detteClient && (
        <AddDetteModal
          key={detteClient.id}
          isOpen={!!detteClient}
          client={detteClient}
          onClose={() => setDetteClient(null)}
          onSaved={refreshData}
        />
      )}

      {payerClient && (
        <PayerDetteModal
          key={payerClient.id}
          isOpen={!!payerClient}
          client={payerClient}
          onClose={() => setPayerClient(null)}
          onSaved={refreshData}
        />
      )}
    </div>
  )
}