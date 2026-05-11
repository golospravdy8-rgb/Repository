/**
 * Game Time Utilities
 *
 * Basketball clock counts DOWN from 600s (10:00) to 0.
 * Time on court = time when player entered - current clock
 * Example: entered at 480s, current 240s → played 240s
 */

/**
 * Calculate time on court for a player
 * Basketball timer counts DOWN, so earlier enteredAt values are LARGER
 * @param enteredAt - Clock time when player entered (e.g., 580)
 * @param currentClock - Current game clock (e.g., 400)
 * @returns Time played in seconds
 */
export function calculateTimeOnCourt(enteredAt: number, currentClock: number): number {
  if (!enteredAt || enteredAt === 0) return 0;
  return Math.max(0, enteredAt - currentClock);
}

/**
 * Format game clock to MM:SS format
 * @param seconds - Total seconds remaining (0-600 for a quarter)
 * @returns Formatted string (e.g., "10:00", "5:30", "0:15")
 */
export function formatGameClock(seconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format minutes played from seconds
 * @param seconds - Total seconds played
 * @returns Formatted string (e.g., "2:34" for 2 minutes 34 seconds)
 */
export function formatMinutesPlayed(seconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get minutes value for box score display
 * @param totalSeconds - Total seconds played
 * @returns String like "5:30" or "-" if zero
 */
export function getDisplayMinutes(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds === 0) return "-";
  return formatMinutesPlayed(totalSeconds);
}

/**
 * Validate game clock value
 * @param seconds - Clock time in seconds
 * @returns true if valid (0-600)
 */
export function isValidGameClock(seconds: number): boolean {
  return seconds >= 0 && seconds <= 600;
}
