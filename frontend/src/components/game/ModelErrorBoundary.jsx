import { Component } from 'react'

/**
 * Wraps a single R3F model-loading subtree. React Suspense catches a
 * component SUSPENDING (still loading) but NOT a component throwing a
 * real error (e.g. a 404 on the model URL, a malformed FBX, a CDN
 * timeout) — that needs an actual error boundary, which must be a class
 * component; there's no hook equivalent.
 *
 * Renders `null` either way (a broken 3D model has no good inline
 * fallback), but now with a console.error carrying the label you pass
 * in — so "NPC isn't where the map says" becomes a one-line lookup
 * instead of a silent, undebuggable gap in the world.
 */
export default class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error(`[ModelErrorBoundary] Failed to load "${this.props.label || 'unknown model'}":`, error)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}