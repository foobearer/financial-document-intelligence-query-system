"""src/utils/logger.py — Structured logging."""
import logging, sys, structlog

def get_logger(name: str):
    logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(message)s")
    structlog.configure(
        processors=[structlog.stdlib.add_log_level, structlog.processors.TimeStamper(fmt="iso"),
                    structlog.dev.ConsoleRenderer() if sys.stdout.isatty() else structlog.processors.JSONRenderer()],
        wrapper_class=structlog.stdlib.BoundLogger, context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
    return structlog.get_logger(name)
