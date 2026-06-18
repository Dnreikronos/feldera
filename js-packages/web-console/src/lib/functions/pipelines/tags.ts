/**
 * Pipeline tag colors.
 *
 * The backend stores a tag as an opaque string and knows nothing about color, so
 * a tag's color is encoded into the string itself: the color is the tag's length
 * modulo the palette size, and a color is selected by padding the tag with
 * trailing spaces until its length lands on the desired palette entry. The
 * padding is invisible in the UI (it is stripped for display and editing) but
 * persists through the server, so the chosen color survives round-trips.
 *
 * A consequence is that two tags with the same visible text but different padding
 * ("foo" vs "foo " ) are genuinely different tags with different colors; the UI
 * keeps them distinct rather than collapsing them.
 */

/** The fixed palette of tag label colors (see design). */
export const tagColorPalette = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Dark blue', color: '#1d4ed8' }
] as const

export type TagColor = (typeof tagColorPalette)[number]

/** Index into {@link tagColorPalette} that a tag's length selects. */
export const tagColorIndexOf = (tag: string): number => tag.length % tagColorPalette.length

/** Map a tag to its palette entry, derived from the tag's length. */
export const tagColorOf = (tag: string): TagColor => tagColorPalette[tagColorIndexOf(tag)]

/**
 * The visible text of a tag, with the trailing-space padding that encodes its
 * color removed. Used everywhere a tag is shown or edited.
 */
export const tagDisplayName = (tag: string): string => tag.replace(/ +$/, '')

/**
 * Encode `colorIndex` into a tag by padding its visible text with trailing spaces
 * until the total length selects that palette entry. Existing trailing padding is
 * discarded first so re-coloring is idempotent.
 */
export const tagWithColor = (tag: string, colorIndex: number): string => {
  const base = tagDisplayName(tag)
  const paletteSize = tagColorPalette.length
  const padding =
    ((colorIndex % paletteSize) - (base.length % paletteSize) + paletteSize) % paletteSize
  return base.padEnd(base.length + padding)
}
