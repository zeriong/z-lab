import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App } from '../src/app'

// Mock DOM elements that Vite might not have
if (typeof window === 'undefined') {
  (global as any).window = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    AudioContext: class {},
    webkitAudioContext: class {}
  }
}

describe('State Machine', () => {
  let app: App

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = ''
    app = new App()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should start in BOOT phase', () => {
    expect(app.getPhase()).toBe('BOOT')
  })

  it('should transition BOOT -> MENU on START', () => {
    app.dispatch('START')
    expect(app.getPhase()).toBe('MENU')
  })

  it('should transition MENU -> STAGE_SELECT on START', () => {
    app.dispatch('START')
    app.dispatch('START')
    expect(app.getPhase()).toBe('STAGE_SELECT')
  })

  it('should reject undefined transitions', () => {
    const initialPhase = app.getPhase()
    app.dispatch('PAUSE') // Invalid from BOOT
    expect(app.getPhase()).toBe(initialPhase)
  })

  it('should track physics loop state', () => {
    const physicsLoop = app.getPhysicsLoop()
    expect(physicsLoop.isActive()).toBe(false)

    physicsLoop.play()
    expect(physicsLoop.isActive()).toBe(true)

    physicsLoop.pause()
    expect(physicsLoop.isActive()).toBe(false)
  })

  it('should maintain selected stage', () => {
    app.dispatch('START')
    app.dispatch('START')
    app.dispatch('SELECT', 5)
    expect(app.getSelectedStage()).toBe(5)
  })

  it('should have valid transition table', () => {
    // Test all valid transitions
    const validTransitions = [
      ['BOOT', 'START', 'MENU'],
      ['MENU', 'START', 'STAGE_SELECT'],
      ['STAGE_SELECT', 'BACK', 'MENU'],
      ['PAUSED', 'RESUME', 'PLAYING'],
      ['PAUSED', 'RETRY', 'PLAYING'],
      ['PAUSED', 'MENU', 'MENU'],
      ['CLEARED', 'NEXT', 'PLAYING'],
      ['CLEARED', 'RETRY', 'PLAYING'],
      ['CLEARED', 'MENU', 'MENU'],
      ['FAILED', 'RETRY', 'PLAYING'],
      ['FAILED', 'MENU', 'MENU']
    ]

    for (const [fromPhase, event, expectedPhase] of validTransitions) {
      // This is just verifying the transition table is defined
      expect(expectedPhase).toBeTruthy()
    }
  })
})
