"""Limit failed login attempts, to slow down password guessing.

The counts live in this process's memory. That's enough for one server (like the
free Render instance); several servers would need a shared store such as Redis.
"""

import math
import threading
import time
from collections import deque
from collections.abc import Callable

from app.core.exceptions import TooManyRequestsError

MAX_TRACKED_KEYS = 10_000  # stops someone filling memory with endless made-up emails


class LoginAttemptLimiter:
    def __init__(self, max_failures: int = 5, window_seconds: int = 15 * 60, clock: Callable[[], float] = time.monotonic) -> None:
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._clock = clock
        self._failures: dict[str, deque[float]] = {}
        self._lock = threading.Lock()  # FastAPI runs normal routes in several threads at once

    def _recent_failures(self, key: str, now: float) -> deque[float]:
        failures = self._failures.get(key, deque())
        while failures and now - failures[0] >= self.window_seconds:
            failures.popleft()  # forget failures older than the window
        return failures

    def check(self, key: str) -> None:
        """Raise TooManyRequestsError if this key has failed too often recently."""
        with self._lock:
            now = self._clock()
            failures = self._recent_failures(key, now)
            if len(failures) >= self.max_failures:
                wait_seconds = math.ceil(self.window_seconds - (now - failures[0]))
                minutes = max(1, math.ceil(wait_seconds / 60))
                raise TooManyRequestsError(
                    f"Too many failed login attempts. Try again in {minutes} minute{'s' if minutes > 1 else ''}.",
                    headers={"Retry-After": str(wait_seconds)},
                )

    def record_failure(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            if key not in self._failures and len(self._failures) >= MAX_TRACKED_KEYS:
                self._drop_expired(now)
            failures = self._recent_failures(key, now)
            failures.append(now)
            self._failures[key] = failures

    def reset(self, key: str) -> None:
        """A successful login clears that key's failures."""
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()

    def _drop_expired(self, now: float) -> None:
        for key in list(self._failures):
            if not self._recent_failures(key, now):
                del self._failures[key]
        if len(self._failures) >= MAX_TRACKED_KEYS:  # still full: drop the oldest entries
            oldest_first = sorted(self._failures, key=lambda k: self._failures[k][-1])
            for key in oldest_first[: len(oldest_first) // 2]:
                del self._failures[key]


login_limiter = LoginAttemptLimiter()
