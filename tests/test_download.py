from clipper.download import Segment, best_variant, download, merge_ranges, parse_media_playlist

BASE = "https://clips.kick.com/clips/4f/clip_x/playlist.m3u8"
PLAYLIST = """#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:2
#EXT-X-BYTERANGE:100@500
#EXTINF:2.000,
2463.ts
#EXT-X-BYTERANGE:50@600
#EXTINF:2.000,
2463.ts
#EXT-X-BYTERANGE:70@0
#EXTINF:2.000,
2464.ts
#EXT-X-BYTERANGE:30
#EXTINF:2.000,
2464.ts
#EXT-X-ENDLIST
"""


def test_byte_ranges_are_parsed_and_resolved():
    init, segs = parse_media_playlist(PLAYLIST, BASE)
    assert init is None
    assert [(s.url.rsplit("/", 1)[1], s.offset, s.length) for s in segs] == [
        ("2463.ts", 500, 100), ("2463.ts", 600, 50), ("2464.ts", 0, 70), ("2464.ts", 70, 30),
    ]
    assert segs[0].url == "https://clips.kick.com/clips/4f/clip_x/2463.ts"


def test_contiguous_ranges_merge_into_one_request():
    _, segs = parse_media_playlist(PLAYLIST, BASE)
    merged = merge_ranges(segs)
    assert [(s.offset, s.length) for s in merged] == [(500, 150), (0, 100)]
    gap = [Segment("a", 0, 10), Segment("a", 20, 10)]
    assert merge_ranges(gap) == gap


def test_master_playlist_picks_highest_bitrate():
    master = (
        "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nlow/index.m3u8\n"
        "#EXT-X-STREAM-INF:BANDWIDTH=6000000\nhigh/index.m3u8\n"
    )
    assert best_variant(master, BASE).endswith("/high/index.m3u8")
    assert best_variant(PLAYLIST, BASE) is None


class FakeResponse:
    def __init__(self, status, content=b"", text=""):
        self.status_code, self.content, self.text = status, content, text


class FakeSession:
    """Serves two 1000-byte files and honours Range headers."""

    def __init__(self):
        self.headers = {}
        self.files = {"2463.ts": bytes(range(250)) * 4, "2464.ts": bytes(reversed(range(250))) * 4}
        self.requests = []

    def get(self, url, headers=None, timeout=None, **_):
        if url.endswith(".m3u8"):
            return FakeResponse(200, text=PLAYLIST)
        data = self.files[url.rsplit("/", 1)[1]]
        rng = (headers or {}).get("Range")
        self.requests.append(rng)
        start, end = (int(x) for x in rng.removeprefix("bytes=").split("-"))
        return FakeResponse(206, content=data[start : end + 1])


def test_download_stitches_the_ranges_in_order(tmp_path):
    session = FakeSession()
    path = download(BASE, tmp_path, "clip_x", session)
    expected = session.files["2463.ts"][500:650] + session.files["2464.ts"][0:100]
    assert path.read_bytes() == expected
    assert session.requests == ["bytes=500-649", "bytes=0-99"]
