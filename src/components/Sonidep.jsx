"use client";

import React, { useState } from "react";
import ReserveModal from "./ReserveModal"; // <-- Adjust the path if necessary based on your structure

const MetricCard = ({ title, a, b }) => (
  <div 
    style={{ backgroundColor: '#d27045' }}
    className="flex-1 min-w-32.5 rounded-xl border border-white/20 shadow-sm p-4 flex flex-col justify-between aspect-square"
  >
    <div className="text-sm font-medium text-white/90 truncate">{title}</div>
    <div className="flex flex-col">
      <div className="text-2xl md:text-3xl font-bold text-white">{a}</div>
      <div className="text-[10px] md:text-xs font-medium text-white/70 uppercase tracking-wider">
        {b}
      </div>
    </div>
  </div>
);
export default function Sonidep() {
  const metrics = [
    { title: "Entrées", a: 124, b: "ce mois" },
    { title: "Sorties", a: 98, b: "ce mois" },
    { title: "Stock total", a: 5200, b: "unités" },
    { title: "Articles endom.", a: 7, b: "ce mois" },
  ];

  const tabs = ["Reserve", "Livraison", "Facture"];
  
  // State for tabs and modal
  const [activeTab, setActiveTab] = useState("Reserve"); // I set this to Reserve by default so you can test it immediately
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);

  return (
    <div className="w-full space-y-10 relative">
      
      {/* Container for the metrics */}
      <div className="flex flex-row flex-nowrap gap-4 w-full overflow-x-auto pb-2 scrollbar-hide">
        {metrics.map((m) => (
          <MetricCard key={m.title} title={m.title} a={m.a} b={m.b} />
        ))}
      </div>

      {/* Gestion Sonidep Container */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Gestion Sonidep</h3>
            <p className="text-xs text-slate-500">Flux de travail centralisé</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex p-2 gap-1 bg-slate-100/50">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === t
                  ? "bg-white text-[#d27045] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Dynamic Content Area */}
        <div className="p-6 min-h-75">
          {activeTab === "Reserve" && (
             <div className="animate-in fade-in duration-300 flex flex-col items-start">
               <div className="w-full flex justify-between items-center mb-6">
                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">État de la Réserve</h4>
                 
                 {/* The Trigger Button for the Modal */}
                 <button 
                   onClick={() => setIsReserveModalOpen(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-[#d27045] text-white text-sm font-medium rounded-md hover:bg-[#b85b34] transition shadow-sm"
                 >
                   <i className="fa-solid fa-plus"></i>
                   Nouvelle Réservation
                 </button>
               </div>

             </div>
          )}

          {activeTab === "Livraison" && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Module de Livraison</h4>
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-100 rounded-xl">
                 <p className="text-slate-400 text-sm">Prêt pour l&apos;implémentation de la table de livraison...</p>
              </div>
            </div>
          )}

          {activeTab === "Facture" && (
            <div className="animate-in fade-in duration-300">
               <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Facturation</h4>
               <p className="text-slate-600">Historique et génération des factures.</p>
            </div>
          )}
        </div>
      </section>

      {/* The Modal Component */}
      <ReserveModal 
        isOpen={isReserveModalOpen} 
        onClose={() => setIsReserveModalOpen(false)} 
      />
    </div>
  );
}