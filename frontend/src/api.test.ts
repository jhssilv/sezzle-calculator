import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate } from './api'

function mockFetch(impl: typeof fetch) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const sentBody = (fn: ReturnType<typeof mockFetch>) => JSON.parse(fn.mock.calls[0][1]!.body as string)

const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calculate', () => {
  it('posts the operation and returns the result', async () => {
    const fetch = mockFetch(() => json(200, { result: 15 }))
    await expect(calculate('add', 12, 3)).resolves.toBe(15)
    expect(fetch).toHaveBeenCalledWith('/api/v1/calculate', expect.objectContaining({ method: 'POST' }))
    expect(sentBody(fetch)).toEqual({ operation: 'add', a: 12, b: 3 })
  })

  it('omits b for unary operations', async () => {
    const fetch = mockFetch(() => json(200, { result: 3 }))
    await calculate('sqrt', 9)
    expect(sentBody(fetch)).toEqual({ operation: 'sqrt', a: 9 })
  })

  it('throws the API error message', async () => {
    mockFetch(() => json(422, { error: 'division by zero' }))
    await expect(calculate('divide', 1, 0)).rejects.toThrow('division by zero')
  })

  it('throws a generic error for a non-JSON response', async () => {
    mockFetch(() => Promise.resolve(new Response('Bad Gateway', { status: 502 })))
    await expect(calculate('add', 1, 2)).rejects.toThrow('Request failed (502)')
  })

  it('throws a network error when fetch fails', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(calculate('add', 1, 2)).rejects.toThrow('Network error')
  })

  it('rethrows aborts as they are', async () => {
    const controller = new AbortController()
    controller.abort()
    const abort = new DOMException('aborted', 'AbortError')
    mockFetch(() => Promise.reject(abort))
    await expect(calculate('add', 1, 2, controller.signal)).rejects.toBe(abort)
  })
})
