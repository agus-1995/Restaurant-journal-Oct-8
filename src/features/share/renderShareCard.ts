import { wrapLines } from './wrapText'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

export interface ShareCardData {
  placeName: string
  /** e.g. "San Telmo, Buenos Aires" */
  location: string
  reactionEmoji: string
  reactionLabel: string
  /** e.g. "$$", omitted when the entry has no price */
  price?: string
  date: string
  dishesLabel: string
  dishes: string[]
  footer: string
  /** Data URL of the first photo, if any */
  photo?: string
}

const COLORS = {
  paper: '#fbf6ee',
  card: '#fffdf9',
  line: '#e3d6c2',
  ink: '#2b211c',
  inkSoft: '#6b5b50',
  terracotta: '#b4452b',
  paperDeep: '#f3eadb',
}
const DISPLAY = '"Fraunces Variable", Georgia, serif'
const SANS = '"Inter Variable", system-ui, sans-serif'

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image()
  // Photos from Supabase Storage live on another origin: without CORS mode the canvas becomes
  // "tainted" and `toBlob` throws. Data URLs (local mock) are unaffected.
  image.crossOrigin = 'anonymous'
  image.src = src
  await image.decode()
  return image
}

async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`600 64px ${DISPLAY}`),
      document.fonts.load(`500 34px ${SANS}`),
      document.fonts.load(`700 34px ${SANS}`),
    ])
  } catch {
    // Fall back to the generic serif/sans stacks.
  }
}

/** Draws `image` into the box like CSS `object-fit: cover`. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  const sx = (image.naturalWidth - sw) / 2
  const sy = (image.naturalHeight - sh) / 2
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h)
}

/** Renders the single-entry "polaroid" share card as a PNG. Browser-only (needs canvas). */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  await ensureFonts()
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  const measure = (text: string) => ctx.measureText(text).width

  ctx.fillStyle = COLORS.paper
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Polaroid, tilted a little for the scrapbook feel.
  ctx.save()
  ctx.translate(CARD_WIDTH / 2, 600)
  ctx.rotate((-1.2 * Math.PI) / 180)
  ctx.translate(-CARD_WIDTH / 2, -600)
  ctx.shadowColor = 'rgba(43, 33, 28, 0.25)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 14
  ctx.fillStyle = COLORS.card
  ctx.fillRect(70, 70, 940, 1010)
  ctx.shadowColor = 'transparent'

  const photoBox = { x: 110, y: 110, w: 860, h: 600 }
  ctx.fillStyle = COLORS.paperDeep
  ctx.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h)
  if (data.photo) {
    try {
      drawCover(ctx, await loadImage(data.photo), photoBox.x, photoBox.y, photoBox.w, photoBox.h)
    } catch {
      // Keep the plain placeholder block if the photo can't be decoded.
    }
  } else {
    ctx.font = `200px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🍽️', photoBox.x + photoBox.w / 2, photoBox.y + photoBox.h / 2)
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORS.ink
  ctx.font = `600 62px ${DISPLAY}`
  const nameLines = wrapLines(data.placeName, 860, measure, 2)
  let y = 790
  for (const line of nameLines) {
    ctx.fillText(line, 110, y)
    y += 70
  }

  ctx.fillStyle = COLORS.inkSoft
  ctx.font = `500 32px ${SANS}`
  ctx.fillText(wrapLines(data.location, 860, measure, 1)[0] ?? '', 110, y - 10)

  y += 50
  ctx.fillStyle = COLORS.ink
  ctx.font = `700 34px ${SANS}`
  const meta = [`${data.reactionEmoji} ${data.reactionLabel}`, data.price, data.date].filter(
    (part): part is string => Boolean(part),
  )
  ctx.fillText(meta.join('   ·   '), 110, y - 10)
  ctx.restore()

  if (data.dishes.length > 0) {
    ctx.fillStyle = COLORS.terracotta
    ctx.font = `700 34px ${SANS}`
    ctx.fillText(data.dishesLabel, 110, 1160)
    ctx.fillStyle = COLORS.ink
    ctx.font = `500 34px ${SANS}`
    const labelWidth = measure(`${data.dishesLabel}  `)
    const lines = wrapLines(data.dishes.join(' · '), 860 - labelWidth, measure, 2)
    lines.forEach((line, i) => ctx.fillText(line, 110 + labelWidth, 1160 + i * 46))
  }

  ctx.fillStyle = COLORS.terracotta
  ctx.font = `600 44px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText(data.footer, CARD_WIDTH / 2, 1290)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the share card'))),
      'image/png',
    )
  })
}
