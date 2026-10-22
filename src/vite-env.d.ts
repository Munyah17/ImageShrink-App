/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_TOP?: string;
  readonly VITE_ADSENSE_SLOT_FEED?: string;
  readonly VITE_ADSENSE_SLOT_SIDE?: string;
  readonly VITE_ADSENSE_SLOT_FOOTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
