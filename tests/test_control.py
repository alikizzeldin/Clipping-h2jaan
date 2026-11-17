import json

import pytest
import requests

from clipper import cli
from clipper.control import ControlError, pull


class FakeResponse:
    def __init__(self, payload=None, status=200, content=None):
        self.status_code = status
        self.content = content if content is not None else json.dumps(payload).encode()

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code}")

    def json(self):
        return json.loads(self.content)


def answering(payload=None, **kwargs):
    calls = []

    def get(url, **options):
        calls.append(url)
        return FakeResponse(payload, **kwargs)

    get.calls = calls
    return get


DOC = {
    "settings": {"paused": True, "max_per_day": 4},
    "rules": {"manual": [{"id": "m1", "kind": "channel", "target": "sxb", "factor": 2}], "dismissed": [], "disabled": []},
    "request": None,
}


def test_pull_writes_both_files_and_reports_changes(tmp_path):
    get = answering(DOC)
    assert pull("https://dash.example/", tmp_path / "control", get=get) == ["settings", "rules"]
    assert get.calls == ["https://dash.example/api/control"]
    assert json.loads((tmp_path / "control" / "settings.json").read_text()) == DOC["settings"]
    assert json.loads((tmp_path / "control" / "rules.json").read_text()) == DOC["rules"]


def test_pull_twice_changes_nothing_the_second_time(tmp_path):
    pull("https://dash.example", tmp_path, get=answering(DOC))
    assert pull("https://dash.example", tmp_path, get=answering(DOC)) == []


def test_pull_reports_only_the_part_that_changed(tmp_path):
    pull("https://dash.example", tmp_path, get=answering(DOC))
    newer = {**DOC, "settings": {"paused": False}}
    assert pull("https://dash.example", tmp_path, get=answering(newer)) == ["settings"]


@pytest.mark.parametrize("payload", [[], {"settings": {}}, {"settings": [], "rules": {}}, {"settings": {}, "rules": "x"}])
def test_pull_refuses_an_answer_of_the_wrong_shape_and_keeps_the_files(tmp_path, payload):
    (tmp_path / "settings.json").write_text('{"paused": true}\n')
    with pytest.raises(ControlError):
        pull("https://dash.example", tmp_path, get=answering(payload))
    assert json.loads((tmp_path / "settings.json").read_text()) == {"paused": True}


def test_pull_refuses_errors_non_json_and_oversized_answers(tmp_path):
    with pytest.raises(ControlError):
        pull("https://dash.example", tmp_path, get=answering(DOC, status=503))
    with pytest.raises(ControlError):
        pull("https://dash.example", tmp_path, get=answering(content=b"<html>down</html>"))
    with pytest.raises(ControlError):
        pull("https://dash.example", tmp_path, get=answering(content=b" " * 400_000))

    def unreachable(url, **options):
        raise requests.ConnectionError("no route")

    with pytest.raises(ControlError):
        pull("https://dash.example", tmp_path, get=unreachable)
    assert list(tmp_path.iterdir()) == []


def test_the_command_never_fails_a_run(tmp_path, monkeypatch):
    config = tmp_path / "config.yaml"
    config.write_text(f"dashboard_url: https://dash.example\ncontrol_dir: {tmp_path / 'control'}\n")

    def broken(url, control_dir):
        raise ControlError("could not reach the dashboard")

    monkeypatch.setattr(cli, "pull_control", broken)
    assert cli.main(["--config", str(config), "pull-control"]) == 0

    seen = {}
    monkeypatch.setattr(cli, "pull_control", lambda url, control_dir: seen.update(url=url, dir=control_dir) or ["settings"])
    assert cli.main(["--config", str(config), "pull-control"]) == 0
    assert seen == {"url": "https://dash.example", "dir": str(tmp_path / "control")}


def test_the_command_does_nothing_without_a_dashboard(tmp_path, monkeypatch):
    config = tmp_path / "config.yaml"
    config.write_text("profile: gta6\n")
    monkeypatch.delenv("CLIPPER_DASHBOARD", raising=False)
    monkeypatch.setattr(cli, "pull_control", lambda *a: pytest.fail("should not be called"))
    assert cli.main(["--config", str(config), "pull-control"]) == 0
