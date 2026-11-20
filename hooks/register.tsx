// Kontingent: shows the subscription windows (5 hours, 7 days), the context
// fill and the session's cost in a band above the prompt, in every session.
// Display only: it never pauses, asks or proposes a handoff on its own; you
// decide what to do with the numbers. Figures are pushed by session.measure, no
// polling, no tokens. Times are shown as "in 2 T 3 h" from the clock,
// independent of the time zone this module runs in.
//
// It also remembers every session's context size and the time
// of its last response. The prompt cache goes cold after an hour: the next
// message in a big, stale session re-reads the whole history. On session start
// the band says so (hint from 100k tokens, handoff advice from 150k), and
// /sitzungen lists the sessions of the last 14 days with size, age and the
// price of their next message in tokens.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Messung, Sitzung } from '../types'
import { balken, FENSTER, KONTEXT, type Teil } from './leiste.ts'

const messung = atom({ plugin: 'kontingent', key: 'messung' } as const, null)
const kaltHinweis = atom({ plugin: 'kontingent', key: 'kaltHinweis' } as const, null)
const SCHWELLEN = [75, 90]
const VERLAUF = 'sitzungen'
const MAX_SITZUNGEN = 200
const NAME: Record<string, string> = { five_hour: '5 h', seven_day: 'Woche' }
const KALT_NACH_MS = 60 * 60 * 1000 // prompt cache lifetime on this account: one hour
const GROSS_AB = 100_000 // tokens: from here the band warns in a cold session
const UEBERGABE_AB = 150_000 // tokens: from here it advises a handoff and a fresh start
const ZWEI_WOCHEN = 14 * 86400000

function dauer(ms: number): string {
  if (ms <= 0) return 'gleich'
  const h = Math.floor(ms / 3600000)
  const t = Math.floor(h / 24)
  if (t > 0) return `${t} T ${h % 24} h`
  if (h > 0) return `${h} h ${Math.floor((ms % 3600000) / 60000)} min`
  return `${Math.max(1, Math.round(ms / 60000))} min`
}

function ampel(p: number): string {
  return p >= 90 ? '🔴' : p >= 75 ? '🟡' : '🟢'
}

function fenster(r: SessionRateLimit, jetzt: number): string {
  const p = Math.round(r.percentUsed)
  const neu = r.resetsAt ? `, neu in ${dauer(Date.parse(r.resetsAt) - jetzt)}` : ''
  return `${ampel(p)} ${NAME[r.kind] ?? r.kind} ${p} %${neu}`
}

// The project is the name of the folder the session runs in
function projekt(cwd: string): string {
  const p = cwd.replace(/\\/g, '/')
  return p.split('/').filter(Boolean).pop() ?? p
}

function tausend(n: number): string {
  return `${Math.round(n / 1000)}k`
}

// The warning text for a stale, big session, or null when the session is small or warm
function kaltText(s: Sitzung, jetzt: number): string | null {
  const letzte = s.antwort ?? s.zuletzt
  if (s.tokens === undefined || s.tokens < GROSS_AB || jetzt - letzte < KALT_NACH_MS) return null
  const basis = `Verlauf ${tausend(s.tokens)} Tokens, letzte Antwort vor ${dauer(jetzt - letzte)}: der Speicher ist kalt, die nächste Nachricht liest alles neu (rund ${tausend(s.tokens)} Tokens)`
  return s.tokens >= UEBERGABE_AB ? `${basis}. Empfehlung: Übergabe schreiben, neu starten` : basis
}

async function verlauf($: EngineInterface): Promise<Sitzung[]> {
  return ((await $.store.get(VERLAUF)) as Sitzung[] | undefined) ?? []
}

async function merke($: EngineInterface, m: Messung, mitAntwort: boolean) {
  await update($, messung, () => m)
  // Sitzungsverlauf: Wochenstand am Anfang und jetzt, Kosten, Kontextgroesse, letzte Antwort
  const id = await $.session.id()
  const liste = await verlauf($)
  const woche = m.fenster.find(f => f.kind === 'seven_day')?.percentUsed
  const i = liste.findIndex(s => s.id === id)
  const alt = liste[i]
  const antwort = mitAntwort && m.tokens !== undefined ? m.zeit : undefined
  if (alt) {
    liste[i] = {
      ...alt,
      wocheJetzt: woche ?? alt.wocheJetzt,
      usd: m.usd ?? alt.usd,
      zuletzt: m.zeit,
      tokens: mitAntwort && m.tokens !== undefined ? m.tokens : alt.tokens,
      antwort: antwort ?? alt.antwort,
    }
  } else {
    liste.push({ id, projekt: projekt(await $.session.cwd()), start: m.zeit, zuletzt: m.zeit, wocheStart: woche, wocheJetzt: woche, usd: m.usd, tokens: mitAntwort ? m.tokens : undefined, antwort })
  }
  await $.store.set(VERLAUF, liste.slice(-MAX_SITZUNGEN))
}

