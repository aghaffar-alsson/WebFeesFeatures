import { openExternal } from "./openExternal.js";

export function useExternalLink() {
  const handleOpen = (url) => {
    openExternal(url, {
      newTab: true,
      fallback: true,
      onBlocked: (blockedUrl) => {
        console.warn("Popup blocked:", blockedUrl);
        // plug analytics here if needed
      },
    });
  };

  return handleOpen;
}