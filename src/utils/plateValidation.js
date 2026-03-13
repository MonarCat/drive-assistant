// Kenyan number plate formats:
// Private:    KXX 000X  (3 letters, space, 3 digits, 1 letter)  e.g. KCA 123A
// Government: GK 000X   (2 letters, space, 3 digits, 1 letter)
// Government: GK 0000X  (2 letters, space, 4 digits, 1 letter)
// We validate both private (3-letter prefix) and government (2-letter prefix) formats.

const PRIVATE_RE = /^[A-Z]{2,3}\s?\d{3,4}[A-Z]$/i

export const PLATE_HINT = 'e.g. KCA 123A'

/**
 * Returns an error string if the plate is invalid, or null if valid.
 */
export function validatePlate(plate) {
  if (!plate || !plate.trim()) return 'Number plate is required'
  const cleaned = plate.trim().replace(/\s+/g, ' ')
  if (!PRIVATE_RE.test(cleaned.replace(/\s/g, ''))) {
    return 'Invalid plate – expected format like KCA 123A'
  }
  return null
}

/**
 * Normalises the plate to uppercase with a single space between letters and digits.
 * e.g. 'kca123a' → 'KCA 123A'
 */
export function formatPlate(plate) {
  if (!plate) return ''
  const up = plate.toUpperCase().replace(/\s+/g, '')
  // KCA123A → KCA 123A  (3 letters + 3 digits + 1 letter)
  const m3 = up.match(/^([A-Z]{3})(\d{3}[A-Z])$/)
  if (m3) return `${m3[1]} ${m3[2]}`
  // GK1234A → GK 1234A  (2 letters + 3-4 digits + 1 letter, e.g. govt plates)
  const m2 = up.match(/^([A-Z]{2})(\d{3,4}[A-Z])$/)
  if (m2) return `${m2[1]} ${m2[2]}`
  return up
}
