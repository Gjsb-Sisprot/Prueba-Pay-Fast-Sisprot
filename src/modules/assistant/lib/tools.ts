02:17:43.617 Running build in Washington, D.C., USA (East) – iad1
02:17:43.618 Build machine configuration: 2 cores, 8 GB
02:17:43.791 Cloning github.com/Gjsb-Sisprot/Prueba-Pay-Fast-Sisprot (Branch: main, Commit: 26aff67)
02:17:45.079 Cloning completed: 1.288s
02:17:45.705 Restored build cache from previous deployment (ARWjpm22z4UAT1xLnVNvxpG9pUjy)
02:17:46.021 Running "vercel build"
02:17:46.693 Vercel CLI 51.2.1
02:17:46.974 Installing dependencies...
02:17:52.417 
02:17:52.418 up to date in 5s
02:17:52.418 
02:17:52.418 222 packages are looking for funding
02:17:52.418   run `npm fund` for details
02:17:52.421 npm notice
02:17:52.421 npm notice New minor version of npm available! 11.11.0 -> 11.12.1
02:17:52.421 npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.12.1
02:17:52.421 npm notice To update run: npm install -g npm@11.12.1
02:17:52.422 npm notice
02:17:52.450 Detected Next.js version: 15.5.15
02:17:52.456 Running "npm run build"
02:17:52.553 
02:17:52.554 > pay-fast-taurus@0.1.0 build
02:17:52.554 > next build
02:17:52.554 
02:17:53.603    ▲ Next.js 15.5.15
02:17:53.603    - Experiments (use with caution):
02:17:53.604      ✓ taint
02:17:53.604 
02:17:53.645    Creating an optimized production build ...
02:18:11.543  ✓ Compiled successfully in 15.3s
02:18:11.545    Linting and checking validity of types ...
02:18:26.102 Failed to compile.
02:18:26.103 
02:18:26.103 ./src/modules/assistant/lib/tools.ts:330:33
02:18:26.103 Type error: Cannot find name 'fetchClientContracts'.
02:18:26.104 
02:18:26.104 [0m [90m 328 |[39m   [36mtry[39m {
02:18:26.104  [90m 329 |[39m     [36mconst[39m { identification } [33m=[39m args[33m;[39m
02:18:26.104 [31m[1m>[22m[39m[90m 330 |[39m     [36mconst[39m { contracts } [33m=[39m [36mawait[39m fetchClientContracts(identification)[33m;[39m
02:18:26.104  [90m     |[39m                                 [31m[1m^[22m[39m
02:18:26.105  [90m 331 |[39m     
02:18:26.105  [90m 332 |[39m     [36mif[39m (contracts[33m.[39mlength [33m===[39m [35m0[39m) {
02:18:26.105  [90m 333 |[39m       [36mreturn[39m { success[33m:[39m [36mfalse[39m[33m,[39m message[33m:[39m [32m`No se encontraron contratos para la identificación: ${identification}`[39m }[33m;[39m[0m
02:18:26.137 Next.js build worker exited with code: 1 and signal: null
02:18:26.159 Error: Command "npm run build" exited with 1
