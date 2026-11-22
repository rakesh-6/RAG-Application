"""SQLAlchemy models.

Import every model class here, so that Base.metadata knows about all tables
when main.py creates them at startup.
"""

from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.user import User

__all__ = ["Conversation", "Document", "Message", "User"]
