/**
 * Converts an ISO string / Date into a MySQL DATETIME literal ("YYYY-MM-DD HH:MM:SS").
 *
 * The literal is written in the server's LOCAL time zone on purpose: mysql2 reads
 * DATETIME values back as local time (its default `timezone: 'local'`), so writing
 * local time keeps a save -> load round trip stable.
 *
 * The previous implementation wrote UTC (`toISOString()`), which was read back as
 * local time and shifted every timestamp by the UTC offset (+3h in UTC-3) on each save.
 */
export function toDbDate(val: unknown): string | null {
  if (!val) return null;
  const d = new Date(val as string | number | Date);
  if (isNaN(d.getTime())) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
