export function formatKoreanDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatDistanceKm(km: number) {
  return `${km.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}km`;
}
