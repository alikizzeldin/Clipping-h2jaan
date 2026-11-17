"""The owner's choices, fetched from the dashboard.

What the owner saves on the dashboard (settings and learning rules) is kept
by the dashboard's server. Before a run the agent copies it into `control/`,
which is where the rest of the code reads it. If the dashboard cannot be
reached, the copies already there are used, so a run never depends on it.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import requests

log = logging.getLogger(__name__)

PARTS = ("settings", "rules")
MAX_BYTES = 300_000


class ControlError(RuntimeError):
    """The dashboard's answer could not be used."""


def pull(url: str, control_dir: str | Path, get=requests.get, timeout: float = 20) -> list[str]:
    """Copy the dashboard's settings and rules into `control_dir`.

    Returns the parts that changed ("settings", "rules"). Every value is
    checked again where it is used; this only makes sure the answer has the
    right shape before it replaces what is on disk.
    """
    try:
        response = get(f"{url.rstrip('/')}/api/control", timeout=timeout, headers={"Accept": "application/json"})
        response.raise_for_status()
        if len(response.content) > MAX_BYTES:
            raise ControlError("the dashboard's answer is too large")
        doc = response.json()
    except requests.RequestException as exc:
        raise ControlError(f"could not reach the dashboard: {exc}") from exc
    except ValueError as exc:
        raise ControlError("the dashboard did not answer with JSON") from exc
    if not isinstance(doc, dict) or any(not isinstance(doc.get(part), dict) for part in PARTS):
        raise ControlError("the dashboard's answer is missing settings or rules")

    folder = Path(control_dir)
    folder.mkdir(parents=True, exist_ok=True)
    changed = []
    for part in PARTS:
        text = json.dumps(doc[part], indent=1, ensure_ascii=False, sort_keys=True) + "\n"
        path = folder / f"{part}.json"
        if not path.exists() or path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8")
            changed.append(part)
    return changed
