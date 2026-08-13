import { useState, useEffect } from 'react'
import './LoadingScreen.css'

const LOADING_TIPS = [
  'Every quest you finish is proof the city can trust you.',
  'Your companion can guide you — check in with it any time you feel stuck.',
  'Trust grows from helping people, not just finishing tasks.',
  'Treasure chests are optional, but worth the detour.',
  'Mini-games get harder the more you play them.',
]

export default function LoadingScreen() {
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % LOADING_TIPS.length)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="ls-overlay">
      <div className="ls-city">
        <div className="ls-building ls-building--1" />
        <div className="ls-building ls-building--2" />
        <div className="ls-building ls-building--3" />
        <div className="ls-building ls-building--4" />
        <div className="ls-building ls-building--5" />
      </div>

      <div className="ls-content">
        <div className="ls-spinner" />
        <p className="ls-label">Building your city...</p>
        <p className="ls-tip">{LOADING_TIPS[tipIndex]}</p>
      </div>
    </div>
  )
}