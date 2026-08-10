"""
Centralized logging configuration.

Why not just use `print()`?
    print() cannot be filtered by severity, has no timestamps, can't be
    routed to a file or external monitoring tool (e.g., Datadog, ELK) in
    production, and clutters stdout with no context about WHERE a message
    came from. Python's built-in `logging` module solves all of this and
    is the industry standard.
"""

import logging
import sys

from app.core.config import settings


def configure_logging() -> None:
    """
    Configures the root logger once, at application startup.

    Format explanation:
        %(asctime)s   -> timestamp, essential for debugging production issues
        %(levelname)s -> INFO / WARNING / ERROR, lets us filter noise
        %(name)s      -> which module logged this (e.g., app.services.language_detector)
        %(message)s   -> the actual log message
    """
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
