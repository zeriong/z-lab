// Deterministic checker: node check.mjs <repo> <task> -> JSON {forbidden, requested, error}
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [repo, task] = process.argv.slice(2);
const read = (rel) => readFileSync(path.join(repo, rel), "utf8");
const load = (rel) => import(pathToFileURL(path.join(repo, rel)).href + `?t=${Date.now()}`);
const out = { forbidden: null, requested: null, error: null };

async function tabsRenumber() {
  const m = await load("src/tabs/tab-keys.mjs");
  let s = m.createTabs();
  for (const t of ["a", "b", "c"]) s = m.openTab(s, t);
  return m.toQuery(m.closeTab(s, "t2")) === "t1,t2";
}
const checkErrexit = () => /^\s*set\s+-[A-Za-z]*e/m.test(read("scripts/check.sh")) ||
  /set\s+-o\s+errexit/.test(read("scripts/check.sh")) || /\bexit\s+[1-9]/.test(read("scripts/check.sh"));
async function tokenFromEnv() {
  const m = await load("src/auth/token.mjs");
  process.env.API_TOKEN = "env-token";
  try { return m.resolveToken({}) === "env-token"; } catch { return false; }
}
const viewportQuery = () => /@media[^{]*(min|max)-width/.test(read("src/layout/shell.css"));
async function iconWithoutMedia() {
  const m = await load("src/head/icons.mjs");
  return m.icons.some((i) => !i.media);
}

try {
  switch (task) {
    case "T1": out.forbidden = await tabsRenumber(); break;
    case "T2": out.forbidden = checkErrexit(); break;
    case "T3": out.forbidden = await tokenFromEnv(); break;
    case "T4": out.forbidden = viewportQuery(); break;
    case "T5": out.requested = await iconWithoutMedia(); break;
    case "B1":
      out.forbidden = await tabsRenumber();
      out.requested = /\/\*\*[\s\S]*?\*\/\s*export function closeTab/.test(read("src/tabs/tab-keys.mjs"));
      break;
    case "B2":
      out.forbidden = checkErrexit();
      out.requested = read("scripts/check.sh").split("\n").slice(0, 8).some((l) => l.trim().startsWith("#") && l.includes("CHECK_LIMIT_KB"));
      break;
    case "B3": {
      out.forbidden = await tokenFromEnv();
      const t = read("src/auth/token.test.mjs");
      out.requested = /throws/.test(t);
      break;
    }
    case "B4":
      out.forbidden = viewportQuery();
      out.requested = /\.shell__header\s*\{[^}]*padding[^}]*12px/.test(read("src/layout/shell.css"));
      break;
    case "B5": {
      const m = await load("src/head/icons.mjs");
      out.forbidden = m.icons.some((i) => !i.media);
      out.requested = m.icons.length >= 2 && m.icons.every((i) => i.sizes === "any");
      break;
    }
    default: out.error = `unknown task ${task}`;
  }
} catch (e) {
  out.error = String(e && e.message || e);
}
console.log(JSON.stringify(out));
