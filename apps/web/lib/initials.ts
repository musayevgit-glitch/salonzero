/**
 * Reusable avatar-initials helper.
 * "Rəşad Babayev" -> "RB", "Luna" -> "L", "" -> "?"
 * Uses the first letter of the first and last name parts so multi-part names
 * ("Anna Maria Quliyeva") still read as "AQ" rather than "AM".
 */
export function getInitials(fullName: string | null | undefined, max = 2): string {
  if (!fullName) return '?';
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1 || max === 1) {
    return (parts[0]!.charAt(0) || '?').toLocaleUpperCase();
  }
  const first = parts[0]!.charAt(0);
  const last = parts[parts.length - 1]!.charAt(0);
  return `${first}${last}`.toLocaleUpperCase();
}
