from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
