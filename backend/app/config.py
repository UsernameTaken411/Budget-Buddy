from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    frontend_origin: str = "http://localhost:5173"

    # Azure AI Foundry - the only AI provider for the whole project
    # (used for insights chat now; receipt scanning should call this too
    # once implemented, not a separate OpenAI key).
    azure_ai_foundry_endpoint: str = ""
    azure_ai_foundry_api_key: str = ""
    azure_ai_foundry_deployment: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
