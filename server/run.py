import os
import uvicorn
from app.config import settings

if __name__ == "__main__":
    host = os.environ.get("HOST", settings.HOST)
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True if settings.ENV.lower() == "development" else False,
    )
