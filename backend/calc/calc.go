package calc

import (
	"errors"
	"math"
)

var (
	ErrDivisionByZero = errors.New("division by zero")
	ErrNegativeSqrt   = errors.New("square root of a negative number")
	ErrNonFinite      = errors.New("result is not a finite number")
)

type Operation struct {
	// Unary operations only use a.
	Unary bool
	apply func(a, b float64) (float64, error)
}

// Apply runs the operation and rejects results that JSON can't represent.
func (o Operation) Apply(a, b float64) (float64, error) {
	r, err := o.apply(a, b)
	if err != nil {
		return 0, err
	}
	if math.IsInf(r, 0) || math.IsNaN(r) {
		return 0, ErrNonFinite
	}
	return r, nil
}

var Operations = map[string]Operation{
	"add":      {apply: func(a, b float64) (float64, error) { return a + b, nil }},
	"subtract": {apply: func(a, b float64) (float64, error) { return a - b, nil }},
	"multiply": {apply: func(a, b float64) (float64, error) { return a * b, nil }},
	"divide": {apply: func(a, b float64) (float64, error) {
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		return a / b, nil
	}},
	"power": {apply: func(a, b float64) (float64, error) { return math.Pow(a, b), nil }},
	"sqrt": {Unary: true, apply: func(a, _ float64) (float64, error) {
		if a < 0 {
			return 0, ErrNegativeSqrt
		}
		return math.Sqrt(a), nil
	}},
	"percentage": {Unary: true, apply: func(a, _ float64) (float64, error) { return a / 100, nil }},
}
