type CsvValue = string | number | boolean | null | undefined;
export function exportToCsvFile(rows: Array<Record<string, CsvValue>>, filename: string) {
  if (!rows || !rows.length) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const header = Object.keys(rows[0]);
  const csv = [header.join(',')]
    .concat(rows.map(row => header.map(field => {
      const value = row[field] == null ? '' : String(row[field]);
      // Escape double quotes
      const escaped = value.replace(/"/g, '""');
      // If value contains comma, newline or double quote, wrap in double quotes
      if (escaped.search(/[,"\n]/) >= 0) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(',')));

  const csvBlob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(csvBlob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
