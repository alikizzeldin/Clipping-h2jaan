import pytest

from clipper.buffer import API_URL, Buffer, BufferError, BufferLimit


class Resp:
    def __init__(self, body, status=200):
        self._body, self.status_code = body, status

    def json(self):
        if self._body is None:
            raise ValueError("no json")
        return self._body


class FakeSession:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []

    def post(self, url, headers=None, json=None, timeout=None):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return self.responses.pop(0)


def created(kind="PostActionSuccess", **extra):
    return Resp({"data": {"createPost": {"__typename": kind, **extra}}})


def publish(session):
    client = Buffer("key123", "chan1", session=session)
    return client.publish_video("https://host/clip.mp4", title="T", description="D", privacy="public")


def test_publish_sends_one_share_now_request_with_youtube_settings():
    session = FakeSession(created(post={"id": "post9", "status": "sending"}))
    assert publish(session) == "post9"
    (call,) = session.calls
    assert call["url"] == API_URL and call["headers"] == {"Authorization": "Bearer key123"}
    sent = call["json"]["variables"]["input"]
    assert sent["channelId"] == "chan1" and sent["mode"] == "shareNow" and sent["text"] == "D"
    assert sent["assets"] == [{"video": {"url": "https://host/clip.mp4"}}]
    assert sent["metadata"]["youtube"] == {
        "title": "T", "categoryId": "20", "privacy": "public", "madeForKids": False,
    }
    assert "saveToDraft" not in sent


def test_buffer_refusals_carry_its_message():
    session = FakeSession(created("InvalidInputError", message="Video must be vertical"))
    with pytest.raises(BufferError, match="Video must be vertical") as err:
        publish(session)
    assert not isinstance(err.value, BufferLimit)


@pytest.mark.parametrize("response", [
    created("LimitReachedError", message="queue full"),
    Resp({}, status=429),
])
def test_limits_are_told_apart_so_the_run_can_stop(response):
    with pytest.raises(BufferLimit):
        publish(FakeSession(response))


@pytest.mark.parametrize("response,match", [
    (Resp({}, status=401), "API key"),
    (Resp({"errors": [{"message": "Cannot query field"}]}), "Cannot query field"),
    (Resp(None, status=502), "502"),
])
def test_transport_and_auth_failures(response, match):
    with pytest.raises(BufferError, match=match):
        publish(FakeSession(response))


def test_post_status_reports_link_or_error():
    client = Buffer("k", "c", session=FakeSession(
        Resp({"data": {"post": {"status": "sent", "externalLink": "https://youtube.com/shorts/x", "error": None}}}),
        Resp({"data": {"post": {"status": "error", "externalLink": None, "error": {"message": "fetch failed"}}}}),
    ))
    assert client.post_status("p") == {"status": "sent", "link": "https://youtube.com/shorts/x", "error": ""}
    assert client.post_status("p") == {"status": "error", "link": "", "error": "fetch failed"}


def test_the_remaining_allowance_is_read_from_buffers_headers():
    from clipper.buffer import Buffer

    client = Buffer("key", "chan")
    client._note_allowance({
        "RateLimit": '"150-in-15min";r=98;t=897, "600-in-1day";r=598;t=86397, "1000-in-30days";r=912;t=696980',
        "RateLimit-Policy": '"150-in-15min";q=150;w=900;pk=:Zj:, "600-in-1day";q=600;w=86400;pk=:Zj:, '
                            '"1000-in-30days";q=1000;w=2592000;pk=:Zj:',
    })
    assert client.remaining == {900: 98, 86400: 598, 2592000: 912}
    client._note_allowance({})  # a response without the headers changes nothing
    assert client.remaining[2592000] == 912
