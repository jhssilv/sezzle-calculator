import { useEffect, useReducer } from 'react'
import { calculate } from './api'
import { type Action, initialState, reducer } from './calculator'

const REPO_URL = 'https://github.com/jhssilv/sezzle-calculator'

interface Key {
  label: string
  action: Action
  name?: string
  className?: string
}

const digit = (d: string): Key => ({ label: d, action: { type: 'digit', digit: d } })

const KEYS: Key[] = [
  { label: 'C', name: 'Clear', action: { type: 'clear' }, className: 'fn' },
  { label: '⌫', name: 'Backspace', action: { type: 'backspace' }, className: 'fn' },
  { label: '±', name: 'Toggle sign', action: { type: 'negate' }, className: 'fn' },
  { label: '÷', name: 'Divide', action: { type: 'operator', operator: 'divide' }, className: 'op' },
  { label: '√', name: 'Square root', action: { type: 'unary', operation: 'sqrt' }, className: 'op' },
  { label: 'xʸ', name: 'Power', action: { type: 'operator', operator: 'power' }, className: 'op' },
  { label: '%', name: 'Percent', action: { type: 'unary', operation: 'percentage' }, className: 'op' },
  { label: '×', name: 'Multiply', action: { type: 'operator', operator: 'multiply' }, className: 'op' },
  digit('7'),
  digit('8'),
  digit('9'),
  { label: '−', name: 'Subtract', action: { type: 'operator', operator: 'subtract' }, className: 'op' },
  digit('4'),
  digit('5'),
  digit('6'),
  { label: '+', name: 'Add', action: { type: 'operator', operator: 'add' }, className: 'op' },
  digit('1'),
  digit('2'),
  digit('3'),
  { label: '=', name: 'Equals', action: { type: 'equals' }, className: 'equals' },
  { ...digit('0'), className: 'zero' },
  { label: '.', name: 'Decimal point', action: { type: 'decimal' } },
]

function keyToAction(key: string): Action | null {
  if (/^\d$/.test(key)) return { type: 'digit', digit: key }
  switch (key) {
    case '.':
    case ',':
      return { type: 'decimal' }
    case '+':
      return { type: 'operator', operator: 'add' }
    case '-':
      return { type: 'operator', operator: 'subtract' }
    case '*':
    case 'x':
      return { type: 'operator', operator: 'multiply' }
    case '/':
      return { type: 'operator', operator: 'divide' }
    case '^':
      return { type: 'operator', operator: 'power' }
    case '%':
      return { type: 'unary', operation: 'percentage' }
    case 'Enter':
    case '=':
      return { type: 'equals' }
    case 'Backspace':
      return { type: 'backspace' }
    case 'Escape':
      return { type: 'clear' }
  }
  return null
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const pending = state.request !== null

  useEffect(() => {
    const req = state.request
    if (!req) return
    const controller = new AbortController()
    calculate(req.operation, req.a, req.b, controller.signal)
      .then((value) => !controller.signal.aborted && dispatch({ type: 'result', value }))
      .catch((err: Error) => !controller.signal.aborted && dispatch({ type: 'failure', message: err.message }))
    return () => controller.abort()
  }, [state.request])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const action = keyToAction(e.key)
      if (!action) return
      // Stops Enter from also clicking a focused key, and `/` from opening Firefox's quick find.
      e.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main>
      <header className="intro">
        <h1>Calculator</h1>
        <p>
          Works like a pocket calculator: no operator precedence, each step is computed by the Go API. Press{' '}
          <kbd>=</kbd> again to repeat the last step.
        </p>
        <ul className="shortcuts">
          <li><kbd>0</kbd>–<kbd>9</kbd> <kbd>.</kbd> digits</li>
          <li><kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> <kbd>^</kbd> <kbd>%</kbd> operators</li>
          <li><kbd>Enter</kbd> equals</li>
          <li><kbd>Backspace</kbd> delete</li>
          <li><kbd>Esc</kbd> clear</li>
        </ul>
        <a href={REPO_URL}>Source on GitHub</a>
      </header>

      <section className="calculator" aria-label="Calculator">
        <output className={`display${pending ? ' pending' : ''}`} aria-live="polite">
          <span className="expression" data-testid="expression">{state.expression}</span>
          <span
            key={state.display}
            className={`value${state.error ? ' error' : ''}${state.display.length > 10 ? ' long' : ''}`}
            data-testid="display"
          >
            {state.display}
          </span>
        </output>
        <div className="keypad">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              className={k.className}
              aria-label={k.name}
              disabled={pending}
              onClick={() => dispatch(k.action)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
