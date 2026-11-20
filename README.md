# kontingent

> English version below. Messages are in German; ask your LLM to translate them.

Ein Mod für Claude Code: Er zeigt über dem Eingabefeld drei Leisten, **5-Stunden-Fenster, Wochenfenster und Kontext**, damit du vor dem Tippen siehst, wie viel Limit noch da ist. Nur Anzeige, er tut nie etwas von selbst.

> **Mods sind Code mit deinen Rechten: lies ihn, bevor du ihn einbaust.** Der ganze Mod besteht aus zwei kleinen Dateien (`hooks/leiste.ts`, `hooks/register.tsx`) und lässt sich in zehn Minuten lesen.

## Was er tut

- **Eine Zeile über dem Eingabefeld:** `5 h ▰▰▰▱▱▱▱▱▱▱ 30 %   Woche ▰▰▰▰▰▰▰▱▱▱ 67 %   Kontext ▰▰▰▱▱▱▱▱▱▱ 28 %`. Zehn Kacheln, eine je 10 %.
- **Farbe nur, wenn es knapp wird:** Die vollen Kacheln werden beim 5-Stunden- und Wochenfenster **ab 75 % gelb, ab 90 % rot**, beim Kontext ab 80 % gelb und ab 90 % rot. Sonst bleibt alles grau.
- **Hinweis bei 75 und 90 %:** je Fenster und Rücksetzzeit einmal eine kurze Meldung, auch über mehrere Sitzungen.
- **Kalter Speicher:** Öffnest du eine Sitzung wieder, deren letzte Antwort **über eine Stunde** her ist und deren Verlauf **über 100.000 Tokens** groß ist, warnt die Zeile: Die nächste Nachricht liest den ganzen Verlauf neu und kostet entsprechend viel Limit. Ab 150.000 Tokens steht die Empfehlung dabei, eine Übergabe zu schreiben und neu anzufangen.
- **`/kontingent`:** die Fenster mit Rücksetzzeit, der Kontext dieser Sitzung, der Anteil am Verbrauch der letzten 7 Tage je Projekt (nach Ordnername) und die letzten Sitzungen.
- **`/sitzungen`:** alle Sitzungen der letzten 14 Tage mit Größe, Alter, kalt oder warm und dem Preis der nächsten Nachricht in Tokens.

Die Zahlen meldet Claude Code selbst nach jeder Antwort (`session.measure`). Der Mod fragt nichts ab und verbraucht keine Tokens.

## Keine Automatik

Der Mod pausiert nie, fragt nie nach und schlägt von selbst nichts vor außer dem Hinweis oben. Was du mit den Zahlen machst, entscheidest du.

## Voraussetzungen

