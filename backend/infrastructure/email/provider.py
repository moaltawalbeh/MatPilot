"""Email abstraction.

Providers are transport implementations of :class:`IEmailProvider`. Services
construct :class:`EmailMessage` objects and hand them to a provider; they do
not care whether delivery happens via SMTP, a provider API, or the console.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class EmailMessage:
    """A single outbound email."""

    to: str
    subject: str
    text: str
    html: Optional[str] = None


class IEmailProvider(ABC):
    """Delivers :class:`EmailMessage` objects."""

    @abstractmethod
    async def send(self, message: EmailMessage) -> None:
        """Deliver ``message``. Raise on delivery failure."""
        raise NotImplementedError
