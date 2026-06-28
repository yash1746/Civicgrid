"""
CivicGrid — FastAPI Dependency Injection
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import Client
from app.database import get_db
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Client = Depends(get_db),
) -> dict:
    """Decode JWT and fetch user from Supabase."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    response = db.table("users").select("*").eq("id", user_id).single().execute()
    if not response.data:
        raise credentials_exception

    user = response.data
    if not user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


def require_role(*roles: str):
    """Role-based access control dependency factory."""
    def _check(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {list(roles)}",
            )
        return current_user
    return _check


require_citizen = require_role("citizen", "resolver", "admin")
require_resolver = require_role("resolver", "admin")
require_admin = require_role("admin")
