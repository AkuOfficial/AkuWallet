from contextlib import asynccontextmanager

import dotenv
import fastapi

dotenv.load_dotenv()
import fastapi.middleware.cors

from database import db, migrate
from routers import auth, transactions, categories, tags, goals, imports, stats, ai, accounts, investments, settings, networth, smart_import, automation_rules


@asynccontextmanager
async def lifespan(_: fastapi.FastAPI):
    async with db() as conn:
        await migrate(conn)
    yield


app = fastapi.FastAPI(lifespan=lifespan)

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(goals.router)
app.include_router(imports.router)
app.include_router(stats.router)
app.include_router(ai.router)
app.include_router(accounts.router)
app.include_router(investments.router)
app.include_router(settings.router)
app.include_router(networth.router)
app.include_router(smart_import.router)
app.include_router(automation_rules.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
