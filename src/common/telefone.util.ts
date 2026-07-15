// Normaliza telefones para E.164 (+<indicativo><numero>, sem espacos).
// Regras: "+..." mantem; "00..." vira "+..."; "244..." vira "+244...";
// 9 digitos comecados por 9 assumem Angola (+244).
export function normalizarTelefone(raw: string): string {
  const cleaned = String(raw || '').replace(/[^0-9+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return '+' + cleaned.slice(1).replace(/\D/g, '');
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  if (cleaned.startsWith('244') && cleaned.length === 12) return '+' + cleaned;
  if (/^9\d{8}$/.test(cleaned)) return '+244' + cleaned;
  return cleaned; // formato desconhecido: devolve limpo (sem inventar)
}
