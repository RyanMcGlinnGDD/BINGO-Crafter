import '@testing-library/jest-dom'

// ResizeObserver is not implemented in jsdom; BingoGrid uses it to measure
// container width. The mock is a no-op so containerWidth stays 0, which
// exercises the fallback font-size path rather than the measured path.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})
