/**
 * Export data to CSV file with UTF-8 BOM (Excel compatible)
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} data
 * @param {string} filename
 */
export function exportCSV(columns, data, filename = 'export') {
  const BOM = '\uFEFF';
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number') return val;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = BOM + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

/**
 * Print HTML content in a new window
 */
export function printHTML(html, title = 'In') {
  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 13px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    h2 { margin: 0 0 10px; font-size: 18px; }
    .info { margin-bottom: 15px; line-height: 1.6; }
    .total-row { font-weight: bold; font-size: 14px; }
    @media print { body { padding: 0; } }
  </style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
