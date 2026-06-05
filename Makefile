.PHONY: setup run-api run-frontend test

setup:
	pip install -r requirements.txt

run-api:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && npm install && npm run dev

test:
	pytest tests/ -v --cov=src

all: setup
