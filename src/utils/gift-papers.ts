// Wrapping papers (identity board): one cream motif from public/papers/ on one palette colour.
// Single source for the base-layout pattern sprite and for public/gift-papers.js, which reads the
// motif and colour names off that sprite. The [data-paper] / [data-paper-color] rules in base.css
// must list the same names and tile sizes.

export interface PaperMotif {
  name: string
  // Tile size of public/papers/<name>.svg, in px
  size: number
}

export const PAPER_MOTIFS: readonly PaperMotif[] = [
  { name: 'pois', size: 24 },
  { name: 'rayures', size: 31.11 },
  { name: 'vichy', size: 28 },
  { name: 'confettis', size: 60 },
  { name: 'etoiles', size: 40 },
]

export const PAPER_COLORS = ['rose', 'mustard', 'sky', 'mint', 'lilac', 'orange'] as const

// Motifs are drawn at this fraction of their tile size, on HTML (base.css --k-paper-scale) and
// SVG gifts alike, so a paper looks the same wherever it appears.
export const PAPER_SCALE = 0.6
