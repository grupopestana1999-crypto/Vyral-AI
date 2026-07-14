/// <reference types="vite/client" />

// E65 dia 5: timestamp do build injetado pelo `define` no vite.config.ts
// (usado por useVersionCheck pra detectar quando a aba tá com bundle stale).
declare const __BUILD_TS__: number
