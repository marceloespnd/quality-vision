/** Presentation only: never use display rounding to calculate persisted amounts. */
export const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
