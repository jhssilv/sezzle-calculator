import type { BinaryOperation, Operation, UnaryOperation } from './api'

export const MAX_DIGITS = 12

export const SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
}

// A step waiting for the API. `next` is the operator pressed to trigger it, if any.
export interface Request {
  operation: Operation
  a: number
  b?: number
  next?: BinaryOperation
}

export interface State {
  display: string
  expression: string
  acc: number | null
  operator: BinaryOperation | null
  // typing: digits append. result: display is a value, digits replace it.
  // awaiting: an operator was just pressed, the display still shows its left operand.
  entry: 'typing' | 'result' | 'awaiting'
  // The last `=` step, so pressing `=` again repeats it.
  repeat: { operator: BinaryOperation; b: number } | null
  request: Request | null
  error: boolean
}

export type Action =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'negate' }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'unary'; operation: UnaryOperation }
  | { type: 'equals' }
  | { type: 'result'; value: number }
  | { type: 'failure'; message: string }

export const initialState: State = {
  display: '0',
  expression: '',
  acc: null,
  operator: null,
  entry: 'typing',
  repeat: null,
  request: null,
  error: false,
}

export function format(n: number): string {
  const rounded = Number(n.toPrecision(12))
  return Math.abs(rounded) >= 1e12 ? rounded.toExponential() : String(rounded)
}

const countDigits = (s: string) => s.replace(/\D/g, '').length

function startEntry(state: State, display: string): State {
  const next = { ...state, display, entry: 'typing' as const }
  return state.operator ? next : { ...next, expression: '', repeat: null }
}

export function reducer(state: State, action: Action): State {
  if (action.type === 'result') return state.request ? applyResult(state, state.request, action.value) : state
  if (action.type === 'failure') return state.request ? { ...initialState, display: action.message, error: true } : state
  if (state.request) return state
  if (action.type === 'clear') return initialState
  if (state.error) {
    return action.type === 'digit' || action.type === 'decimal' ? reducer(initialState, action) : state
  }

  const { display } = state
  switch (action.type) {
    case 'digit':
      if (state.entry !== 'typing') return startEntry(state, action.digit)
      if (countDigits(display) >= MAX_DIGITS) return state
      return { ...state, display: display === '0' ? action.digit : display + action.digit }

    case 'decimal':
      if (state.entry !== 'typing') return startEntry(state, '0.')
      return display.includes('.') ? state : { ...state, display: display + '.' }

    case 'negate':
      if (Number(display) === 0) return state
      return {
        ...state,
        display: display.startsWith('-') ? display.slice(1) : '-' + display,
        entry: state.entry === 'awaiting' ? 'result' : state.entry,
      }

    case 'backspace': {
      if (state.entry !== 'typing') return state
      const next = display.slice(0, -1)
      return { ...state, display: next === '' || next === '-' || next === '-0' ? '0' : next }
    }

    case 'operator':
      if (state.operator && state.entry !== 'awaiting') {
        return { ...state, request: { operation: state.operator, a: state.acc!, b: Number(display), next: action.operator } }
      }
      return {
        ...state,
        acc: Number(display),
        operator: action.operator,
        entry: 'awaiting',
        expression: `${display} ${SYMBOLS[action.operator]}`,
        repeat: null,
      }

    case 'unary':
      return { ...state, request: { operation: action.operation, a: Number(display) } }

    case 'equals':
      if (state.operator) return { ...state, request: { operation: state.operator, a: state.acc!, b: Number(display) } }
      if (state.repeat) return { ...state, request: { operation: state.repeat.operator, a: Number(display), b: state.repeat.b } }
      return state
  }
}

function applyResult(state: State, req: Request, value: number): State {
  const display = format(value)
  const done = { ...state, display, request: null, entry: 'result' as const }

  if (req.next) {
    return { ...done, acc: Number(display), operator: req.next, entry: 'awaiting', expression: `${display} ${SYMBOLS[req.next]}` }
  }
  if (req.operation === 'sqrt' || req.operation === 'percentage') {
    if (state.operator) return done
    const label = req.operation === 'sqrt' ? `√(${format(req.a)})` : `${format(req.a)}%`
    return { ...done, expression: `${label} =`, repeat: null }
  }
  return {
    ...done,
    acc: null,
    operator: null,
    repeat: { operator: req.operation, b: req.b! },
    expression: `${format(req.a)} ${SYMBOLS[req.operation]} ${format(req.b!)} =`,
  }
}
