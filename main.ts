// Neon Grid's hand-in program: copies the app and its screenshots into the output
// directory and writes the dossier the scorer re-derives with buildDossier.
// Run with `node main.ts`; MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.
import { cpSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const here = resolve(import.meta.dirname);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** Copies a tree in sorted order, refusing symlinks so the hand-in stays plain files. */
function copyTree(from: string, to: string): number {
  let copied = 0;
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from).sort()) {
    const src = join(from, name);
    const dst = join(to, name);
    const info = lstatSync(src);
    if (info.isSymbolicLink()) throw new Error(`refusing to copy symlink: ${src}`);
    if (info.isDirectory()) copied += copyTree(src, dst);
    else if (info.isFile()) {
      cpSync(src, dst);
      copied += 1;
    }
  }
  return copied;
}

const appFiles = copyTree(join(here, 'app'), join(outDir, 'app'));
const shotFiles = copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`app: ${appFiles} files`);
console.log(`screenshots: ${shotFiles} files`);
console.log(`dossier.json: ${dossier.byteLength} bytes`);
console.log(`output: ${outDir}`);
