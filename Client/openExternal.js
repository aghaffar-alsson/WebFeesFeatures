// client/openExternal.js
export function openExternal(url, options = {}) {
  const {
    newTab = true,
    noreferrer = true,
    noopener = true,
    fallback = true,
    onBlocked, // optional callback (e.g. analytics)
  } = options;

  const features = [
    noopener ? "noopener" : "",
    noreferrer ? "noreferrer" : "",
  ]
    .filter(Boolean)
    .join(",");

  let newWindow = null;

  if (newTab) {
    newWindow = window.open(url, "_blank", features);
  } else {
    window.location.href = url;
    return;
  }

  // Popup blocked or ignored
  if (!newWindow && fallback) {
    if (onBlocked) onBlocked(url);
    window.location.href = url;
  }
}