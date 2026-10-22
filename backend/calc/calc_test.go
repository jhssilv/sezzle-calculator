package calc

import (
	"errors"
	"math"
	"testing"
)

func TestOperations(t *testing.T) {
	tests := []struct {
		op   string
		a, b float64
		want float64
	}{
		{"add", 2, 3, 5},
		{"add", -1.5, 0.5, -1},
		{"subtract", 2, 3, -1},
		{"multiply", -4, 2.5, -10},
		{"divide", 9, 4, 2.25},
		{"divide", 0, 5, 0},
		{"power", 2, 10, 1024},
		{"power", 4, 0.5, 2},
		{"power", 2, -1, 0.5},
		{"sqrt", 81, 0, 9},
		{"sqrt", 0, 0, 0},
		{"percentage", 50, 0, 0.5},
		{"percentage", -12.5, 0, -0.125},
	}
	for _, tt := range tests {
		got, err := Operations[tt.op].Apply(tt.a, tt.b)
		if err != nil {
			t.Errorf("%s(%v, %v): unexpected error %v", tt.op, tt.a, tt.b, err)
		} else if got != tt.want {
			t.Errorf("%s(%v, %v) = %v, want %v", tt.op, tt.a, tt.b, got, tt.want)
		}
	}
}

func TestOperationErrors(t *testing.T) {
	tests := []struct {
		op   string
		a, b float64
		want error
	}{
		{"divide", 1, 0, ErrDivisionByZero},
		{"divide", 0, 0, ErrDivisionByZero},
		{"sqrt", -4, 0, ErrNegativeSqrt},
		{"power", 0, -1, ErrNonFinite},
		{"power", -8, 1.0 / 3, ErrNonFinite},
		{"power", 10, 400, ErrNonFinite},
		{"multiply", math.MaxFloat64, 2, ErrNonFinite},
		{"add", math.MaxFloat64, math.MaxFloat64, ErrNonFinite},
	}
	for _, tt := range tests {
		_, err := Operations[tt.op].Apply(tt.a, tt.b)
		if !errors.Is(err, tt.want) {
			t.Errorf("%s(%v, %v): error %v, want %v", tt.op, tt.a, tt.b, err, tt.want)
		}
	}
}

func TestUnary(t *testing.T) {
	for name, op := range Operations {
		want := name == "sqrt" || name == "percentage"
		if op.Unary != want {
			t.Errorf("%s: Unary = %v, want %v", name, op.Unary, want)
		}
	}
}
