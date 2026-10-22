.PHONY: install backend frontend test coverage build docker docker-run

IMAGE := sezzle-calculator

install:
	cd frontend && npm ci

# Run backend and frontend in separate terminals.
backend:
	cd backend && go run .

frontend:
	cd frontend && npm run dev

test:
	cd backend && go test ./...
	cd frontend && npm test

coverage:
	cd backend && go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out -o coverage.html
	cd frontend && npm run coverage

build:
	cd frontend && npm run build
	cd backend && go build -o ../bin/server .

docker:
	docker build -t $(IMAGE) .

docker-run: docker
	docker run --rm -p 8080:8080 $(IMAGE)
