import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Ticketflow AI Service",
    version="1.0.0",
    description="AI microservice for venue layout generation and admin chat assistant",
)

from routes.layout import router as layout_router
from routes.chat import router as chat_router

app.include_router(layout_router)
app.include_router(chat_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ticketflow-ai"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8100"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
