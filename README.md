# Sezzle Calculator

A keypad calculator. The React + TypeScript frontend sends each step to a Go REST API.

## Run with Docker

```sh
make docker-run
```

Open http://localhost:8080.

## Run locally

Requires Go 1.25+ and Node 22.12+.

```sh
make install
make backend   # API on :8080
make frontend  # in another terminal, on :5173, proxies /api to :8080
```

`make build` builds the frontend into `frontend/dist` and the server into `bin/server`. Run `STATIC_DIR=frontend/dist bin/server` to serve both on :8080.

## Tests

```sh
make test      # or: make coverage
```

Coverage is 100% for `calc` and `api` in the backend and for the frontend source (`main.go` and `main.tsx` only wire things up and aren't tested).

## API

`POST /api/v1/calculate` with `{"operation", "a", "b"}`. Returns `{"result": number}` or `{"error": string}`.

| Operation | Operands | Result |
|---|---|---|
| `add`, `subtract`, `multiply`, `divide`, `power` | `a`, `b` | `a op b` |
| `sqrt` | `a` | `√a` |
| `percentage` | `a` | `a / 100` |

| Status | When |
|---|---|
| 200 | Success |
| 400 | Bad JSON, unknown operation, missing operand |
| 405 | Method other than POST |
| 422 | Division by zero, square root of a negative number, non-finite result |

```sh
curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"add","a":12,"b":3}'
# {"result":15}

curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"sqrt","a":81}'
# {"result":9}

curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"divide","a":1,"b":0}'
# 422 {"error":"division by zero"}

curl -X POST localhost:8080/api/v1/calculate -d '{"operation":"add","a":1}'
# 400 {"error":"missing operand: b"}
```

## Design decisions

- **Backend layout.** `calc` holds the operation registry, a map from name to function. `api` handles HTTP and maps errors to status codes. Adding an operation means adding one map entry.
- **Missing vs. zero.** Operands decode into `*float64`, so `{"a": 1}` is a 400 while `{"a": 1, "b": 0}` is valid.
- **Non-finite results.** JSON can't represent `Inf` or `NaN`, so results like `0 ^ -1` or `10 ^ 400` return 422.
- **Unary operations ignore `b`** instead of rejecting it.
- **One container.** The Go server serves the built frontend from `STATIC_DIR`, so there is no CORS. In development, Vite proxies `/api`.
- **Pure reducer.** `calculator.ts` holds all keypad logic. When a step needs the API, the reducer stores a `request` in state. `App` sends it and dispatches the result or error back. This keeps the reducer testable without mocks and means keys are ignored while a request is pending.
- **Physical calculator behavior.** No operator precedence: `2 + 3 × 4 =` is `20`. Pressing an operator after a second operand sends the pending step. The display is the source of truth, so the next step uses the rounded value shown.
- **Repeat `=`.** After `12 + 3 =`, pressing `=` again sends `15 + 3`.
- **Unary keys** (`√`, `%`) apply to the number on the display. With a pending operator, the result becomes the second operand: `10 + 9 √ =` is `13`.
- **Input limits.** 12 digits per entry, one decimal point. Results are rounded to 12 significant digits and shown in exponent form from 10¹².
- **Errors** are shown on the display. The next digit starts over; `C` clears.

## Assumptions

- `percentage` is `a / 100` and does not depend on the other operand, as specified.
- `±` and backspace edit the current entry locally. They are not calculation steps, so they don't call the API.
