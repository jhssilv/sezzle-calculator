import { describe, expect, it } from 'vitest'
import { type Action, type State, format, initialState, MAX_DIGITS, reducer } from './calculator'

// Stands in for the API so the tests can step through whole calculations.
function compute({ operation, a, b = 0 }: NonNullable<State['request']>): number {
  switch (operation) {
    case 'add': return a + b
    case 'subtract': return a - b
    case 'multiply': return a * b
    case 'divide': return a / b
    case 'power': return a ** b
    case 'sqrt': return Math.sqrt(a)
    case 'percentage': return a / 100
  }
}

// Keys: digits, '.', '±', 'C', '<', '+', '-', '*', '/', '^', '√', '%', '='.
function press(keys: string, state = initialState): State {
  const actions: Record<string, Action> = {
    '.': { type: 'decimal' },
    '±': { type: 'negate' },
    C: { type: 'clear' },
    '<': { type: 'backspace' },
    '+': { type: 'operator', operator: 'add' },
    '-': { type: 'operator', operator: 'subtract' },
    '*': { type: 'operator', operator: 'multiply' },
    '/': { type: 'operator', operator: 'divide' },
    '^': { type: 'operator', operator: 'power' },
    '√': { type: 'unary', operation: 'sqrt' },
    '%': { type: 'unary', operation: 'percentage' },
    '=': { type: 'equals' },
  }
  for (const k of keys.replace(/ /g, '')) {
    state = reducer(state, /\d/.test(k) ? { type: 'digit', digit: k } : actions[k])
    if (state.request) state = reducer(state, { type: 'result', value: compute(state.request) })
  }
  return state
}

describe('entry', () => {
  it('replaces the leading zero', () => {
    expect(press('007').display).toBe('7')
  })

  it('allows one decimal point', () => {
    expect(press('1.2.3').display).toBe('1.23')
    expect(press('.5').display).toBe('0.5')
  })

  it('limits the number of digits', () => {
    expect(press('9'.repeat(MAX_DIGITS + 3)).display).toBe('9'.repeat(MAX_DIGITS))
    expect(press('1.' + '2'.repeat(MAX_DIGITS)).display).toBe('1.' + '2'.repeat(MAX_DIGITS - 1))
  })

  it('toggles the sign, but not of zero', () => {
    expect(press('5±').display).toBe('-5')
    expect(press('5±±').display).toBe('5')
    expect(press('±').display).toBe('0')
  })

  it('deletes the last character', () => {
    expect(press('123<').display).toBe('12')
    expect(press('1<<').display).toBe('0')
    expect(press('5±<').display).toBe('0')
    expect(press('0.±<').display).toBe('0')
  })

  it('does not delete a result', () => {
    expect(press('2+3=<').display).toBe('5')
  })

  it('clears everything', () => {
    expect(press('2+3=C')).toEqual(initialState)
  })
})

describe('operations', () => {
  it('shows the calculation after =', () => {
    const s = press('12+3=')
    expect(s.display).toBe('15')
    expect(s.expression).toBe('12 + 3 =')
  })

  it('shows the pending operator', () => {
    expect(press('12×'.replace('×', '*')).expression).toBe('12 ×')
  })

  it('evaluates left to right, without precedence', () => {
    const s = press('2+3*4=')
    expect(s.display).toBe('20')
    expect(s.expression).toBe('5 × 4 =')
  })

  it('sends a step when chaining operators', () => {
    let s = press('2+3')
    s = reducer(s, { type: 'operator', operator: 'multiply' })
    expect(s.request).toEqual({ operation: 'add', a: 2, b: 3, next: 'multiply' })
  })

  it('replaces an operator pressed twice', () => {
    const s = press('8+-')
    expect(s.expression).toBe('8 −')
    expect(press('8+-2=').display).toBe('6')
  })

  it('repeats the last step on =', () => {
    const s = press('2+3===')
    expect(s.display).toBe('11')
    expect(s.expression).toBe('8 + 3 =')
  })

  it('uses the left operand when = follows an operator', () => {
    expect(press('5*=').display).toBe('25')
  })

  it('ignores = with nothing to do', () => {
    expect(press('5=')).toEqual(press('5'))
  })

  it('starts a new calculation when typing after =', () => {
    const s = press('2+3=7')
    expect(s.display).toBe('7')
    expect(s.expression).toBe('')
    expect(press('2+3=7=').display).toBe('7')
    expect(press('2+3=.').display).toBe('0.')
  })

  it('continues from the result with an operator', () => {
    expect(press('2+3=*2=').display).toBe('10')
  })

  it('handles power', () => {
    expect(press('2^10=').display).toBe('1024')
  })

  it('applies unary operations to the display', () => {
    const s = press('81√')
    expect(s.display).toBe('9')
    expect(s.expression).toBe('√(81) =')
    expect(press('50%').expression).toBe('50% =')
    expect(press('50%').display).toBe('0.5')
  })

  it('uses a unary result as the second operand', () => {
    const s = press('10+9√')
    expect(s.expression).toBe('10 +')
    expect(press('10+9√=').display).toBe('13')
    expect(press('10+9√4=').display).toBe('14')
  })

  it('negates the left operand as a new entry', () => {
    expect(press('5+±=').display).toBe('0')
  })

  it('rounds floating point noise', () => {
    expect(press('.1+.2=').display).toBe('0.3')
  })
})

describe('requests', () => {
  it('ignores keys while a request is pending', () => {
    const s = reducer(press('2+3'), { type: 'equals' })
    expect(reducer(s, { type: 'digit', digit: '9' })).toBe(s)
    expect(reducer(s, { type: 'clear' })).toBe(s)
  })

  it('ignores responses without a request', () => {
    expect(reducer(initialState, { type: 'result', value: 1 })).toBe(initialState)
    expect(reducer(initialState, { type: 'failure', message: 'x' })).toBe(initialState)
  })

  it('shows errors and recovers on the next number', () => {
    let s = reducer(press('1/0'), { type: 'equals' })
    s = reducer(s, { type: 'failure', message: 'division by zero' })
    expect(s).toMatchObject({ display: 'division by zero', error: true, request: null })
    expect(reducer(s, { type: 'operator', operator: 'add' })).toBe(s)
    expect(reducer(s, { type: 'backspace' })).toBe(s)
    expect(press('4', s)).toMatchObject({ display: '4', error: false })
    expect(press('C', s)).toEqual(initialState)
  })
})

describe('format', () => {
  it('trims to 12 significant digits', () => {
    expect(format(1 / 3)).toBe('0.333333333333')
    expect(format(2 ** 60)).toBe('1.15292150461e+18')
    expect(format(-0)).toBe('0')
  })
})
