from typing import Annotated

from fastapi import Depends, Header, HTTPException, status


def get_access_token(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Supabase access token is required.",
        )
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid access token.")
    return token


AccessToken = Annotated[str, Depends(get_access_token)]
