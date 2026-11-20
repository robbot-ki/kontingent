// The band's colours against the engine itself: grey is the normal case, the
// full tiles turn yellow, then red. Run:
//   claude plugin test .
import { expect, mock, test } from 'claude-code/testing'

const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 120 } } as const
const messung = (fuenf: number, woche: number, kontext: number) => ({
  context: { tokens: kontext * 10_000, window: 1_000_000, percent: kontext },
  rateLimits: [{ kind: 'five_hour', percentUsed: fuenf }, { kind: 'seven_day', percentUsed: woche }],
  changed: ['context', 'rateLimits'],
}) as never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function welt(on: any) {
  mock.clock(on, { now: Date.UTC(2026, 9, 12, 14, 0) })
  mock.store(on)
  on('session.id', () => ({ value: 'sitzung-1' }))
  on('session.cwd', () => ({ value: 'C:/Projekte/demo' }))
  on('session.measure', ($: unknown, e: { changed: string[] }) => ({ changed: e.changed }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.render', () => ({ type: 'engine', ref: 0 }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function farben($: any, surface: 'terminal' | 'desktop') {
  const ui = await $.ui.mount({ plugin: 'kontingent', surface, ...BAND })
  const texte = await ui.findAll({ type: 'Text' })
  await ui.unmount()
  return texte.filter((t: { text: string }) => t.text.includes('▰')).map((t: { text: string; props: Record<string, unknown> }) => `${t.text}:${String(t.props.color ?? (t.props.dimColor ? 'grau' : '?'))}`)
}

test('ruhig: alles grau, auch bei Kontext 75 %', async ($, on) => {
  welt(on)
  await $.session.measure(messung(30, 67, 75))
  for (const surface of ['terminal', 'desktop'] as const) {
    expect(await farben($, surface)).toEqual(['▰▰▰:grau', '▰▰▰▰▰▰▰:grau', '▰▰▰▰▰▰▰▰:grau'])
  }
})

test('knapp: 5 h gelb ab 75 %, Woche rot ab 90 %, Kontext gelb erst ab 80 %', async ($, on) => {
  welt(on)
  await $.session.measure(messung(76, 91, 80))
  for (const surface of ['terminal', 'desktop'] as const) {
    expect(await farben($, surface)).toEqual(['▰▰▰▰▰▰▰▰:yellow', '▰▰▰▰▰▰▰▰▰:red', '▰▰▰▰▰▰▰▰:yellow'])
  }
})