async function warne($: EngineInterface, fensterListe: readonly SessionRateLimit[]) {
  for (const r of fensterListe) {
    for (const s of SCHWELLEN) {
      if (r.percentUsed < s) continue
      // je Fenster, Ruecksetzzeit und Schwelle nur einmal, auch ueber Sitzungen
      const key = `gewarnt:${r.kind}:${r.resetsAt ?? ''}:${s}`
      if (await $.store.get(key)) continue
      await $.store.set(key, true)
      $.ui.toast(`Kontingent: ${NAME[r.kind] ?? r.kind} bei ${Math.round(r.percentUsed)} %`, { timeoutMs: 8000 })
    }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'kontingent', description: 'Kontingent: Fenster, Kontext und Verlauf je Sitzung' })
    await $.command.register({ name: 'sitzungen', description: 'Sitzungen der letzten 14 Tage: Größe, Alter, kalt oder warm, Preis der nächsten Nachricht in Tokens' })
    // Kalter Speicher? Vor dem Merken pruefen, sonst zaehlt der Start schon als Aktivitaet
    const jetzt = await $.clock.now()
    const id = await $.session.id()
    const bekannt = (await verlauf($)).find(s => s.id === id)
    const text = bekannt ? kaltText(bekannt, jetzt) : null
    await update($, kaltHinweis, () => text)
    if (text) $.ui.toast(`Kontext: ${text}`, { timeoutMs: 12000 })
    const u = await $.session.usage()
    if (u.rateLimits.length || u.context.percent !== undefined) {
      await merke($, { zeit: jetzt, fenster: [...u.rateLimits], kontext: u.context.percent, tokens: u.context.tokens, usd: u.cost?.usd }, false)
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const m: Messung = { zeit: await $.clock.now(), fenster: [...e.rateLimits], kontext: e.context.percent, tokens: e.context.tokens, usd: e.cost?.usd }
    await merke($, m, true)
    await warne($, e.rateLimits)
    // eine Antwort ist da: der Speicher ist wieder warm, der Hinweis hat seinen Dienst getan
    if (e.context.tokens !== undefined) await update($, kaltHinweis, () => null)
    return next(e)
  })

  on('command.run', { command: 'kontingent' }, async $ => {
    const jetzt = await $.clock.now()
    const m = await read($, messung)
    const liste = await verlauf($)
    const kopf = m && m.fenster.length
      ? m.fenster.map(f => fenster(f, jetzt)).join('\n')
      : 'Noch keine Werte: die App meldet sie nach der ersten Antwort einer Sitzung.'
    const kontext = m?.kontext !== undefined ? `Kontext dieser Sitzung: ${m.kontext} %${m.tokens !== undefined ? ` (${tausend(m.tokens)} Tokens)` : ''}` : ''
    const woche = liste.filter(s => jetzt - s.start < 7 * 86400000)
    const jeProjekt = new Map<string, number>()
    for (const s of woche) jeProjekt.set(s.projekt, (jeProjekt.get(s.projekt) ?? 0) + (s.usd ?? 0))
    const summe = [...jeProjekt.values()].reduce((a, b) => a + b, 0)
    const anteile = [...jeProjekt].sort((a, b) => b[1] - a[1])
      .map(([p, usd]) => `- ${p}: ${summe > 0 ? Math.round((usd / summe) * 100) : 0} % (${usd.toFixed(2)} $ Gegenwert)`)
    const sitzungen = liste.slice(-12).reverse().map(s => {
      const d = s.wocheStart !== undefined && s.wocheJetzt !== undefined ? `Woche ${Math.round(s.wocheStart)} → ${Math.round(s.wocheJetzt)} %` : 'Woche ?'
      return `- vor ${dauer(jetzt - s.start)}: ${s.projekt}, ${d}, ${(s.usd ?? 0).toFixed(2)} $`
    })
    return {
      text: [
        'Kontingent jetzt:', kopf, kontext, '',
        'Anteil am Verbrauch der letzten 7 Tage je Projekt (nach Kosten-Gegenwert je Sitzung):', ...(anteile.length ? anteile : ['- noch kein Verlauf']), '',
        'Letzte Sitzungen (das Wochenfenster gilt fürs ganze Konto; laufen Sitzungen parallel, steigt es für alle):', ...(sitzungen.length ? sitzungen : ['- noch keine']),
        '', 'Größe und Preis je Sitzung: /sitzungen',
      ].filter(z => z !== undefined).join('\n'),
    }
  })

  on('command.run', { command: 'sitzungen' }, async $ => {
    const jetzt = await $.clock.now()
    const id = await $.session.id()
    const liste = (await verlauf($)).filter(s => jetzt - s.zuletzt < ZWEI_WOCHEN).sort((a, b) => b.zuletzt - a.zuletzt)
    if (!liste.length) return { text: 'Noch keine Sitzungen im Verlauf. Der Mod kennt eine Sitzung ab ihrer ersten Antwort nach dem Einbau.' }
    const zeilen = liste.map(s => {
      const letzte = s.antwort ?? s.zuletzt
      const kalt = jetzt - letzte >= KALT_NACH_MS
      if (s.tokens === undefined) return `- ${s.id === id ? '▶ ' : ''}${s.projekt}, vor ${dauer(jetzt - s.zuletzt)}: Größe unbekannt (noch keine Antwort seit dem Einbau)`
      const zustand = kalt ? `kalt, nächste Nachricht liest ~${tausend(s.tokens)} Tokens neu` : 'warm'
      const rat = kalt && s.tokens >= UEBERGABE_AB ? ' → Übergabe schreiben, neu starten' : kalt && s.tokens >= GROSS_AB ? ' → teuer' : ''
      return `- ${s.id === id ? '▶ ' : ''}${s.projekt}, vor ${dauer(jetzt - s.zuletzt)}: ${tausend(s.tokens)} Tokens, ${zustand}${rat}`
    })
    return {
      text: [
        'Sitzungen der letzten 14 Tage, neueste zuerst (▶ diese; kalt = letzte Antwort über 1 h her):', ...zeilen, '',
        `Regel: ab ${tausend(GROSS_AB)} Tokens und kaltem Speicher ein Hinweis, ab ${tausend(UEBERGABE_AB)} die Empfehlung zur Übergabe. Preise in Tokens; wie viel Wochenfenster das kostet, verrät die App nicht.`,
      ].join('\n'),
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, messung)
    const kalt = await read($, kaltHinweis)
    if (e.props.hasSurvey || (m === null && kalt === null)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    // Bars in the band form (leiste.ts): name, ten tiles, percent, no reset
    // time (the reset times are in /kontingent). The full tiles turn yellow,
    // then red, when it gets tight; everything else stays dim, calm is the
    // normal case.
    const teile: Teil[][] = m ? m.fenster.map(f => balken(NAME[f.kind] ?? f.kind, f.percentUsed, FENSTER)) : []
    if (m?.kontext !== undefined) teile.push(balken('Kontext', m.kontext, KONTEXT))
    if (teile.length === 0 && kalt === null) return next(e)
    const eigene = (
      <Box flexDirection="column">
        {teile.length > 0 ? (
          <Box>
            {teile.flatMap((b, i) => [
              i > 0 ? <Text key={`luecke${i}`} dimColor>{'   '}</Text> : null,
              ...b.map((t, j) => t.stufe === 'gelb'
                ? <Text key={`${i}.${j}`} color="yellow">{t.text}</Text>
                : t.stufe === 'rot'
                  ? <Text key={`${i}.${j}`} color="red">{t.text}</Text>
                  : <Text key={`${i}.${j}`} dimColor>{t.text}</Text>),
            ])}
          </Box>
        ) : null}
        {kalt !== null ? (
          <Box>
            <Text color="yellow">⚠ Kontext  {kalt}</Text>
          </Box>
        ) : null}
      </Box>
    )
    // The band draws one tree: hand the event down so another mod's line
    // stays visible beneath this one
    const unten = await next(e)
    if (unten.type === 'engine') return eigene
    return (
      <Box flexDirection="column">
        {eigene}
        {unten}
      </Box>
    )
  })
}
