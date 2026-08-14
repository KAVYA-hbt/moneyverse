import { useEffect, useRef, useState } from 'react'
import './BadgeModal.css'

// Canvas is drawn at 2x for crisp export/share images, then scaled down
// via CSS for on-screen display -- this is the actual published asset,
// not a DOM screenshot, so it shares/downloads reliably on every browser.
const CANVAS_SIZE = 640

function drawBadge(canvas, { title, subtitle, icon, name, dateLabel }) {
  const ctx = canvas.getContext('2d')
  const w = CANVAS_SIZE
  const h = CANVAS_SIZE
  ctx.clearRect(0, 0, w, h)

  // Background card
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#150a2e')
  bg.addColorStop(0.55, '#26123f')
  bg.addColorStop(1, '#3a1a52')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, w, h, 28)
  ctx.fill()

  // Subtle border
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)'
  ctx.lineWidth = 3
  roundRect(ctx, 6, 6, w - 12, h - 12, 24)
  ctx.stroke()

  // Starfield speckle
  const starSeed = 42
  let rnd = starSeed
  const nextRnd = () => {
    rnd = (rnd * 9301 + 49297) % 233280
    return rnd / 233280
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 70; i++) {
    const x = nextRnd() * w
    const y = nextRnd() * (h * 0.4)
    const r = nextRnd() * 1.4 + 0.3
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Medallion ring
  const cx = w / 2
  const cy = h * 0.34
  const ringOuter = 130
  const ringGrad = ctx.createLinearGradient(cx - ringOuter, cy - ringOuter, cx + ringOuter, cy + ringOuter)
  ringGrad.addColorStop(0, '#fde68a')
  ringGrad.addColorStop(0.5, '#eab308')
  ringGrad.addColorStop(1, '#b45309')
  ctx.beginPath()
  ctx.arc(cx, cy, ringOuter, 0, Math.PI * 2)
  ctx.fillStyle = ringGrad
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, ringOuter - 10, 0, Math.PI * 2)
  ctx.fillStyle = '#1c0f33'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, ringOuter - 18, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Icon/emoji in the medallion
  ctx.font = '110px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon || '🏅', cx, cy + 6)

  // MONEYVERSE wordmark
  ctx.font = '700 22px Sora, sans-serif'
  ctx.fillStyle = 'rgba(226, 232, 240, 0.8)'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '4px'
  ctx.fillText('M O N E Y V E R S E', cx, h * 0.52)
  ctx.letterSpacing = '0px'

  // Title
  ctx.font = '700 40px Sora, sans-serif'
  ctx.fillStyle = '#fef08a'
  wrapText(ctx, title, cx, h * 0.6, w - 120, 46)

  // Subtitle
  ctx.font = '500 22px Sora, sans-serif'
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)'
  wrapText(ctx, subtitle, cx, h * 0.7, w - 160, 30)

  // Divider
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - 90, h * 0.8)
  ctx.lineTo(cx + 90, h * 0.8)
  ctx.stroke()

  // Player name (the whole point of the template)
  ctx.font = '700 34px Sora, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name || 'Player', cx, h * 0.87)

  // Date
  ctx.font = '400 17px Sora, sans-serif'
  ctx.fillStyle = 'rgba(226, 232, 240, 0.6)'
  ctx.fillText(dateLabel, cx, h * 0.93)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
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

  const startY = y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight))
}

/**
 * badge: either
 *   - a normal badge:   { id, title, subtitle, icon }
 *   - a CHOICE badge:   { id, isChoice: true, prompt, options: [{ id, title, subtitle, icon }, ...] }
 *     Renders a selection screen first ("pick the title that fits you");
 *     once the player taps one, it behaves exactly like a normal badge
 *     from there on (canvas preview + name field + Share/Skip).
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
    drawBadge(canvasRef.current, {
      title: resolvedBadge.title,
      subtitle: resolvedBadge.subtitle,
      icon: resolvedBadge.icon,
      name: name.trim() || 'Player',
      dateLabel,
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
        <div className="badge-modal badge-modal--choice">
          <button className="badge-modal-close" onClick={onClose} aria-label="Close">✕</button>

          <p className="badge-modal-eyebrow">🎉 Achievement Unlocked</p>
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
      <div className="badge-modal">
        <button className="badge-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <p className="badge-modal-eyebrow">🎉 Achievement Unlocked</p>

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="badge-modal-canvas"
        />

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