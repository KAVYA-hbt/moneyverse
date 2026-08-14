import { useEffect, useRef, useState } from 'react'
import './BadgeModal.css'

// Canvas is drawn at 2x for crisp export/share images, then scaled down
// via CSS for on-screen display -- this is the actual published asset,
// not a DOM screenshot, so it shares/downloads reliably on every browser.
// Portrait (not square) to fit the passbook layout -- CSS aspect-ratio
// below must stay in sync with this W/H ratio.
const CANVAS_W = 520
const CANVAS_H = 640

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'left') {
  const words = (text || '').split(' ')
  let line = ''
  const lines = []
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  }
  if (line) lines.push(line)
  ctx.textAlign = align
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight))
  return lines.length
}

// Small circular MoneyVerse emblem -- reused for both the header mark and
// the little "stamped by" seal next to the signature line, just at
// different scales/positions.
function drawEmblem(ctx, cx, cy, r) {
  ctx.save()
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)'
  ctx.lineWidth = Math.max(1, r * 0.08)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#facc15'
  ctx.font = `${Math.round(r * 0.85)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('₹', cx, cy + r * 0.04)
  ctx.restore()
}

function drawBadge(canvas, { title, subtitle, icon, name, dateLabel, level, levelTitle, trustPercent, coins }) {
  const ctx = canvas.getContext('2d')
  const w = CANVAS_W
  const h = CANVAS_H
  ctx.clearRect(0, 0, w, h)

  // Paper base
  ctx.fillStyle = '#f0e9d6'
  roundRect(ctx, 0, 0, w, h, 12)
  ctx.fill()

  // Engraved-pattern header band (security-print look), clipped to the
  // rounded top corners.
  ctx.save()
  roundRect(ctx, 0, 0, w, 120, 12)
  ctx.clip()
  ctx.fillStyle = '#12305c'
  ctx.fillRect(0, 0, w, 120)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  for (let i = -200; i < w + 200; i += 10) {
    ctx.beginPath()
    for (let y = 0; y <= 120; y += 4) {
      const x = i + Math.sin(y * 0.09 + i * 0.02) * 14
      y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()

  // Header wordmark -- no subtitle line underneath (kept intentionally
  // simple: just the game's own name, no invented department/agency copy).
  ctx.fillStyle = '#f2ecd9'
  ctx.font = '700 26px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText('MONEYVERSE', 32, 68)

  // Emblem, top-right of the header band
  drawEmblem(ctx, w - 52, 60, 26)

  // Ornate double-rule frame -- starts right at the paper edge now (no
  // perforation/binder-hole margin reserved on the left anymore).
  ctx.strokeStyle = 'rgba(18, 48, 92, 0.55)'
  ctx.lineWidth = 2
  roundRect(ctx, 30, 140, w - 60, h - 190, 6)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(18, 48, 92, 0.25)'
  ctx.lineWidth = 1
  roundRect(ctx, 36, 146, w - 72, h - 202, 4)
  ctx.stroke()

  // Large embossed rupee watermark behind the ledger
  ctx.save()
  ctx.font = '700 260px Georgia, serif'
  ctx.fillStyle = 'rgba(18, 48, 92, 0.045)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('₹', w / 2 + 20, 330)
  ctx.restore()

  // Stamp: starburst edge + ring + ribbon tails
  const stampCx = w - 90
  const stampCy = 230
  ctx.save()
  ctx.translate(stampCx, stampCy)
  ctx.rotate(-0.16)
  ctx.fillStyle = '#a6321f'
  ctx.beginPath()
  const spikes = 24
  const outerR = 62
  const innerR = 55
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = (Math.PI * i) / spikes
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f0e9d6'
  ctx.beginPath()
  ctx.arc(0, 0, 45, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#a6321f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 40, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#a6321f'
  ctx.font = '700 30px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon || '📊', 0, -4)
  ctx.font = '700 8px Arial'
  ctx.fillText('CERTIFIED', 0, 22)
  ctx.restore()
  ctx.save()
  ctx.translate(stampCx, stampCy)
  ctx.rotate(-0.16)
  ctx.fillStyle = '#a6321f'
  ctx.beginPath()
  ctx.moveTo(-13, 52)
  ctx.lineTo(-2, 82)
  ctx.lineTo(-15, 76)
  ctx.lineTo(-26, 87)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(13, 52)
  ctx.lineTo(2, 82)
  ctx.lineTo(15, 76)
  ctx.lineTo(26, 87)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Title block
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#12305c'
  ctx.font = '700 32px Georgia, serif'
  wrapText(ctx, title, 50, 205, 220, 36, 'left')
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(50, 216)
  ctx.lineTo(168, 216)
  ctx.stroke()
  ctx.font = '400 15px Arial'
  ctx.fillStyle = '#3c4a5e'
  wrapText(ctx, subtitle, 50, 240, 195, 20, 'left')

  // Ledger rows -- built from real session data where available, so this
  // isn't decorative filler.
  const rows = [
    ['Title earned', title],
    level ? ['Level completed', levelTitle ? `${level} — ${levelTitle}` : String(level)] : null,
    typeof trustPercent === 'number' ? ['Trust score', `${trustPercent}%`] : null,
    typeof coins === 'number' ? ['Coins on record', String(coins)] : null,
    ['Date issued', dateLabel],
    ['Account holder', name || 'Player'],
  ].filter(Boolean)

  ctx.font = '400 13px "Courier New", monospace'
  rows.forEach((r, i) => {
    const y = 368 + i * 30
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(18, 48, 92, 0.05)'
      ctx.fillRect(48, y - 18, w - 100, 28)
    }
    ctx.fillStyle = '#12305c'
    ctx.textAlign = 'left'
    ctx.fillText(r[0], 60, y)
    ctx.textAlign = 'right'
    ctx.fillText(r[1], w - 52, y)
  })

  const lastRowY = 368 + (rows.length - 1) * 30

  // Signature line, with a small MoneyVerse stamp sitting right beside it
  // as the "authorised by" mark instead of any wordmark.
  const sigY = Math.max(lastRowY + 62, h - 78)
  ctx.strokeStyle = '#12305c'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, sigY)
  ctx.lineTo(214, sigY)
  ctx.stroke()
  ctx.font = '400 11px Arial'
  ctx.fillStyle = '#5b6b80'
  ctx.textAlign = 'left'
  ctx.fillText('Authorised signatory', 60, sigY + 16)
  drawEmblem(ctx, 240, sigY - 6, 16)

  // Barcode-style unique record id, bottom-right
  ctx.save()
  ctx.translate(w - 72, sigY - 16)
  let seed = 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  let x = -110
  while (x < 0) {
    const bw = 1 + Math.floor(rnd() * 2)
    if (rnd() > 0.4) {
      ctx.fillStyle = '#12305c'
      ctx.fillRect(x, 0, bw, 20)
    }
    x += bw + 1
  }
  ctx.restore()
  ctx.font = '400 10px "Courier New", monospace'
  ctx.fillStyle = '#5b6b80'
  ctx.textAlign = 'right'
  ctx.fillText(`REC-${dateLabel.replace(/\s/g, '').toUpperCase()}`, w - 52, sigY + 24)
}

// Fixed (not random) sparkle layout -- deterministic so the reveal looks
// identical every time rather than jittering between plays, same spirit
// as the seeded starfield/barcode noise already used in drawBadge.
const SPARKLE_POSITIONS = [
  { left: '10%', top: '18%', delay: '0s', icon: '✦' },
  { left: '85%', top: '12%', delay: '0.3s', icon: '✧' },
  { left: '92%', top: '55%', delay: '0.6s', icon: '✦' },
  { left: '6%', top: '62%', delay: '0.9s', icon: '✧' },
  { left: '78%', top: '85%', delay: '0.2s', icon: '✦' },
  { left: '18%', top: '88%', delay: '0.5s', icon: '✧' },
]

/**
 * badge: either
 *   - a normal badge:   { id, title, subtitle, icon, meta? }
 *   - a CHOICE badge:   { id, isChoice: true, prompt, options: [{ id, title, subtitle, icon }, ...] }
 *     Renders a selection screen first ("pick the title that fits you");
 *     once the player taps one, it behaves exactly like a normal badge
 *     from there on (canvas preview + name field + Share/Skip).
 * badge.meta: optional { level, levelTitle, trustPercent, coins } -- real
 *          session data rendered as ledger rows on the passbook. Rows for
 *          missing fields are simply omitted, so this is safe to leave
 *          off entirely for badges that don't have this data yet.
 * defaultName: player's saved profile name, pre-fills the field
 * onClose: called when the player dismisses the badge (Skip, at either
 *          stage, or after publishing) -- GamePage advances its badge
 *          queue on this.
 * onPublished: optional (badgeId, name) => void, fired once a share/
 *          download actually goes through -- lets the caller log
 *          telemetry without this component knowing about that system.
 */
export default function BadgeModal({ badge, defaultName, onClose, onPublished }) {
  const canvasRef = useRef(null)
  const [name, setName] = useState(defaultName || 'Player')
  const [status, setStatus] = useState('idle') // 'idle' | 'publishing' | 'published' | 'error'
  // For choice badges: which option the player picked, or null while
  // they're still looking at the selection grid.
  const [selectedOption, setSelectedOption] = useState(null)

  const dateLabel = useState(() =>
    new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  )[0]

  // The badge actually being previewed/published right now -- either the
  // badge itself, or (for a choice badge) whichever option was tapped.
  const resolvedBadge = badge?.isChoice ? selectedOption : badge
  const isAwaitingChoice = !!badge?.isChoice && !selectedOption

  useEffect(() => {
    if (!canvasRef.current || !resolvedBadge) return
    const meta = resolvedBadge.meta || {}
    drawBadge(canvasRef.current, {
      title: resolvedBadge.title,
      subtitle: resolvedBadge.subtitle,
      icon: resolvedBadge.icon,
      name: name.trim() || 'Player',
      dateLabel,
      level: meta.level,
      levelTitle: meta.levelTitle,
      trustPercent: meta.trustPercent,
      coins: meta.coins,
    })
  }, [resolvedBadge, name, dateLabel])

  // A fresh choice badge arriving (badge.id changed) should always start
  // back on the selection grid, not carry over a previous pick.
  useEffect(() => {
    setSelectedOption(null)
  }, [badge?.id])

  const getBlob = () =>
    new Promise((resolve) => canvasRef.current.toBlob((blob) => resolve(blob), 'image/png'))

  const handlePublish = async () => {
    if (!resolvedBadge) return
    setStatus('publishing')
    try {
      const blob = await getBlob()
      if (!blob) throw new Error('canvas export failed')

      const fileName = `moneyverse-badge-${resolvedBadge.id}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      // Real native share sheet when the browser supports sharing files
      // (most mobile browsers) -- this IS the "publish, shareable" ask.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: resolvedBadge.title,
          text: `${name.trim() || 'I'} just earned "${resolvedBadge.title}" in MoneyVerse! 🏅`,
        })
        setStatus('published')
        onPublished?.(resolvedBadge.id, name.trim() || 'Player')
        return
      }

      // Fallback: trigger a real download so "publish" always produces an
      // actual shareable file even without the Web Share API.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setStatus('published')
      onPublished?.(resolvedBadge.id, name.trim() || 'Player')
    } catch (err) {
      // AbortError just means the player closed the native share sheet --
      // not a real failure, don't show an error state for it.
      if (err?.name === 'AbortError') {
        setStatus('idle')
        return
      }
      console.warn('[BadgeModal] publish failed:', err)
      setStatus('error')
    }
  }

  // Stage 1 of a choice badge: pick which title fits, before anything is
  // drawn/shared. "Skip" here bails out of the badge entirely (same as
  // skipping a normal badge), it does NOT skip just the selection step.
  if (isAwaitingChoice) {
    return (
      <div className="badge-modal-overlay" role="dialog" aria-modal="true">
        <div className="badge-modal-burst" aria-hidden="true" />
        <div className="badge-modal-rays" aria-hidden="true" />
        {SPARKLE_POSITIONS.map((s, i) => (
          <span
            key={i}
            className="badge-modal-sparkle"
            aria-hidden="true"
            style={{ left: s.left, top: s.top, animationDelay: s.delay }}
          >
            {s.icon}
          </span>
        ))}
        <div className="badge-modal badge-modal--choice badge-modal--reveal">
          <button className="badge-modal-close" onClick={onClose} aria-label="Close">✕</button>

          <div className="badge-modal-ribbon">
            <span>🎉 Achievement unlocked</span>
          </div>
          <h3 className="badge-choice-prompt">{badge.prompt || 'Choose your title'}</h3>

          <div className="badge-choice-grid">
            {badge.options.map((opt) => (
              <button
                key={opt.id}
                className="badge-choice-card"
                onClick={() => setSelectedOption(opt)}
              >
                <span className="badge-choice-icon">{opt.icon}</span>
                <span className="badge-choice-text">
                  <span className="badge-choice-title">{opt.title}</span>
                  <span className="badge-choice-subtitle">{opt.subtitle}</span>
                </span>
              </button>
            ))}
          </div>

          <button className="badge-modal-skip-btn" onClick={onClose}>
            Skip
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="badge-modal-overlay" role="dialog" aria-modal="true">
      <div className="badge-modal-burst" aria-hidden="true" />
      <div className="badge-modal-rays" aria-hidden="true" />
      {SPARKLE_POSITIONS.map((s, i) => (
        <span
          key={i}
          className="badge-modal-sparkle"
          aria-hidden="true"
          style={{ left: s.left, top: s.top, animationDelay: s.delay }}
        >
          {s.icon}
        </span>
      ))}

      <div className="badge-modal badge-modal--reveal">
        <button className="badge-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="badge-modal-ribbon">
          <span>🏆 Achievement unlocked</span>
        </div>

        <div className="badge-modal-canvas-frame">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="badge-modal-canvas"
          />
        </div>

        <label className="badge-modal-label" htmlFor="badge-name-input">
          Name on your badge
        </label>
        <input
          id="badge-name-input"
          className="badge-modal-input"
          type="text"
          value={name}
          maxLength={28}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />

        <div className="badge-modal-actions">
          <button
            className="badge-modal-publish-btn"
            onClick={handlePublish}
            disabled={status === 'publishing'}
          >
            {status === 'publishing' ? 'Preparing…' : status === 'published' ? '✓ Shared — Publish Again' : '📤 Publish & Share'}
          </button>
          <button className="badge-modal-skip-btn" onClick={onClose}>
            Skip
          </button>
        </div>

        {status === 'error' && (
          <p className="badge-modal-error">Couldn't share that just now — try again in a moment.</p>
        )}
      </div>
    </div>
  )
}