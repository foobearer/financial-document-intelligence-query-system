.PHONY: setup run-streamlit run-api test

setup:
	pip install -r requirements.txt

run-streamlit:
	streamlit run streamlit_app/app.py

run-api:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v --cov=src

all: setup
