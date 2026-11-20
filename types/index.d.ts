export type Fenster = { kind: string; percentUsed: number; resetsAt?: string }
export type Messung = { zeit: number; fenster: Fenster[]; kontext?: number; tokens?: number; usd?: number }
export type Sitzung = {
  id: string
  projekt: string
  start: number
  zuletzt: number
  wocheStart?: number
  wocheJetzt?: number
  usd?: number
  tokens?: number // context size the last response was answered over
  antwort?: number // when that last response came (the prompt cache goes cold an hour later)
}

declare module 'claude-code' {
  interface PluginState {
    kontingent: { messung: Messung | null; kaltHinweis: string | null }
  }
}
