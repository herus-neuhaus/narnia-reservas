import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatToBrlDateTime(dateStr: string | null) {
  if (!dateStr) return '';
  try {
    const cleanStr = dateStr.replace('T', ' ');
    const parts = cleanStr.split(' ');
    if (parts.length >= 2) {
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');
      if (dateParts.length === 3 && timeParts.length >= 2) {
        return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${timeParts[0]}:${timeParts[1]}`;
      }
    }
    const dateParts = dateStr.split('-');
    if (dateParts.length === 3) {
      return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
