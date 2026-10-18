// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdleReset } from './use-idle-reset.ts'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useIdleReset', () => {
  it('calls onIdle after the quiet period, and a tap restarts the wait', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleReset(true, onIdle, 1000))
    vi.advanceTimersByTime(900)
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(900)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(onIdle).toHaveBeenCalledOnce()
  })

  it('does nothing while inactive, and stops when unmounted', () => {
    const onIdle = vi.fn()
    const { rerender, unmount } = renderHook(({ active }) => useIdleReset(active, onIdle, 1000), {
      initialProps: { active: false },
    })
    vi.advanceTimersByTime(5000)
    expect(onIdle).not.toHaveBeenCalled()
    rerender({ active: true })
    unmount()
    vi.advanceTimersByTime(5000)
    expect(onIdle).not.toHaveBeenCalled()
  })
})
