package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/jhssilv/sezzle-calculator/backend/calc"
)

type request struct {
	Operation string `json:"operation"`
	// Pointers tell a missing operand apart from 0.
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

type response struct {
	Result *float64 `json:"result,omitempty"`
	Error  string   `json:"error,omitempty"`
}

func Calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req request
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10))
	// The second Decode rejects trailing data after the JSON object.
	if err := dec.Decode(&req); err != nil || dec.Decode(&struct{}{}) != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	op, ok := calc.Operations[req.Operation]
	if !ok {
		writeError(w, http.StatusBadRequest, "unknown operation: "+req.Operation)
		return
	}
	if req.A == nil {
		writeError(w, http.StatusBadRequest, "missing operand: a")
		return
	}
	var b float64
	if !op.Unary {
		if req.B == nil {
			writeError(w, http.StatusBadRequest, "missing operand: b")
			return
		}
		b = *req.B
	}

	result, err := op.Apply(*req.A, b)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, response{Result: &result})
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, response{Error: msg})
}

func writeJSON(w http.ResponseWriter, status int, body response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}
