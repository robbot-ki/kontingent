// Probes for the band's bars. Run:
//   node --test tests/leiste.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { balken, FENSTER, KONTEXT, stufe } from '../hooks/leiste.ts'

test('Fenster: grau bis 74 %, gelb ab 75 %, rot ab 90 %', () => {
  assert.equal(stufe(74, FENSTER), 'ruhig')
  assert.equal(stufe(74.6, FENSTER), 'gelb') // rounded as shown
  assert.equal(stufe(75, FENSTER), 'gelb')
  assert.equal(stufe(89, FENSTER), 'gelb')
  assert.equal(stufe(90, FENSTER), 'rot')
})

test('Kontext: gelb erst ab 80 %, rot ab 90 %', () => {
  assert.equal(stufe(75, KONTEXT), 'ruhig')
  assert.equal(stufe(79, KONTEXT), 'ruhig')
  assert.equal(stufe(80, KONTEXT), 'gelb')
  assert.equal(stufe(90, KONTEXT), 'rot')
})

test('balken: nur die vollen Kacheln tragen die Stufe, Text bleibt wie bisher', () => {
  const t = balken('Woche', 67, FENSTER)
  assert.equal(t.map(x => x.text).join(''), 'Woche ▰▰▰▰▰▰▰▱▱▱ 67 %')
  assert.deepEqual(t.map(x => x.stufe), [undefined, 'ruhig', undefined, undefined])
  const k = balken('Kontext', 92, KONTEXT)
  assert.equal(k.map(x => x.text).join(''), '🔴 Kontext ▰▰▰▰▰▰▰▰▰▱ 92 %')
  assert.equal(k[1].stufe, 'rot')
  assert.equal(balken('Kontext', 82, KONTEXT)[0].text, '🟡 Kontext ')
})

test('balken: Ränder 0 und über 100 %', () => {
  assert.equal(balken('5 h', 0, FENSTER).map(x => x.text).join(''), '5 h ▱▱▱▱▱▱▱▱▱▱ 0 %')
  assert.equal(balken('5 h', 104, FENSTER)[1].text, '▰▰▰▰▰▰▰▰▰▰')
})
