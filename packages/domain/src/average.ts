/**
 * Ortalama = sayı ÷ isteka. 3 ondalık gösterilir, 4. haneye göre (yarım yukarı) yuvarlanır.
 * Kayan nokta hatalarını önlemek için tam sayı aritmetiği kullanılır.
 */
export function computeAverage(score: number, innings: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(innings) || innings <= 0 || score < 0) return null;
  // score/innings'i 1000 ile ölçekle, 4. haneye bakarak yuvarla: floor((score*10000/innings + 5) / 10)
  const scaled = Math.floor((score * 10000) / innings);
  const rounded = Math.floor((scaled + 5) / 10);
  return rounded / 1000;
}

export function formatAverage(avg: number | null | undefined): string {
  if (avg === null || avg === undefined) return '—';
  return avg.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function winRate(wins: number, matches: number): number {
  if (matches <= 0) return 0;
  return Math.round((wins / matches) * 100);
}
