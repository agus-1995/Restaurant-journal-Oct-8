/**
 * Generated "photos" for seed data: a warm gradient with a big emoji, as an SVG data URL.
 * Offline-safe and tiny, so the seeded journal looks alive without hotlinking images.
 */
export function placeholderPhoto(emoji: string, hue: number): string {
  const svg =
    // Explicit width/height: a viewBox-only SVG has no intrinsic size, so a canvas draws it wrong.
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 70% 84%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 30) % 360} 62% 64%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="800" height="600" fill="url(#g)"/>` +
    `<circle cx="400" cy="300" r="190" fill="rgba(255,253,249,0.55)"/>` +
    `<text x="400" y="310" font-size="220" text-anchor="middle" dominant-baseline="central">${emoji}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
