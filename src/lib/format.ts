export function formatKoreanDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}
