set shell := ["powershell", "-Command"]

alias i := install
alias b := backend
alias f := frontend

default:
    just --list

install:
    uv sync

backend:
    cd backend ; uv run fastapi dev main.py

frontend:
    pnpm dev
