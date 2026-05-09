import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom doesn't ship Web Audio. The typing-sound player constructs an
// AudioContext on first keystroke; without this stub, integration tests that
// drive the round explode on the first call. Real audio is exercised manually
// in the browser.
//
// Strategy: any property access on a stubbed audio node returns either a
// nested no-op proxy (so chained `.frequency.setValueAtTime(...)` works) or
// a no-op function. This survives future Web Audio API additions without
// edits here.
const audioProxyHandler: ProxyHandler<object> = {
  get(_target, prop) {
    if (prop === 'value') return 0
    if (prop === 'currentTime') return 0
    if (prop === 'type') return 'sine'
    if (prop === 'state') return 'running'
    return new Proxy(() => makeAudioStub(), audioProxyHandler)
  },
}
function makeAudioStub() {
  return new Proxy({}, audioProxyHandler)
}

class StubAudioContext {
  state = 'running'
  destination = makeAudioStub()
  currentTime = 0
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    return makeAudioStub()
  }
  createGain() {
    return makeAudioStub()
  }
  createBiquadFilter() {
    return makeAudioStub()
  }
}

vi.stubGlobal('AudioContext', StubAudioContext)

afterEach(() => {
  cleanup()
})
