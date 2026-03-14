// utils/facturePeriods.js

// Given a date string, returns the period it belongs to
export function getPeriodForDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let start, end;
  if (day <= 10) {
    start = new Date(year, month, 1);
    end = new Date(year, month, 10);
  } else if (day <= 20) {
    start = new Date(year, month, 11);
    end = new Date(year, month, 20);
  } else {
    start = new Date(year, month, 21);
    end = new Date(year, month + 1, 0); // last day of month
  }

  return {
    debut: start.toISOString().split('T')[0],
    fin: end.toISOString().split('T')[0],
  };
}

// A period is closed once today is strictly after its end date
export function isPeriodClosed(periodFin) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > new Date(periodFin);
}

// Group livraisons by period, return array of { debut, fin, livraisons[] }
export function groupLivraisonsByPeriod(livraisons) {
  const map = {};
  for (const liv of livraisons) {
    const { debut, fin } = getPeriodForDate(liv.date_livraison);
    const key = `${debut}__${fin}`;
    if (!map[key]) map[key] = { debut, fin, livraisons: [] };
    map[key].livraisons.push(liv);
  }
  // Sort periods newest first
  return Object.values(map).sort((a, b) => b.debut.localeCompare(a.debut));
}

// Compute total amount for a set of livraisons
export function computeMontant(livraisons) {
  return livraisons.reduce((acc, l) => acc + Number(l.litre) * Number(l.prix), 0);
}

// A facture should be hidden if it's paid AND older than 1 month
export function shouldHideFacture(facture) {
  if (facture.statut !== 'payee') return false;
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return new Date(facture.date_paiement) < oneMonthAgo;
}

// PDF export — opens a print window
export function exportFacturePDF(facture, livraisons, reservations) {
  const rows = livraisons.map((l) => {
    const res = reservations.find((r) => r.id === l.reservation_id);
    const total = (Number(l.litre) * Number(l.prix)).toLocaleString('fr-FR');
    return `
      <tr>
        <td>${l.numero_bon}</td>
        <td>${new Date(l.date_livraison).toLocaleDateString('fr-FR')}</td>
        <td>${res?.numero_reservation ?? '—'}</td>
        <td>${l.type}</td>
        <td style="text-align:right">${Number(l.litre).toLocaleString('fr-FR')}</td>
        <td style="text-align:right">${Number(l.prix).toLocaleString('fr-FR')}</td>
        <td style="text-align:right">${total}</td>
      </tr>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Facture ${facture.periode_debut} — ${facture.periode_fin}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { font-size: 13px; color: #64748b; margin: 0 0 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
        tfoot td { font-weight: bold; border-top: 2px solid #e2e8f0; }
        .badge { background: #fff7ed; color: #c2410c; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
      </style>
    </head>
    <body>
      <h1>BM Trading — Facture Sonidep</h1>
      <p>
        Période : ${new Date(facture.periode_debut).toLocaleDateString('fr-FR')} 
        au ${new Date(facture.periode_fin).toLocaleDateString('fr-FR')}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        Statut : <span class="badge">${facture.statut === 'payee' ? 'Payée' : 'En attente'}</span>
      </p>
      <table>
        <thead>
          <tr>
            <th>N° Bon</th><th>Date</th><th>Réservation</th><th>Type</th>
            <th style="text-align:right">Litres</th>
            <th style="text-align:right">Prix/L</th>
            <th style="text-align:right">Total (FCFA)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="6">Total général</td>
            <td style="text-align:right">${facture.montant_total.toLocaleString('fr-FR')} FCFA</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}