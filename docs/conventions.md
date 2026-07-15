## Module resolution conventions (locked — do not deviate per-package)

- Every package exports via `"exports": { ".": "./src/index.ts" }` / `"types": "./src/index.ts"`. No package
  ever points to `./dist/*`. If a package's tests or build fail to resolve a sibling workspace package,
  the bug is in that package's config or imports — never fix it by changing another package's exports field.
- Internal relative imports within a package's own `src/` are extensionless (`from './constants'`, not
  `from './constants.js'`). This must be consistent across every package — check core-math, world-gen,
  narrative-gen, memory-client all match before adding a new package.
- All cross-package and intra-package imports are ESM `import`. `require(...)` is never used anywhere in
  `src/`. If you see a CJS `require` in any package, that's a bug to fix immediately, not a pattern to copy.
- Every package that has tests gets its own `vitest.config.ts` at the package root, matching the pattern
  already established in `world-gen` and `narrative-gen`. Copy the existing one when scaffolding a new
  package — don't write a new one from scratch.
- Never create a `.js` file next to a `.ts` file of the same name as a "shim" or workaround. If something
  won't resolve, fix the resolution config or the import specifier — don't hand-duplicate the module.
- Before marking any phase/checkpoint complete: run `git status --short` and confirm the diff touches only
  the files the task describes. Any incidental change to another package's `package.json`, `tsconfig.json`,
  or root `vitest.config.ts` must be called out explicitly and justified, not silently included.
- Report the exact commit hash via `git rev-parse HEAD` after committing, not a hand-typed/remembered one.