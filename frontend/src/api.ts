export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
export type UnaryOperation = 'sqrt' | 'percentage'
export type Operation = BinaryOperation | UnaryOperation

export async function calculate(operation: Operation, a: number, b?: number, signal?: AbortSignal): Promise<number> {
  let res: Response
  try {
    res = await fetch('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, a, b }),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new Error('Network error')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok || typeof data.result !== 'number') {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data.result
}
