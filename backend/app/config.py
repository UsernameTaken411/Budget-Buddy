from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    frontend_origin: str = "http://localhost:5173"
    azure_ai_foundry_endpoint: str = ""
    azure_ai_foundry_api_key: str = ""
    azure_ai_foundry_model_deployment: str = Field(
        default="",
        validation_alias=AliasChoices(
            "AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT",
            "AZURE_AI_FOUNDRY_DEPLOYMENT",
        ),
    )

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    @property
    def is_azure_ai_configured(self) -> bool:
        return bool(
            self.azure_ai_foundry_endpoint
            and self.azure_ai_foundry_api_key
            and self.azure_ai_foundry_model_deployment
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
