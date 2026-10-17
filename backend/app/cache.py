import time


class TTLCache:
    """Remembers values for a limited time (TTL = time to live)."""

    def __init__(self, ttl_seconds):
        self.ttl = ttl_seconds
        self._items = {}  # key -> (value, expires_at)

    def get(self, key):
        """Return the value if it's still fresh, otherwise None."""
        entry = self._items.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        return value if time.monotonic() < expires_at else None

    def get_stale(self, key):
        """Return the value even if it has expired (the last known good one)."""
        entry = self._items.get(key)
        return entry[0] if entry else None

    def set(self, key, value):
        self._items[key] = (value, time.monotonic() + self.ttl)