"""
Middleware de autenticação via API Key.
Header: X-API-Key
Exceção: /health (público)
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings


# Rotas públicas (não requerem autenticação)
PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Valida API Key em todas as rotas exceto as públicas."""

    async def dispatch(self, request: Request, call_next):
        # Rotas públicas passam direto
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        # Verifica API Key
        settings = get_settings()
        api_key = request.headers.get("X-API-Key")

        if not settings.enrichment_api_key:
            # Se não configurou API key, bloqueia tudo (segurança)
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"detail": "API key not configured on server"},
            )

        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-API-Key header",
            )

        if api_key != settings.enrichment_api_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid API key",
            )

        return await call_next(request)
