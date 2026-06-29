"""
CivicGrid — Users API (Auth + Civic Trust Score)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase import Client
from app.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/users", tags=["Users"])


class UserRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "citizen"  # citizen | resolver


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    civic_trust_score: int
    created_at: str


class GoogleLoginRequest(BaseModel):
    google_token: str
    role: Optional[str] = "citizen"


@router.post("/google")
async def google_login(body: GoogleLoginRequest, db: Client = Depends(get_db)):
    import httpx
    # 1. Verify token with Google API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={body.google_token}",
                timeout=10.0
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Google OAuth token."
                )
            payload = resp.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to authenticate with Google: {str(e)}"
        )

    email = payload.get("email")
    full_name = payload.get("name", "Google User")
    picture = payload.get("picture")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not provide an email."
        )

    # 2. Check if user already exists
    existing = db.table("users").select("*").eq("email", email).execute()
    
    if existing.data:
        user = existing.data[0]
        # Update user's avatar if they didn't have one and we got one from Google
        if not user.get("avatar_url") and picture:
            db.table("users").update({"avatar_url": picture}).eq("id", user["id"]).execute()
            user["avatar_url"] = picture
    else:
        # Create a new user
        user_data = {
            "email": email,
            "full_name": full_name,
            "password_hash": None,  # Nullable password hash for Google Auth users
            "role": body.role if body.role in ("citizen", "resolver") else "citizen",
            "civic_trust_score": 0,
            "avatar_url": picture
        }
        resp = db.table("users").insert(user_data).execute()
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register user via Google Sign-In."
            )
        user = resp.data[0]

    # 3. Generate access token
    token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "civic_trust_score": user["civic_trust_score"],
            "avatar_url": user.get("avatar_url"),
        },
    }


@router.post("/register", status_code=201)
async def register(body: UserRegisterRequest, db: Client = Depends(get_db)):
    # Check email uniqueness
    existing = db.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user_data = {
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": get_password_hash(body.password),
        "role": body.role if body.role in ("citizen", "resolver") else "citizen",
        "civic_trust_score": 0,
    }
    resp = db.table("users").insert(user_data).execute()
    user = resp.data[0]

    token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Client = Depends(get_db),
):
    resp = db.table("users").select("*").eq("email", form_data.username).execute()
    user = resp.data[0] if resp.data else None
    if not user or not user.get("password_hash") or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "civic_trust_score": user["civic_trust_score"],
        },
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "data": current_user}


@router.get("/me/issues")
async def get_my_issues(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Citizen's issue timeline — all reported and co-reported issues."""
    reported = (
        db.table("issues")
        .select("id, title, category, status, severity_level, created_at, media_urls")
        .eq("reporter_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    co_reported_links = (
        db.table("issue_co_reporters")
        .select("issue_id, reported_at")
        .eq("user_id", current_user["id"])
        .execute()
    )

    return {
        "success": True,
        "data": {
            "reported": reported.data or [],
            "co_reported_issue_ids": [
                r["issue_id"] for r in (co_reported_links.data or [])
            ],
            "civic_trust_score": current_user.get("civic_trust_score", 0),
        },
    }
