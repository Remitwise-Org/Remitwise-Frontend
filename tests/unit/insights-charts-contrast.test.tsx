import { describe, it, expect } from 'vitest'
import { contrastRatio, meetsWcagAA, meetsWcagAALarge } from '@/lib/a11y/wcag-contrast'
import chartPalette from '@/lib/config/chartPalette.json'

// Darkest realistic card background the Insights charts render against
// (brand.dark in tailwind.config.js).
const DARK_BG = '#0A0A0A'

// Text colors actually used across the four Insights components.
const AXIS_COLOR = '#9CA3AF'       // gray-400 (updated from gray-500, which failed AA — see below)
const LEGEND_LABEL_COLOR = '#9ca3af' // gray-400 — tooltip/legend secondary text
const WHITE = '#ffffff'             // primary values, category names

describe('Insights charts — WCAG contrast', () => {
  describe('chart graphical elements (palette vs. dark background)', () => {
    // Non-text / UI-component contrast, WCAG SC 1.4.11: >= 3:1
    it.each(chartPalette.colors.map((color, i) => [i + 1, color] as const))(
      'palette color %i (%s) meets 3:1 against the dark background',
      (_index, color) => {
        expect(meetsWcagAALarge(color, DARK_BG)).toBe(true)
      },
    )
  })

  describe('text elements (labels vs. dark background)', () => {
    // Normal-text contrast, WCAG SC 1.4.3: >= 4.5:1
    it('axis / primary legend label color meets 4.5:1', () => {
      expect(meetsWcagAA(AXIS_COLOR, DARK_BG)).toBe(true)
    })

    it('secondary legend / tooltip label color meets 4.5:1', () => {
      expect(meetsWcagAA(LEGEND_LABEL_COLOR, DARK_BG)).toBe(true)
    })

    it('white value text meets 4.5:1 (sanity check)', () => {
      expect(meetsWcagAA(WHITE, DARK_BG)).toBe(true)
    })
  })

  describe('sanity checks on the utility itself', () => {
    it('white on black is close to the maximum possible ratio', () => {
      expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
    })

    it('identical colors have a 1:1 ratio', () => {
      expect(contrastRatio('#4E79A7', '#4E79A7')).toBeCloseTo(1, 5)
    })
  })
})
