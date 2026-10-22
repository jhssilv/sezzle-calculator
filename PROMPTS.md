# Prompt

The prompt used to build this project with Claude Code:

> Build a calculator for a take-home assignment: React + TypeScript frontend, Go REST backend. Follow YAGNI and KISS. Only comment what the code doesn't already say. Keep docs short and plain.
>
> ## Repository
>
> Create a public GitHub repo `sezzle-calculator` with `gh` and clone it into `../`. Commit as you go, push to `main` and make sure CI passes.
>
> ## Backend (Go, standard library only)
>
> - `POST /api/v1/calculate` with `{"operation", "a", "b"}`, returning `{"result"}` or `{"error"}`.
> - Operations:
>   - add, subtract, multiply, divide, power
>   - sqrt and percentage, which are unary (`a / 100`)
> - Keep the operations in one registry, separate from the HTTP layer.
> - Errors:
>   - 400 for invalid input: bad JSON, unknown operation, missing operand. A missing operand is not the same as 0.
>   - 422 for math errors: division by zero, sqrt of a negative number, non-finite results.
>   - 405 for the wrong method.
> - In production the server also serves the built frontend, so no CORS is needed.
>
> ## Frontend (Vite, React, TypeScript, plain CSS)
>
> - A keypad calculator that works like a physical one: no operator precedence, each step is one API call.
> - Keys: digits, decimal point, ±, C, backspace, + − × ÷, power, √, %, =.
> - Keep the keypad logic in a pure reducer and the API calls in one module.
> - Validate input: one decimal point, a digit limit, keys disabled while a request is pending. Show API errors on the display.
> - After `=`, show the calculation above the result (`12 + 3 =`). Pressing `=` again repeats it.
> - Keyboard support for digits, operators, Enter, Backspace and Escape.
> - Above the calculator, show a short tutorial with the keyboard shortcuts and a link to the GitHub repo.
> - Design: a dark purple background with a faint grid and a soft glow, a card with a light glowing border, and the logo's gradients used only as accents (operators and `=`). Add a few CSS animations that respect `prefers-reduced-motion`. It must work on mobile.
> - Add a matching SVG favicon.
>
> ## Tests
>
> - Unit tests for both layers: the operations, the HTTP handler and its status codes, the reducer, the API client, and the main UI flows.
> - Report coverage for both layers.
>
> ## Delivery
>
> - A multi-stage `Dockerfile` that runs frontend and backend in one container.
> - A GitHub Actions workflow that runs the backend and frontend tests and builds the Docker image.
> - A `README.md` with setup, how to run, API examples with curl, and the design decisions and assumptions.
> - A `PROMPTS.md` containing this prompt.
