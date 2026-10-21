from download import quarter_files

BASE = "https://download.open.fda.gov/animalandveterinary/event"


def test_selects_quarters_from_since_onwards_oldest_first():
    index = {"results": {"animalandveterinary": {"event": {"partitions": [
        {"file": f"{BASE}/2024q1/animalandveterinary-event-0001-of-0001.json.zip"},
        {"file": f"{BASE}/2022q4/animalandveterinary-event-0001-of-0001.json.zip"},
        {"file": f"{BASE}/2023q1/animalandveterinary-event-0001-of-0001.json.zip"},
        {"file": f"{BASE}/all_other/animalandveterinary-event-0001-of-0001.json.zip"},
    ]}}}}
    assert [q for q, _ in quarter_files(index, "2023q1")] == ["2023q1", "2024q1"]
