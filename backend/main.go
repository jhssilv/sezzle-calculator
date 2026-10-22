package main

import (
	"log"
	"net/http"
	"os"

	"github.com/jhssilv/sezzle-calculator/backend/api"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/calculate", api.Calculate)
	if dir := os.Getenv("STATIC_DIR"); dir != "" {
		mux.Handle("/", http.FileServer(http.Dir(dir)))
	}

	addr := ":" + envOr("PORT", "8080")
	log.Printf("listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
