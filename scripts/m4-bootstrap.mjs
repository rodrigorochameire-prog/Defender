#!/usr/bin/env node
/**
 * OMBUDS — Bootstrap do host do daemon (Mac mini M4, plano Claude Max).
 *
 * Torna o "Claude Code Max" funcional NA MÁQUINA do daemon: diagnostica e
 * (com --fix) implementa o que falta para o daemon rodar análises via conta
 * Max, SEM custo de API.
 *
 * Princípio inegociável: o daemon usa EXCLUSIVAMENTE o login claude.ai (Max).
 * Chaves de API paga (ANTHROPIC_API_KEY / GEMINI / OPENAI) NUNCA devem chegar
 * ao `claude` — elas têm precedência sobre o login Max e geram cobrança.
 *
 * Uso:
 *   node scripts/m4-bootstrap.mjs            # diagnóstico (check)
 *   node scripts/m4-bootstrap.mjs --fix      # diagnóstico + aplica fixes seguros
 *   node scripts/m4-bootstrap.mjs --session  # modo hook (silencioso fora do host)
 *
 * O host do daemon é marcado por ~/.ombuds-daemon-host (criado no --fix) ou por
 * OMBUDS_ROLE=daemon. Em qualquer outra máquina (ex.: o M1 de dev), o modo
 * --session sai em silêncio.
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { resolve, join } from "node:path";

const ARGS = new Set(process.argv.slice(2));
const FIX = ARGS.has("--fix");
const SESSION = ARGS.has("--session");

// ANTI FORK-BOMB (defesa máxima): o daemon spawna `claude -p` no PROJECT_DIR com
// OMBUDS_NO_BOOTSTRAP=1; esse claude re-dispara o SessionStart hook → este script.
// Se reentrarmos com a marca, saímos IMEDIATAMENTE — zero probe, zero trabalho de
// bootstrap nos filhos de tarefa do daemon (corta a recursão na raiz e o overhead
// por-tarefa). O guard em verifyMaxAuth permanece como segunda linha de defesa.
if (process.env.OMBUDS_NO_BOOTSTRAP === "1") {
  process.exit(0);
}
const REPO = resolve(process.cwd());
const HOME = homedir();
const MARKER = join(HOME, ".ombuds-daemon-host");
const PLIST = join(HOME, "Library", "LaunchAgents", "com.ombuds.daemon.plist");
const PAID_KEYS = [
  "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN",
  "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
];

const out = [];
const log = (s = "") => out.push(s);
const C = { ok: "✓", warn: "⚠", fail: "✗", fix: "→" };

function sh(cmd) {
  try { return execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

function isDaemonHost() {
  return existsSync(MARKER) || process.env.OMBUDS_ROLE === "daemon";
}

/** Roda `claude -p` com TODAS as chaves pagas removidas — testa o login Max. */
function verifyMaxAuth(claudeBin) {
  // GUARD ANTI FORK-BOMB: este script roda como SessionStart hook (.claude/settings.json).
  // Se ele spawnar `claude -p`, esse claude reabre uma sessão → re-dispara o hook →
  // m4-bootstrap → claude -p → ... recursão infinita (empilha processos, queima cota Max).
  // Marcamos o env do filho com OMBUDS_NO_BOOTSTRAP=1; quando o hook reentra com essa
  // marca, pulamos o probe. Assim a cadeia para na profundidade 1.
  if (process.env.OMBUDS_NO_BOOTSTRAP === "1") {
    return { code: 0, ok: true, stdout: "(probe pulado: reentrância OMBUDS_NO_BOOTSTRAP)", stderr: "", skipped: true };
  }
  const env = { ...process.env };
  for (const k of PAID_KEYS) delete env[k];
  env.OMBUDS_NO_BOOTSTRAP = "1"; // o claude -p filho NÃO re-dispara o bootstrap (anti fork-bomb)
  // A primeira resposta do `claude -p` (warmup do modelo na conta Max) leva
  // ~90-100s. O timeout antigo (90s) dava SIGTERM (exit 143) e reportava um
  // FALSO "login FALHOU". 180s cobre a latência real com folga.
  const r = spawnSync(claudeBin, ["-p", "responda apenas: OK"], {
    env, encoding: "utf-8", timeout: 180_000,
  });
  return {
    code: r.status,
    ok: r.status === 0 && /\bOK\b/i.test(r.stdout || ""),
    stdout: (r.stdout || "").trim().slice(0, 300),
    stderr: (r.stderr || "").trim().slice(0, 300),
  };
}

// PATH determinístico do daemon. Antes usávamos process.env.PATH, que varia por
// sessão (o VS Code injeta paths do Copilot) — isso fazia o plist mudar a cada
// run e o serviço reiniciar a cada sessão do Claude Code (matando tarefas em
// curso). Fixo e mínimo: claude (~/.local/bin) + node/git (homebrew) + sistema.
const DAEMON_PATH = [
  join(HOME, ".local", "bin"),
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].join(":");

function buildPlist(claudeBin, nodeBin) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.ombuds.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodeBin}</string>
    <string>${join(REPO, "scripts", "claude-code-daemon.mjs")}</string>
  </array>
  <key>WorkingDirectory</key><string>${REPO}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${join(HOME, "Library", "Logs", "ombuds-daemon.out.log")}</string>
  <key>StandardErrorPath</key><string>${join(HOME, "Library", "Logs", "ombuds-daemon.err.log")}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${DAEMON_PATH}</string>
    <key>OMBUDS_ROLE</key><string>daemon</string>
    <key>DAEMON_STRICT_NO_API</key><string>true</string>
  </dict>
