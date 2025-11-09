from pydantic import BaseModel, field_validator
from typing import Any

class UserCreate(BaseModel):
    username: str
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        # Check password byte length
        if len(v.encode()) > 72:
            raise ValueError('Password too long - must be less than 72 bytes when encoded')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
