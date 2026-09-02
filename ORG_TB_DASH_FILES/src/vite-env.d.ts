/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_DESCRIPTION?: string;
  readonly VITE_APP_REDIRECT_URI?: string;
  readonly VITE_THINGSBOARD_URL?: string;
  readonly VITE_AUTHENTIK_URL?: string;
  readonly VITE_AUTHENTIK_CLIENT_ID?: string;
  readonly VITE_AUTHENTIK_APP_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