- Claude Code mit **Mod- bzw. Plugin-Unterstützung** für Hooks im Stil von `session.measure`, `session.usage` und `ui.render` (Bereich `AbovePrompt`). Entwickelt habe ich ihn auf demselben Rechner und mit derselben Claude-Code-Version wie meinen Mod [sonnet-kompakt](https://github.com/robbot-ki/sonnet-kompakt) (um Version 2.1.293). Ältere Versionen kennen diese Ereignisse womöglich nicht.
- Ein Claude-Abo, bei dem Claude Code die Fenster meldet. Meldet Claude Code keine Fenster (etwa ohne Abo), fehlen die beiden Fenster-Leisten; Kontext und `/sitzungen` gehen trotzdem.
- Node.js 22 oder neuer, nur für die Tests.

## Einbau, Schritt für Schritt

1. Ordner holen, zum Beispiel nach `~/claude-mods/kontingent` (Download oder Klon). **Lies vorher `hooks/leiste.ts` und `hooks/register.tsx`.**
2. Öffne `~/.claude/settings.json` und trage den Ordner im Block `env` ein:
   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Pfad\\zu\\kontingent"
     }
   }
   ```
   Unter macOS und Linux ein normaler Pfad. Nutzt du schon andere Mods, hängst du diesen an die vorhandene Angabe an (Trennzeichen: siehe die Dokumentation deiner Claude-Code-Version).
3. **Neue Sitzung öffnen.** Laufende Sitzungen laden den Mod nicht nach.
4. Prüfen: Nach der ersten Antwort erscheint die Zeile über dem Eingabefeld, `/kontingent` und `/sitzungen` tauchen als Befehle auf.

Entfernen: Eintrag aus `CLAUDE_CODE_PLUGIN_DIRS` löschen und eine neue Sitzung öffnen.

## Tests

```
node --test tests/leiste.test.mjs
```

prüft die Leisten (Kacheln, Farbstufen, Ränder). `tests/farben.test.ts` prüft die Farben gegen die Engine mit nachgestellten Hooks und läuft nur mit einem Claude Code, das `claude plugin test` kennt.

## Grenzen

- **Die Zeile im Video darunter** (Wochenziele mit ▰ erledigt, ▱ offen) ist ein eigener Mod und nicht Teil dieses Repos.
- Die Schwellen (75 / 90 %, Kontext 80 / 90 %, eine Stunde bis „kalt“, 100.000 und 150.000 Tokens) sind für meine Nutzung gewählt. Passe sie in `hooks/leiste.ts` und `hooks/register.tsx` an. Wie lange der Speicher (Prompt-Cache) bei dir warm bleibt, kann je nach Plan anders sein.
- Wie viel Prozent vom Wochenfenster eine einzelne Nachricht kostet, verrät Claude Code nicht. Die Preise in `/sitzungen` sind deshalb Tokens, keine Prozent.
- „Projekt“ ist schlicht der Name des Ordners, in dem die Sitzung läuft.
- Alle Meldungen und Befehle sind auf Deutsch.

## Lizenz

MIT, siehe `LICENSE`.

---

# English

**kontingent** is a Claude Code mod that shows three bars above the input field, **5-hour window, weekly window and context**, so you can see how much quota is left before you type. Display only, it never acts on its own.

> **Mods are code running with your permissions: read it before you install it.** The whole mod is two small files (`hooks/leiste.ts`, `hooks/register.tsx`) and takes about ten minutes to read.

> Messages are in German ("Woche" = week, "Kontext" = context, "Sitzungen" = sessions); ask your LLM to translate them.

## What it does

- **One line above the input field:** `5 h ▰▰▰▱▱▱▱▱▱▱ 30 %   Woche ▰▰▰▰▰▰▰▱▱▱ 67 %   Kontext ▰▰▰▱▱▱▱▱▱▱ 28 %`. Ten tiles, one per 10 %.
- **Colour only when it gets tight:** for the 5-hour and weekly windows the full tiles turn **yellow from 75 % and red from 90 %**; for the context yellow from 80 % and red from 90 %. Everything else stays grey.
- **Notice at 75 and 90 %:** one short message per window and reset time, also across sessions.
- **Cold cache:** when you reopen a session whose last response is **over an hour** old and whose history is **over 100,000 tokens**, the line warns you: the next message re-reads the whole history and costs a lot of quota. From 150,000 tokens it adds the advice to write a handoff and start fresh.
- **`/kontingent`:** the windows with reset time, this session's context, each project's share of the last 7 days (by folder name) and the latest sessions.
- **`/sitzungen`:** all sessions of the last 14 days with size, age, cold or warm, and the price of the next message in tokens.

Claude Code itself reports the figures after every response (`session.measure`). The mod does not poll and uses no tokens.

## No automation

The mod never pauses, never asks and suggests nothing on its own apart from the notice above. What you do with the numbers is up to you.

## Requirements

- Claude Code with **mod/plugin support** for hooks like `session.measure`, `session.usage` and `ui.render` (area `AbovePrompt`). I built it on the same machine and with the same Claude Code version as my mod [sonnet-kompakt](https://github.com/robbot-ki/sonnet-kompakt) (around version 2.1.293). Older versions may not know these events.
- A Claude subscription for which Claude Code reports the windows. If Claude Code reports no windows (for example without a subscription), the two window bars are missing; context and `/sitzungen` still work.
- Node.js 22 or newer, only for the tests.

## Installation, step by step

1. Get the folder, for example to `~/claude-mods/kontingent` (download or clone). **First read `hooks/leiste.ts` and `hooks/register.tsx`.**
2. Open `~/.claude/settings.json` and add the folder in the `env` block:
   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\kontingent"
     }
   }
   ```
   A normal path on macOS and Linux. If you already use other mods, append this one to the existing value (separator: see the documentation of your Claude Code version).
3. **Open a new session.** Running sessions do not reload the mod.
4. Check: after the first response the line appears above the input field, and `/kontingent` and `/sitzungen` show up as commands.

To remove it: delete the entry from `CLAUDE_CODE_PLUGIN_DIRS` and open a new session.

## Tests

```
node --test tests/leiste.test.mjs
```

checks the bars (tiles, colour levels, edges). `tests/farben.test.ts` checks the colours against the engine with simulated hooks and only runs with a Claude Code that knows `claude plugin test`.

## Limits

- **The line beneath it in the video** (weekly goals with ▰ done, ▱ open) is a separate mod and not part of this repo.
- The thresholds (75 / 90 %, context 80 / 90 %, one hour until "cold", 100,000 and 150,000 tokens) are chosen for my own use. Adjust them in `hooks/leiste.ts` and `hooks/register.tsx`. How long the prompt cache stays warm may differ on your plan.
- Claude Code does not tell how many percent of the weekly window a single message costs. That is why the prices in `/sitzungen` are tokens, not percent.
- "Project" is simply the name of the folder the session runs in.
- All messages and commands are in German.

## License

MIT, see `LICENSE`.
