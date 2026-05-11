/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />

import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** Paid or active trial; enforced in router (see billingUnlocksWorkspaceSurfaces). */
    requiresWorkspace?: boolean;
  }
}

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_POSTHOG_ENABLED?: string
  readonly VITE_SOUP_CONNECT_URL?: string
  readonly VITEST?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
