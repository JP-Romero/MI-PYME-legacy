/**
 * MI PYME — Multimoneda y Pagos Mixtos (Córdobas C$ / Dólares USD)
 * Toda la base de datos almacena precios en Córdobas (moneda local).
 * La conversión a USD usa la tasa configurable del negocio.
 */
import type { PaymentLine } from './types';

export const DEFAULT_RATE = 36.8; // C$ por US$1

/** Córdobas -> Dólares */
export const nioToUsd = (nio: number, rate: number = DEFAULT_RATE): number =>
  round2(nio / rate);

/** Dólares -> Córdobas */
export const usdToNio = (usd: number, rate: number = DEFAULT_RATE): number =>
  round2(usd * rate);

/** Convierte una línea de pago a Córdobas para sumar contra el total */
export const lineToNio = (p: PaymentLine, rate: number): number =>
  p.currency === 'USD' ? usdToNio(p.amount, rate) : p.amount;

/** Suma total pagado (en C$) de varias líneas de pago mixto */
export const paidTotalNio = (lines: PaymentLine[], rate: number): number =>
  round2(lines.reduce((s, p) => s + lineToNio(p, rate), 0));

/** Vuelto/cambio en Córdobas (nunca negativo) */
export const changeNio = (totalNio: number, lines: PaymentLine[], rate: number): number =>
  Math.max(0, round2(paidTotalNio(lines, rate) - totalNio));

/** Formatea C$: "C$1,250.00" */
export const fmtNio = (n: number): string =>
  `C$${n.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Formatea US$: "$ 34.00" */
export const fmtUsd = (n: number): string =>
  `$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
