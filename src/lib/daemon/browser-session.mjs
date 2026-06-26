/**
 * Browser Session — ciclo de vida do Chromium quente para a lane `browser`.
 *
 * O browser-broker mantém UM Chromium vivo com a porta CDP aberta (:9222) e um
 * perfil persistente (sessão Keycloak do PJe/Solar não esfria). Os workers Python
 * (Patchright) anexam via `connect_over_cdp` — não lançam browser nem re-logam.
 *
 * Padrão "adopt-or-launch": se já existe um Chromium na porta (ex.: aberto na mão
 * pelo defensor, fluxo atual), o broker ADOTA e só monitora; senão, LANÇA e mantém.
 * Isso faz a Fase 2 conviver com o workflow manual de hoje sem ruptura.
 *
 * Lógica pura (resolveChromiumBin, probeCdp) é testável sem subir browser.
 * Spec: docs/plans/2026-06-21-daemon-browser-lane-design.md
 */

import { spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

export const DEFAULT_CDP_PORT = 9222

/**
 * Resolve o binário do Chromium. Preferência: override por env → Chromium full do
 * cache do Playwright/Patchright (headful, não o headless_shell) → Chromium do sistema.
 * @returns {string|null} caminho do binário, ou null se nenhum encontrado.
 */
export function resolveChromiumBin(env = {}, home = '') {
  if (env.BROWSER_CHROMIUM_BIN && existsSync(env.BROWSER_CHROMIUM_BIN)) {
    return env.BROWSER_CHROMIUM_BIN
  }
  // Cache do Playwright/Patchright: ~/Library/Caches/ms-playwright/chromium-<rev>/...
  const cacheRoot = join(home, 'Library/Caches/ms-playwright')
  if (existsSync(cacheRoot)) {
    const dirs = readdirSync(cacheRoot)
      .filter((d) => d.startsWith('chromium-') && !d.includes('headless'))
      .sort() // rev cresce; última = mais nova
    for (const d of dirs.reverse()) {
      const bin = join(cacheRoot, d, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium')
      if (existsSync(bin)) return bin
    }
  }
  const system = '/Applications/Chromium.app/Contents/MacOS/Chromium'
  return existsSync(system) ? system : null
}

/**
 * Probe CDP: GET http://127.0.0.1:<port>/json/version. Retorna o JSON do browser
 * (Browser, webSocketDebuggerUrl, ...) se vivo, ou null se a porta não responde.
 * @returns {Promise<object|null>}
 */
export async function probeCdp(port = DEFAULT_CDP_PORT, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Argv para lançar o Chromium gerenciado: porta CDP, perfil persistente, e flags
 * que reduzem ruído/popups. Headed por padrão (gov system: menos detectável e
 * permite login manual 2FA quando a sessão cai); headless opcional p/ CI/teste.
 */
export function chromiumArgs({ port = DEFAULT_CDP_PORT, profileDir, headless = false, initialUrl = '' } = {}) {
  return [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-popup-blocking',
    '--remote-allow-origins=*',
    ...(headless ? ['--headless=new'] : []),
    // Abre já numa URL inicial (ex.: painel do PJe) p/ facilitar o login manual
    // quando o broker lança um Chromium novo (perfil sem sessão).
    ...(initialUrl ? [initialUrl] : []),
  ]
}

/**
 * Gerencia o Chromium quente: adota um já aberto na porta, ou lança e mantém vivo
 * (relança ao morrer, salvo shutdown). Expõe `state` p/ o heartbeat/dashboard.
 */
export class BrowserSession {
  /**
   * @param {object} opts
   * @param {string} opts.chromiumBin
   * @param {string} opts.profileDir
   * @param {number} [opts.port]
   * @param {boolean} [opts.headless]
   * @param {(msg:string)=>void} [opts.log]
   */
  constructor({ chromiumBin, profileDir, port = DEFAULT_CDP_PORT, headless = false, initialUrl = '', log = () => {} }) {
    this.chromiumBin = chromiumBin
    this.profileDir = profileDir
    this.port = port
    this.headless = headless
    this.initialUrl = initialUrl
    this.log = log
    this.child = null // processo lançado por nós (null se adotado/ausente)
    this.adopted = false
    this.shuttingDown = false
    this.up = false
  }

  /** Snapshot p/ heartbeat metadata. */
  get state() {
    return {
      up: this.up,
      adopted: this.adopted,
      managed: this.child != null,
      port: this.port,
    }
  }

  /** Sobe a sessão: adota se já há Chromium na porta; senão lança. */
  async start() {
    const existing = await probeCdp(this.port)
    if (existing) {
      this.adopted = true
      this.up = true
      this.log(`Chromium já ativo na porta ${this.port} — adotado (${existing.Browser || 'desconhecido'})`)
      return
    }
    if (!this.chromiumBin) {
      this.log(`Nenhum Chromium na porta ${this.port} e binário não encontrado — lane browser sem sessão`)
      return
    }
    this._launch()
  }

  _launch() {
    if (this.shuttingDown) return
    const args = chromiumArgs({ port: this.port, profileDir: this.profileDir, headless: this.headless, initialUrl: this.initialUrl })
    this.log(`Lançando Chromium gerenciado: ${this.chromiumBin} ${args.join(' ')}`)
    const child = spawn(this.chromiumBin, args, { stdio: 'ignore', detached: false })
    this.child = child
    this.adopted = false
    child.on('exit', (code) => {
      this.up = false
      if (this.child === child) this.child = null
      if (this.shuttingDown) return
      this.log(`Chromium gerenciado saiu (code ${code}); relançando em 3s`)
      setTimeout(() => this._launch(), 3000)
    })
  }

  /** Atualiza `up` via probe (chamado pelo health loop do broker). @returns {Promise<boolean>} */
  async refreshHealth() {
    const info = await probeCdp(this.port)
    this.up = info != null
    // Se adotamos e o browser caiu, viramos donos: lança um gerenciado.
    if (!this.up && this.adopted && !this.child && !this.shuttingDown) {
      this.adopted = false
      this.log(`Chromium adotado caiu — assumindo: lançando gerenciado`)
      this._launch()
    }
    return this.up
  }

  /** Encerra: mata só o que nós lançamos (não derruba um Chromium adotado/manual). */
  stop() {
    this.shuttingDown = true
    if (this.child) {
      try { this.child.kill('SIGTERM') } catch {}
      this.child = null
    }
  }
}
