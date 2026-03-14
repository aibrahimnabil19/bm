"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import BankModal from "./BankModal";
import AjouterArgentModal from "./AjouterArgentModal";
import RetirerArgentModal from "./RetirerArgentModal";

// ── Bank Card ─────────────────────────────────────────────────────────────────
const BankCard = ({ banque, onEdit, onDelete, onAjouter, onRetirer, onStatement }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-bank text-blue-600 text-sm" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">{banque.nom}</h3>
          <p className="text-xs text-slate-400">Compte actif</p>
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={() => onEdit(banque)} className="p-2 text-slate-400 hover:text-blue-600 transition">
          <i className="fa-solid fa-pen text-sm" />
        </button>
        <button onClick={() => onDelete(banque.id)} className="p-2 text-slate-400 hover:text-red-600 transition">
          <i className="fa-solid fa-trash text-sm" />
        </button>
      </div>
    </div>

    {/* Solde */}
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Solde</p>
      <p className="text-xl sm:text-2xl font-bold text-slate-800 wrap-break-word">
        {Number(banque.solde).toLocaleString("fr-FR")}
        <span className="text-sm font-normal text-slate-500 ml-1">FCFA</span>
      </p>
    </div>

    {/* Actions */}
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onAjouter(banque)}
        className="flex items-center justify-center gap-2 py-2.5 sm:py-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition"
      >
        <i className="fa-solid fa-arrow-down" />
        Ajouter
      </button>
      <button
        onClick={() => onRetirer(banque)}
        className="flex items-center justify-center gap-2 py-2.5 sm:py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition"
      >
        <i className="fa-solid fa-arrow-up" />
        Retirer
      </button>
    </div>
    <button
      onClick={() => onStatement(banque)}
      className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
    >
      <i className="fa-solid fa-file-lines" />
      Relevé bancaire
    </button>
  </div>
);

// ── PDF utilities ─────────────────────────────────────────────────────────────

