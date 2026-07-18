from pydantic import BaseModel


class AdminContactOut(BaseModel):
    name: str
    email: str
