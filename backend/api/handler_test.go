package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		body       string
		wantStatus int
		wantResult *float64
		wantError  string
	}{
		{"add", "POST", `{"operation":"add","a":12,"b":3}`, 200, ptr(15), ""},
		{"zero operand", "POST", `{"operation":"multiply","a":7,"b":0}`, 200, ptr(0), ""},
		{"unary ignores b", "POST", `{"operation":"sqrt","a":16,"b":99}`, 200, ptr(4), ""},
		{"unary without b", "POST", `{"operation":"percentage","a":25}`, 200, ptr(0.25), ""},
		{"wrong method", "GET", "", 405, nil, "method not allowed"},
		{"bad JSON", "POST", `{"operation":`, 400, nil, "invalid JSON body"},
		{"wrong type", "POST", `{"operation":"add","a":"1","b":2}`, 400, nil, "invalid JSON body"},
		{"too large", "POST", `{"operation":"add","a":1,"b":2,"x":"` + strings.Repeat("x", 2000) + `"}`, 400, nil, "invalid JSON body"},
		{"unknown operation", "POST", `{"operation":"modulo","a":1,"b":2}`, 400, nil, "unknown operation: modulo"},
		{"missing a", "POST", `{"operation":"add","b":2}`, 400, nil, "missing operand: a"},
		{"missing b", "POST", `{"operation":"add","a":2}`, 400, nil, "missing operand: b"},
		{"null b", "POST", `{"operation":"add","a":2,"b":null}`, 400, nil, "missing operand: b"},
		{"unary missing a", "POST", `{"operation":"sqrt"}`, 400, nil, "missing operand: a"},
		{"division by zero", "POST", `{"operation":"divide","a":1,"b":0}`, 422, nil, "division by zero"},
		{"negative sqrt", "POST", `{"operation":"sqrt","a":-1}`, 422, nil, "square root of a negative number"},
		{"non-finite", "POST", `{"operation":"power","a":10,"b":400}`, 422, nil, "result is not a finite number"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/v1/calculate", strings.NewReader(tt.body))
			rec := httptest.NewRecorder()
			Calculate(rec, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q", ct)
			}
			var got response
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if got.Error != tt.wantError {
				t.Errorf("error = %q, want %q", got.Error, tt.wantError)
			}
			if (got.Result == nil) != (tt.wantResult == nil) || (got.Result != nil && *got.Result != *tt.wantResult) {
				t.Errorf("result = %v, want %v", deref(got.Result), deref(tt.wantResult))
			}
		})
	}
}

func TestCalculateZeroResultIsSent(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/calculate", strings.NewReader(`{"operation":"subtract","a":3,"b":3}`))
	rec := httptest.NewRecorder()
	Calculate(rec, req)
	if body := strings.TrimSpace(rec.Body.String()); body != `{"result":0}` {
		t.Errorf("body = %s", body)
	}
}

func TestMethodNotAllowedSetsAllow(t *testing.T) {
	rec := httptest.NewRecorder()
	Calculate(rec, httptest.NewRequest("PUT", "/api/v1/calculate", nil))
	if got := rec.Header().Get("Allow"); got != http.MethodPost {
		t.Errorf("Allow = %q", got)
	}
}

func ptr(f float64) *float64 { return &f }

func deref(f *float64) any {
	if f == nil {
		return nil
	}
	return *f
}
