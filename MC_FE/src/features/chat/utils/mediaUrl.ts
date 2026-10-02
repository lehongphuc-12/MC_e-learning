const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5239"
).replace(/\/+$/, "");

export function resolveMediaUrl(
  url?: string | null
): string {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return `${BACKEND_URL}${
    url.startsWith("/")
      ? url
      : `/${url}`
  }`;
}