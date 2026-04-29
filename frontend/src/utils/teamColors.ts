// Resolve conflito visual quando home e away têm cores parecidas
// (ex: KC vs SF, ambos vermelho — usar color2 do away).

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rN = r / 255, gN = g / 255, bN = b / 255
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rN: h = ((gN - bN) / d + (gN < bN ? 6 : 0)); break
      case gN: h = (bN - rN) / d + 2; break
      case bN: h = (rN - gN) / d + 4; break
    }
    h *= 60
  }
  return [h, s * 100, l * 100]
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360
  return d > 180 ? 360 - d : d
}

// Considera "similar" quando hue está próximo E ambas as cores são saturadas
// e com lightness comparável. Cinzas/pretos são tratados pela lightness.
export function colorsConflict(c1: string, c2: string): boolean {
  const [h1, s1, l1] = hexToHsl(c1)
  const [h2, s2, l2] = hexToHsl(c2)

  // Ambos quase pretos/brancos? Conflitam se lightness próximo.
  if (s1 < 15 && s2 < 15) return Math.abs(l1 - l2) < 20

  // Um saturado, outro cinza — não conflitam.
  if (Math.abs(s1 - s2) > 40) return false

  // Hue próximo + lightness não muito distante = conflito.
  return hueDistance(h1, h2) < 30 && Math.abs(l1 - l2) < 30
}

/**
 * Decide qual cor do away usar pra contrastar com a do home.
 * Retorna away.color por default; se conflita, troca pra away.color2
 * (e se color2 também conflitar, faz fallback pra azul de dados).
 */
export function pickAwayColor(
  homeColor: string,
  away: { color: string; color2: string },
  fallback = '#448aff'
): string {
  if (!colorsConflict(homeColor, away.color)) return away.color
  if (!colorsConflict(homeColor, away.color2)) return away.color2
  return fallback
}
