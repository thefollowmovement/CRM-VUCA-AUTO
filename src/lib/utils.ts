import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind sans doublons contradictoires. */
export function cn(...entrees: ClassValue[]) {
  return twMerge(clsx(entrees));
}
