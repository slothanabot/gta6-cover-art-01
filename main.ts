// NEON GRID — gta6-cover-art-01 entrypoint (Node 22, standard library only).
//
// What this program does: it takes this repository's static app (app/) and the
// screenshots the maker took of it (screenshots/) and hands them in. It copies
// both trees into the output directory and writes /output/dossier.json — the
// summary the judge reads — using buildDossier from the vendored make.fun
// library in vendor/makefun-app.ts (that file stays exactly as the kit shipped
// it). Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The app itself is plain offline files: app/index.html plus its own CSS and
// JavaScript, an OFL font under app/fonts, and sample photos under app/samples.
// It makes no network request at runtime. Serve it locally with `node serve.ts`
// and open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Start from a clean output so a stale file from an earlier run can never
// leak into the submission.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const appOut = join(outDir, "app");
cpSync(join(repoRoot, "app"), appOut, { recursive: true });

const shotsOut = join(outDir, "screenshots");
mkdirSync(shotsOut, { recursive: true });
if (existsSync(join(repoRoot, "screenshots"))) {
  cpSync(join(repoRoot, "screenshots"), shotsOut, { recursive: true });
}

// Caps the gate enforces (see the kit's RULES.txt): app/ holds at most 993
// files/directories and 48 MiB, screenshots/ at most 4 files of 256 KiB each,
// and the dossier text at most 160 KiB. buildDossier refuses anything over
// them, so a bad tree fails here instead of silently shipping.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
