from clipper.speech import Word, clean_word, is_hallucination
from clipper.subtitles import (TextLayout, ass_color, ass_time, build_ass, chunk_words, drawable,
                               fit_line, has_arabic)


def words(*items):
    return [Word(text, start, end) for text, start, end in items]


def test_words_group_into_short_captions_and_break_on_pauses():
    spoken = words(("do", 0.0, 0.2), ("we", 0.2, 0.4), ("know", 0.4, 0.7), ("where", 0.7, 1.0),
                   ("he", 2.5, 2.7), ("is", 2.7, 2.9))
    chunks = chunk_words(spoken, max_words=3, max_chars=16)
    assert [c.text for c in chunks] == ["do we know", "where", "he is"]
    assert chunks[0].start == 0.0 and chunks[0].end == 0.7  # ends where the next one starts
    assert chunks[1].end == 1.3  # held briefly after a pause
    assert chunks[2].start == 2.5


def test_long_words_get_their_own_caption():
    spoken = words(("extraordinarily", 0, 1), ("big", 1, 1.2), ("win", 1.2, 1.4))
    assert [c.text for c in chunk_words(spoken, 3, 16)] == ["extraordinarily", "big win"]


def test_ass_helpers():
    assert ass_time(0) == "0:00:00.00"
    assert ass_time(83.456) == "0:01:23.46"
    assert ass_time(3723.5) == "1:02:03.50"
    assert ass_color("#FF4FD8") == "&H00D84FFF"  # ASS wants blue-green-red
    assert ass_color("#102030", alpha=128) == "&H80302010"


def test_script_support_matches_the_bundled_fonts():
    assert drawable("Waylay Ace 5k — clutch!") and drawable("آه والله احتمال") and drawable("GTA 6 يا")
    assert not drawable("汗耐久") and not drawable("สวัสดี") and not drawable("")
    assert has_arabic("يا man") and not has_arabic("hello")


def test_each_word_is_highlighted_in_turn_including_arabic():
    layout = TextLayout(1080, 1920, caption_y=1348, caption_size=118, highlight="#FF4FD8")
    chunk = chunk_words(words(("آه", 3.9, 4.1), ("والله", 4.1, 4.4), ("احتمال", 4.4, 4.7)))
    ass = build_ass(layout, chunk)
    captions = [line for line in ass.splitlines() if ",Caption," in line]
    assert len(captions) == 3  # one event per spoken word
    assert "0:00:03.90,0:00:04.10" in captions[0] and "0:00:04.10,0:00:04.40" in captions[1]
    assert "{\\1c&H00D84FFF}والله{\\1c&H00FFFFFF}" in captions[1]
    assert captions[1].endswith("آه {\\1c&H00D84FFF}والله{\\1c&H00FFFFFF} احتمال")  # logical order
    assert "\\pos(540,1348)" in captions[0]
    assert "\\t(0,90" in captions[0] and "\\t(" not in captions[1]  # pops in once per caption
    assert "Style: Caption,Cairo Black,118," in ass and ",-1\n" in ass  # auto text direction


def test_label_and_title_only_appear_when_given_a_position():
    hidden = build_ass(TextLayout(1080, 1920, 1348, 118), [], label="GTA 6", title="Nice one")
    assert ",Label," not in hidden and ",Title," not in hidden
    layout = TextLayout(1080, 1920, 1348, 118, label_y=235, title_y=363, glow="#FF3D9A")
    shown = build_ass(layout, [], label="GTA 6", title="Nice one", duration=20)
    assert shown.count(",Label,") == 2  # glow layer + sharp layer
    assert "GTA 6" in shown and "Nice one" in shown and "0:00:21.00" in shown
    undrawable = build_ass(layout, [], title="汗耐久")
    assert ",Title," not in undrawable


def test_text_that_could_break_the_subtitle_file_is_neutralised():
    layout = TextLayout(1080, 1920, 1348, 118)
    ass = build_ass(layout, chunk_words(words(("{\\an8}hi", 0, 1))))
    assert "{\\an8}hi" not in ass and "an8hi" in ass


def test_overlong_lines_shrink_then_shorten():
    text, size = fit_line("short", "Cairo-Bold.ttf", 60, 970, 40)
    assert (text, size) == ("short", 60)
    text, size = fit_line("word " * 40, "Cairo-Bold.ttf", 60, 970, 40)
    assert size == 40 and text.endswith("…") and len(text) < 120


def test_spoken_words_are_cleaned():
    assert clean_word(" Hello,") == "Hello"
    assert clean_word(" اييييييييييييي!") == "اييي"  # stretched shouts are squashed
    assert clean_word("كمّل") == "كمل"  # diacritics dropped
    assert clean_word(" ؟") == "" and clean_word("{x}") == "x"


def test_known_whisper_hallucinations_are_recognised():
    assert is_hallucination("Thanks for watching!") and is_hallucination("ترجمة نانسي قنقر")
    assert not is_hallucination("he's in the buffalo")
