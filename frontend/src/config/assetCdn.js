const RAW_BASE = import.meta.env.VITE_ASSET_CDN_BASE || ''

export const ASSET_CDN_BASE = RAW_BASE.replace(/\/+$/, '')

let warned = false

export function cdnUrl(relativePath) {
  if (!ASSET_CDN_BASE && !warned) {
    warned = true
    console.warn('[assetCdn] VITE_ASSET_CDN_BASE is not set. Models will fail to load.')
  }

  const cleanPath = String(relativePath).replace(/^\/+/, '')
  const encodedPath = cleanPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${ASSET_CDN_BASE}/${encodedPath}`
}