function printTransactionReceipt(tx, banques) {
  const banque = banques.find((b) => b.id === tx.banque_id);
  const isEntree = tx.direction === "entree";
  const labelMap = {
    depot_station: "Dépôt depuis station",
    depot_direct: "Dépôt direct",
    paiement_sonidep: "Paiement Sonidep",
    paiement_facture: "Paiement facture",
    autre: "Autre",
  };

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Reçu transaction</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 500px; margin: auto; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .sub { font-size: 12px; color: #64748b; margin-bottom: 24px; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
      .label { color: #64748b; }
      .amount { font-size: 22px; font-weight: bold; color: ${isEntree ? "#16a34a" : "#dc2626"}; margin: 20px 0; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; background: ${isEntree ? "#dcfce7" : "#fee2e2"}; color: ${isEntree ? "#16a34a" : "#dc2626"}; }
    </style></head><body>
    <h1>BM Trading — Reçu de Transaction</h1>
    <p class="sub">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
    <div class="row"><span class="label">Banque</span><span>${banque?.nom ?? "—"}</span></div>
    <div class="row"><span class="label">Type</span><span>${labelMap[tx.sous_type] ?? tx.sous_type}</span></div>
    <div class="row"><span class="label">Direction</span><span><span class="badge">${isEntree ? "Entrée" : "Sortie"}</span></span></div>
    <div class="row"><span class="label">Date</span><span>${new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
    ${tx.reference ? `<div class="row"><span class="label">N° Réf.</span><span>${tx.reference}</span></div>` : ""}
    ${tx.description ? `<div class="row"><span class="label">Description</span><span>${tx.description}</span></div>` : ""}
    <div class="amount">${isEntree ? "+" : "-"}${Number(tx.montant).toLocaleString("fr-FR")} FCFA</div>
    ${tx.recu_image_url ? `<p style="font-size:12px;color:#64748b;">Reçu joint : <a href="${tx.recu_image_url}" target="_blank">Voir l'image</a></p>` : ""}
    </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.print();
}

function printBankStatement(banque, transactions, dateFrom, dateTo) {
  const filtered = transactions
    .filter((tx) => tx.banque_id === banque.id)
    .filter((tx) => {
      const d = new Date(tx.created_at);
      return d >= new Date(dateFrom) && d <= new Date(dateTo + "T23:59:59");
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const labelMap = {
    depot_station: "Dépôt depuis station",
    depot_direct: "Dépôt direct",
    paiement_sonidep: "Paiement Sonidep",
    paiement_facture: "Paiement facture",
    autre: "Autre",
  };

  const totalEntrees = filtered.filter((t) => t.direction === "entree").reduce((a, t) => a + Number(t.montant), 0);
  const totalSorties = filtered.filter((t) => t.direction === "sortie").reduce((a, t) => a + Number(t.montant), 0);

  const rows = filtered.map((tx) => `
    <tr>
      <td>${new Date(tx.created_at).toLocaleDateString("fr-FR")}</td>
      <td>${labelMap[tx.sous_type] ?? tx.sous_type}${tx.description ? ` — ${tx.description}` : ""}</td>
      <td style="text-align:right;color:#16a34a">${tx.direction === "entree" ? `+${Number(tx.montant).toLocaleString("fr-FR")}` : ""}</td>
      <td style="text-align:right;color:#dc2626">${tx.direction === "sortie" ? `-${Number(tx.montant).toLocaleString("fr-FR")}` : ""}</td>
    </tr>`).join("");

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Relevé ${banque.nom}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .sub { font-size: 12px; color: #64748b; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f1f5f9; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; text-align: left; }
      td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
      .summary { display: flex; gap: 32px; margin-bottom: 24px; }
      .summary-item { padding: 12px 20px; border-radius: 8px; }
      tfoot td { font-weight: bold; border-top: 2px solid #e2e8f0; }
    </style></head><body>
    <h1>BM Trading — Relevé Bancaire</h1>
    <p class="sub">${banque.nom} &nbsp;|&nbsp; Du ${new Date(dateFrom).toLocaleDateString("fr-FR")} au ${new Date(dateTo).toLocaleDateString("fr-FR")}</p>
    <div class="summary">
      <div class="summary-item" style="background:#dcfce7"><div style="font-size:11px;color:#16a34a;font-weight:bold;text-transform:uppercase">Total Entrées</div><div style="font-size:20px;font-weight:bold;color:#16a34a">+${totalEntrees.toLocaleString("fr-FR")} FCFA</div></div>
      <div class="summary-item" style="background:#fee2e2"><div style="font-size:11px;color:#dc2626;font-weight:bold;text-transform:uppercase">Total Sorties</div><div style="font-size:20px;font-weight:bold;color:#dc2626">-${totalSorties.toLocaleString("fr-FR")} FCFA</div></div>
      <div class="summary-item" style="background:#f1f5f9"><div style="font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase">Solde actuel</div><div style="font-size:20px;font-weight:bold;color:#1e293b">${Number(banque.solde).toLocaleString("fr-FR")} FCFA</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th style="text-align:right">Entrée (FCFA)</th><th style="text-align:right">Sortie (FCFA)</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">Aucune transaction sur cette période</td></tr>'}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td style="text-align:right;color:#16a34a">+${totalEntrees.toLocaleString("fr-FR")}</td><td style="text-align:right;color:#dc2626">-${totalSorties.toLocaleString("fr-FR")}</td></tr></tfoot>
    </table>
    </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.print();
}

// ── Transaction Row (history) ─────────────────────────────────────────────────
const TransactionRow = ({ tx, banques }) => {
  const isEntree = tx.direction === "entree";
  const labelMap = {
    depot_station: "Dépôt depuis station",
    depot_direct: "Dépôt direct",
    paiement_sonidep: "Paiement Sonidep",
    paiement_facture: "Paiement facture",
    autre: "Autre",
  };
  const banque = banques.find((b) => b.id === tx.banque_id);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 bg-white rounded-lg border border-slate-100 hover:bg-slate-50 transition gap-2">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isEntree ? "bg-green-100" : "bg-red-100"
        }`}>
          <i className={`fa-solid ${isEntree ? "fa-arrow-down text-green-600" : "fa-arrow-up text-red-600"} text-xs`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{labelMap[tx.sous_type]}</p>
          <p className="text-[11px] text-slate-400">
            {banque?.nom} — {new Date(tx.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
        <div className="flex items-center gap-2">
          {tx.description && <span className="text-[10px] text-slate-300 italic hidden sm:inline">{tx.description}</span>}
          {tx.recu_image_url && (
            <a href={tx.recu_image_url} target="_blank" rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#d27045] transition p-1" title="Voir reçu">
              <i className="fa-solid fa-image text-sm" />
            </a>
          )}
          {/* ← ADD THIS */}
          <button
            onClick={() => printTransactionReceipt(tx, banques)}
            className="text-slate-400 hover:text-[#d27045] transition p-1"
            title="Imprimer le reçu"
          >
            <i className="fa-solid fa-print text-sm" />
          </button>
        </div>
        <span className={`text-sm font-bold ${isEntree ? "text-green-600" : "text-red-600"}`}>
          {isEntree ? "+" : "-"}{Number(tx.montant).toLocaleString("fr-FR")} F
        </span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Bank() {
  const [banques, setBanques] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Refresh Trigger logic
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [ajouterBank, setAjouterBank] = useState(null);
  const [retirerBank, setRetirerBank] = useState(null);

  const [statementModal, setStatementModal] = useState(null); // holds the banque object
  const [stmtFrom, setStmtFrom] = useState("");
  const [stmtTo, setStmtTo] = useState("");

  const [verifyingAction, setVerifyingAction] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");

  // 2. Data fetching inside useEffect
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const [{ data: bankData }, { data: txData }] = await Promise.all([
        supabase.from("banques").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions_banque").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      
      if (isMounted) {
        setBanques(bankData ?? []);
        setTransactions(txData ?? []);
        setLoading(false);
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  const confirmAction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: adminPassword });
    if (error) { alert("Mot de passe incorrect."); return; }

    const { type, id, data } = verifyingAction;
    if (type === "delete") {
      await supabase.from("banques").delete().eq("id", id);
      refreshData();
    } else if (type === "edit") {
      setEditingBank(data);
      setIsBankModalOpen(true);
    }

    setVerifyingAction(null);
    setAdminPassword("");
  };

  const totalSolde = banques.reduce((acc, b) => acc + Number(b.solde), 0);

  return (
    <div className="w-full space-y-8 px-1 sm:px-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Banque</h2>
          <p className="text-sm text-slate-500">
            {banques.length} compte(s) —{" "}
            <span className="font-medium text-slate-700">
              {totalSolde.toLocaleString("fr-FR")} FCFA total
            </span>
          </p>
        </div>
        <button
          onClick={() => { setEditingBank(null); setIsBankModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#d27045] text-white text-sm font-medium rounded-lg hover:bg-[#b85b34] transition shadow-sm w-full sm:w-auto"
        >
          <i className="fa-solid fa-plus" />
          Nouvelle Banque
        </button>
      </div>

      {/* Bank Cards Grid */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Chargement...</p>
      ) : banques.length === 0 ? (
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm">Aucun compte bancaire pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banques.map((b) => (
            <BankCard
              key={b.id}
              banque={b}
              onEdit={(data) => setVerifyingAction({ type: "edit", id: data.id, data })}
              onDelete={(id) => setVerifyingAction({ type: "delete", id })}
              onAjouter={(b) => setAjouterBank(b)}
              onRetirer={(b) => setRetirerBank(b)}
              onStatement={(b) => { setStatementModal(b); setStmtFrom(""); setStmtTo(""); }}
            />
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Transactions récentes
          </h3>
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} banques={banques} />
            ))}
          </div>
        </div>
      )}

      {/* Password Modal */}
      {verifyingAction && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmation Requise</h3>
            <p className="text-sm text-slate-500 mb-4">
              Entrez votre mot de passe pour {verifyingAction.type === "delete" ? "supprimer" : "modifier"} cette banque.
            </p>
            <input type="password" autoFocus
              className="w-full border rounded-lg p-3 mb-4 outline-none focus:ring-2 focus:ring-[#d27045] text-base"
              placeholder="Mot de passe" value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAction()}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={() => { setVerifyingAction(null); setAdminPassword(""); }}
                className="flex-1 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={confirmAction}
                className="flex-1 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-black">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BankModal
        key={editingBank?.id ?? "new-bank"}
        isOpen={isBankModalOpen}
        onClose={() => { setIsBankModalOpen(false); setEditingBank(null); }}
        onSaved={refreshData}
        editData={editingBank}
      />

      {ajouterBank && (
        <AjouterArgentModal
          key={`ajouter-${ajouterBank.id}`}
          isOpen={!!ajouterBank}
          banque={ajouterBank}
          onClose={() => setAjouterBank(null)}
          onSaved={refreshData}
        />
      )}

      {retirerBank && (
        <RetirerArgentModal
          key={`retirer-${retirerBank.id}`}
          isOpen={!!retirerBank}
          banque={retirerBank}
          onClose={() => setRetirerBank(null)}
          onSaved={refreshData}
        />
      )}

      {statementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Relevé bancaire</h2>
                <p className="text-xs text-slate-500">{statementModal.nom}</p>
              </div>
              <button onClick={() => setStatementModal(null)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Du</label>
                <input type="date" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Au</label>
                <input type="date" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-[#d27045] outline-none bg-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => setStatementModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition">
                  Annuler
                </button>
                <button
                  disabled={!stmtFrom || !stmtTo}
                  onClick={() => { printBankStatement(statementModal, transactions, stmtFrom, stmtTo); setStatementModal(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#d27045] hover:bg-[#b85b34] rounded-md transition disabled:opacity-60 flex items-center gap-2"
                >
                  <i className="fa-solid fa-print" />
                  Générer PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    
  );
}