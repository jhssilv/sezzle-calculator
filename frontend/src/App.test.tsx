import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

type Body = { operation: string; a: number; b?: number }

const ops: Record<string, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
  power: (a, b) => a ** b,
  sqrt: (a) => Math.sqrt(a),
  percentage: (a) => a / 100,
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const { operation, a, b = 0 } = JSON.parse(init.body as string) as Body
    if (operation === 'divide' && b === 0) {
      return new Response(JSON.stringify({ error: 'division by zero' }), { status: 422 })
    }
    return new Response(JSON.stringify({ result: ops[operation](a, b) }))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const display = () => screen.getByTestId('display')
const expression = () => screen.getByTestId('expression')

async function click(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) {
    const button = screen.getByRole('button', { name })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
  }
}

describe('App', () => {
  it('shows the tutorial and repo link', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      'https://github.com/jhssilv/sezzle-calculator',
    )
    expect(screen.getByText('Esc')).toBeInTheDocument()
  })

  it('calculates with the keypad and repeats on =', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '1', '2', 'Add', '3', 'Equals')
    await waitFor(() => expect(display()).toHaveTextContent('15'))
    expect(expression()).toHaveTextContent('12 + 3 =')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ operation: 'add', a: 12, b: 3 })

    await click(user, 'Equals')
    await waitFor(() => expect(display()).toHaveTextContent('18'))
    expect(expression()).toHaveTextContent('15 + 3 =')
  })

  it('makes one API call per step', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '2', 'Add', '3', 'Multiply', '4', 'Equals')
    await waitFor(() => expect(display()).toHaveTextContent('20'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('runs unary operations', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '8', '1', 'Square root')
    await waitFor(() => expect(display()).toHaveTextContent('9'))
    expect(expression()).toHaveTextContent('√(81) =')
  })

  it('shows API errors on the display', async () => {
    const user = userEvent.setup()
    render(<App />)
    await click(user, '1', 'Divide', '0', 'Equals')
    await waitFor(() => expect(display()).toHaveTextContent('division by zero'))
    await click(user, 'Clear')
    expect(display()).toHaveTextContent('0')
  })

  it('disables the keys while a request is pending', async () => {
    let resolve!: (r: Response) => void
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolve = r)))
    const user = userEvent.setup()
    render(<App />)
    await click(user, '4', 'Add', '4', 'Equals')

    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    await user.keyboard('7')
    resolve(new Response(JSON.stringify({ result: 8 })))
    await waitFor(() => expect(display()).toHaveTextContent('8'))
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled()
  })

  it('supports the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('2^5')
    expect(display()).toHaveTextContent('5')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(display()).toHaveTextContent('32'))

    await user.keyboard('12{Backspace}')
    expect(display()).toHaveTextContent('1')
    await user.keyboard('{Escape}')
    expect(display()).toHaveTextContent('0')
    expect(expression()).toBeEmptyDOMElement()
  })

  it.each([
    ['9-4=', '5'],
    ['3*2=', '6'],
    ['1,5x2=', '3'],
    ['8/4=', '2'],
    ['1.5+1=', '2.5'],
    ['50%', '0.5'],
  ])('maps the keys %s', async (keys, result) => {
    const user = userEvent.setup()
    render(<App />)
    for (const key of keys) {
      await user.keyboard(key)
      await waitFor(() => expect(screen.getByRole('button', { name: '7' })).toBeEnabled())
    }
    expect(display()).toHaveTextContent(result)
  })

  it('ignores shortcuts with modifier keys', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{Control>}5{/Control}q')
    expect(display()).toHaveTextContent('0')
  })
})
