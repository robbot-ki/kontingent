// The band's bars as pure functions, no imports, so node:test can probe them.
// The full tiles take a colour when it gets tight, grey stays the normal case.
// Same marks as the warnings (75 / 90 %) for the 5-h and week windows; the
// context turns at 80 / 90 %, because a 1M window at 80 % is about 800k, a
// good point to start a fresh session. Change the numbers to your liking.

export type Stufe = 'ruhig' | 'gelb' | 'rot'
export type Grenzen = { gelb: number; rot: number }
export type Teil = { text: string; stufe?: Stufe }

export const FENSTER: Grenzen = { gelb: 75, rot: 90 }
export const KONTEXT: Grenzen = { gelb: 80, rot: 90 }

export function stufe(p: number, g: Grenzen): Stufe {
  const r = Math.round(p)
  return r >= g.rot ? 'rot' : r >= g.gelb ? 'gelb' : 'ruhig'
}

const MARKE: Record<Stufe, string> = { ruhig: '', gelb: '🟡 ', rot: '🔴 ' }

// One bar as parts: the mark and name, the full tiles (coloured by the
// level), the empty tiles and the percent. Ten tiles, one per 10 %.
export function balken(name: string, p: number, g: Grenzen): Teil[] {
  const r = Math.round(p)
  const voll = Math.max(0, Math.min(10, Math.round(r / 10)))
  const s = stufe(r, g)
  return [
    { text: `${MARKE[s]}${name} ` },
    { text: '▰'.repeat(voll), stufe: s },
    { text: '▱'.repeat(10 - voll) },
    { text: ` ${r} %` },
  ]
}
