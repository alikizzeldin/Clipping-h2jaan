import pytest

from clipper.config import Profile, Publish
from clipper.titles import MAX_TITLE, build_metadata, clean_title, is_offensive

PROFILE = Profile(kick_category="valorant", label="Valorant", hashtags=["valorant", "kick"])


@pytest.mark.parametrize("raw", [
    "kkkkkkk", "aa", "a", "dffdefe 2", "grfgrg", "+18", "",
    "atnajtgbawdegtyjahwdegytjdawhseygtbjhn", ",tymdgndnntynty", "sfgdffdgfdhgdhgfdjgf mami",
])
def test_junk_titles_are_dropped(raw):
    assert clean_title(raw) == ""


@pytest.mark.parametrize("raw,expected", [
    ("Waylay Ace 5k", "Waylay Ace 5k"),
    ("1v3", "1v3"),
    ("spike", "spike"),
    ("汗耐久", "汗耐久"),
    ("immo olcam / !insta !rank !donate | Clip", "immo olcam"),
    ("PD gang counter the ATM", "PD gang counter the ATM"),
    ("ENRIK NATYLA PICK ", "Enrik natyla pick"),
    ("no way!!!!!", "no way!"),
    ("<b>clutch</b> round", "bclutch/b round"),
])
def test_real_titles_are_kept_and_tidied(raw, expected):
    assert clean_title(raw) == expected


def test_metadata_credits_the_streamer(make_clip):
    meta = build_metadata(make_clip(clipper_name="viewer1"), PROFILE, Publish(), shorts=True)
    english, arabic = meta["title"].removesuffix(" #shorts").split(" | ")
    assert "Streamer" in english and "Valorant" in english
    assert "Streamer" in arabic and any("\u0600" <= ch <= "\u06ff" for ch in arabic)
    assert meta["title"].endswith(" #shorts") and meta["hook"]
    assert "https://kick.com/streamer" in meta["description"]
    assert "https://kick.com/streamer/clips/clip_1" in meta["description"]
    assert "Clipped by: viewer1" in meta["description"]
    assert "Clip title: Insane 1v5 clutch" in meta["description"]  # the viewer's own title is kept here
    assert "#valorant" in meta["description"] and "#shorts" in meta["description"]
    assert "Valorant" in meta["tags"] and "Streamer" in meta["tags"]


def test_a_junk_viewer_title_is_left_out(make_clip):
    meta = build_metadata(make_clip(title="kkkkkkk"), PROFILE, Publish(), shorts=False)
    assert "kkkkkkk" not in meta["title"] and "kkkkkkk" not in meta["description"]
    assert not meta["title"].endswith("#shorts")


def test_long_names_still_fit_youtube_limit_in_both_languages(make_clip):
    meta = build_metadata(make_clip(channel_name="AVeryVeryLongStreamerNameIndeed_TTV"), PROFILE, Publish(), shorts=True)
    assert len(meta["title"]) <= MAX_TITLE
    assert " | " in meta["title"] and any("\u0600" <= ch <= "\u06ff" for ch in meta["title"])


@pytest.mark.parametrize("title", ["n1gg4", "NIGGA please", "niiiigga", "f4ggot", "n-i-g-g-a", "retarded play"])
def test_slurs_are_caught_through_lookalike_spellings(title):
    assert is_offensive(title)


@pytest.mark.parametrize("title", ["good job unc", "Night raid", "snigger", "raccoon chase", "Nigeria RP",
                                   "bigger heist", "bike ride", "تتت", ""])
def test_ordinary_titles_are_not_flagged(title):
    assert not is_offensive(title)


def test_ten_keywords_and_an_instagram_caption(make_clip):
    from clipper.config import Profile

    gta = Profile(kick_category="gta", label="GTA 6",
                  hashtags=["GTA6", "GTAVI", "GrandTheftAuto6", "GTA6Gameplay", "GTA6Clips", "GTA6Shorts",
                            "ViceCity", "قراند6", "جي_تي_اي_6"])
    meta = build_metadata(make_clip(channel_name="xQc"), gta, Publish(), shorts=True)
    assert len(meta["keywords"]) == 10 and meta["keywords"][-1] == "#xQc" and "#قراند6" in meta["keywords"]
    last = meta["description"].splitlines()[-1].split()
    assert last == [*meta["keywords"], "#shorts"]
    caption = meta["caption"]
    assert caption.splitlines()[0] == meta["title"].removesuffix(" #shorts")  # English | Arabic
    assert "https://kick.com/streamer" in caption and caption.splitlines()[-1] == " ".join(meta["keywords"])