</dict>
</plist>
`;
}

// ─────────────────────────────────────────────────────────────────────────
// Diagnóstico
// ─────────────────────────────────────────────────────────────────────────
const report = { pass: 0, warn: 0, fail: 0, fixes: [] };
const mark = (k) => { report[k]++; };

log(`OMBUDS · bootstrap do host do daemon`);
log(`máquina: ${hostname()} · ${sh("sysctl -n hw.model") || "?"} · repo: ${REPO}`);
log(`papel: ${isDaemonHost() ? "DAEMON HOST" : "não-host (dev)"}`);
log("");

// Modo --session fora do host: sai em silêncio (não polui sessões do M1).
if (SESSION && !isDaemonHost()) {
  process.exit(0);
}

// 1) claude CLI
const claudeBin = sh("which claude");
if (claudeBin) { log(`${C.ok} claude CLI: ${claudeBin} (${sh("claude --version") || "?"})`); mark("pass"); }
else { log(`${C.fail} claude CLI não encontrado — instale o Claude Code primeiro.`); mark("fail"); }

// 2) chaves pagas no ambiente (risco de cobrança)
const leaked = PAID_KEYS.filter((k) => process.env[k]);
if (leaked.length === 0) { log(`${C.ok} ambiente limpo — nenhuma chave de API paga exportada.`); mark("pass"); }
else {
  log(`${C.warn} chaves de API paga no ambiente: ${leaked.join(", ")}`);
  log(`    o daemon as remove do claude -p, mas remova-as do .env/shell na raiz.`);
  mark("warn");
}

// 3) login Max funcional (o teste decisivo) — só em runs explícitos.
// NÃO no hook --session: o `claude -p` leva ~90-100s e travaria o início de
// TODA sessão do Claude Code. No host, a liveness do daemon (passo 4) já é
// sinal suficiente; o teste decisivo roda em `--fix` ou run manual.
if (claudeBin && !SESSION) {
  log(`${C.fix} testando login Max (claude -p, chaves pagas removidas; ~90s)…`);
  const v = verifyMaxAuth(claudeBin);
  if (v.ok) { log(`${C.ok} login Max OK — claude -p respondeu sem API paga.`); mark("pass"); }
  else {
    log(`${C.fail} login Max FALHOU (exit=${v.code}). Análises não rodarão.`);
    if (v.stderr) log(`    stderr: ${v.stderr}`);
    if (v.stdout) log(`    stdout: ${v.stdout}`);
    log(`    AÇÃO MANUAL: rode \`claude\` neste Mac e faça /login na conta Max.`);
    mark("fail");
  }
} else if (claudeBin && SESSION) {
  log(`${C.ok} login Max não testado no hook (evita travar a sessão ~90s); liveness do daemon abaixo.`);
}

// 4) daemon rodando?
const running = sh(`pgrep -fl claude-code-daemon`);
if (running) { log(`${C.ok} daemon em execução.`); mark("pass"); }
else { log(`${C.warn} daemon NÃO está em execução.`); mark("warn"); }

// 5) serviço launchd instalado?
const hasPlist = existsSync(PLIST);
log(hasPlist ? `${C.ok} launchd: ${PLIST}` : `${C.warn} launchd não instalado (daemon não reinicia sozinho).`);
mark(hasPlist ? "pass" : "warn");

// ─────────────────────────────────────────────────────────────────────────
// Fixes (--fix, ou --session no host)
// ─────────────────────────────────────────────────────────────────────────
const doFix = FIX || (SESSION && isDaemonHost());
if (doFix && claudeBin) {
  log("");
  log(`${C.fix} aplicando fixes idempotentes…`);

  // marca este Mac como host do daemon
  if (!existsSync(MARKER)) {
    writeFileSync(MARKER, `ombuds daemon host\nrepo=${REPO}\n`);
    report.fixes.push("marcador ~/.ombuds-daemon-host criado");
  }

  // instala/atualiza o launchd plist. Prefere o symlink estável do node
  // (/opt/homebrew/bin/node) ao caminho versionado do Cellar (process.execPath),
  // que some quando o brew atualiza o node e quebraria o daemon.
  const nodeBin = existsSync("/opt/homebrew/bin/node")
    ? "/opt/homebrew/bin/node"
    : process.execPath;
  const desired = buildPlist(claudeBin, nodeBin);
  const current = hasPlist ? readFileSync(PLIST, "utf-8") : "";
  if (current !== desired) {
    try {
      execSync(`mkdir -p "${join(HOME, "Library", "LaunchAgents")}" "${join(HOME, "Library", "Logs")}"`);
      writeFileSync(PLIST, desired);
      report.fixes.push(`launchd plist escrito (${PLIST})`);
      // (re)carrega o serviço
      sh(`launchctl unload "${PLIST}" 2>/dev/null`);
      const loaded = sh(`launchctl load "${PLIST}"`);
      report.fixes.push(loaded === null ? "launchctl load tentado" : "serviço launchd carregado");
    } catch (e) {
      log(`    ${C.fail} falha ao instalar launchd: ${e.message}`);
    }
  } else {
    report.fixes.push("launchd plist já atualizado");
  }

  for (const f of report.fixes) log(`    ${C.fix} ${f}`);
}

// ─────────────────────────────────────────────────────────────────────────
log("");
log(`resumo: ${report.pass} ok · ${report.warn} avisos · ${report.fail} falhas`);
if (!doFix && (report.warn > 0 || report.fail > 0)) {
  log(`rode \`node scripts/m4-bootstrap.mjs --fix\` para aplicar os fixes seguros.`);
}

if (!ARGS.has("--quiet")) console.log(out.join("\n"));
process.exit(report.fail > 0 ? 1 : 0);
