"""Validate the digest archive and assemble the static GitHub Pages site."""
import json
import shutil
from pathlib import Path
import datetime

if __package__:
    from .import_digest import parse_digest
else:
    from import_digest import parse_digest

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
TOPICS = ["Quantum field theory", "Non-equilibrium", "Quantum error correction", "Quantum simulation", "Quantum algorithms", "Exactly solvable models", "Statistical mechanics"]


def load_archive(folder, incoming_folder=None):
    entries = [(filename, json.loads(filename.read_text(encoding="utf-8")))
               for filename in folder.glob("*.json")]
    if incoming_folder is not None:
        entries.extend((filename, parse_digest(filename.read_text(encoding="utf-8-sig")))
                       for filename in incoming_folder.glob("*.md") if filename.name != "README.md")
    by_date = {}
    for filename, day in entries:
        date = day["date"]
        datetime.date.fromisoformat(date)
        if filename.stem != date or day["title"] != f"arXiv-{date}":
            raise ValueError(f"{filename.name}: date/title mismatch")
        papers = day["papers"]
        if len(papers) != 10 or [p["rank"] for p in papers] != list(range(1, 11)):
            raise ValueError(f"{date}: expected ten ranked papers")
        if len({p["id"] for p in papers}) != 10:
            raise ValueError(f"{date}: duplicate paper IDs")
        if sorted(day["reading_order"]) != list(range(1, 11)):
            raise ValueError(f"{date}: invalid reading order")
        for paper in papers:
            import re
            if not re.fullmatch(r"(?:[a-z-]+/\d{7}|\d{4}\.\d{4,5})", paper["id"]):
                raise ValueError(f"{date}: invalid arXiv ID")
            if paper["url"] != f"https://arxiv.org/abs/{paper['id']}":
                raise ValueError(f"{date}: unexpected paper URL")
            for section in ("title", "summary", "background", "why"):
                if not isinstance(paper[section], str) or not paper[section].strip():
                    raise ValueError(f"{date}: missing {section}")
            if any(t not in TOPICS for t in paper["topics"]):
                raise ValueError(f"{date}: unrecognized topic")
        if date in by_date:
            # Preserve reviewed topic tags in existing JSON, but never silently
            # replace a published explanation with a different incoming digest.
            def substantive(entry):
                return {**entry, "papers": [{k: v for k, v in p.items() if k != "topics"}
                                            for p in entry["papers"]]}
            if substantive(by_date[date]) != substantive(day):
                raise ValueError(f"{date}: conflicting digests; the published date is protected")
            continue
        by_date[date] = day
    if not by_date:
        raise ValueError("No digests found")
    return [by_date[date] for date in sorted(by_date, reverse=True)]


def main():
    days = load_archive(ROOT / "content" / "digests", ROOT / "incoming")
    # Validate dependencies before touching a previous build.
    vendors = {
        "marked.umd.js": ROOT / "node_modules/marked/lib/marked.umd.js",
        "katex": ROOT / "node_modules/katex/dist",
    }
    for source in vendors.values():
        if not source.exists():
            raise SystemExit(f"Missing {source.name}; run npm ci first")
    DIST.mkdir(exist_ok=True)
    for source in (ROOT / "site").iterdir():
        if source.is_file():
            shutil.copy2(source, DIST / source.name)
    vendor = DIST / "vendor"
    vendor.mkdir(exist_ok=True)
    shutil.copy2(vendors["marked.umd.js"], vendor / "marked.umd.js")
    shutil.copytree(vendors["katex"], vendor / "katex", dirs_exist_ok=True)
    for package in ("marked", "katex"):
        license_name = "LICENSE.md" if package == "marked" else "LICENSE"
        shutil.copy2(ROOT / "node_modules" / package / license_name, vendor / f"{package}-LICENSE.txt")
    (DIST / "data").mkdir(exist_ok=True)
    (DIST / "data/archive.json").write_text(json.dumps({"topics": TOPICS, "days": days}, ensure_ascii=False) + "\n", encoding="utf-8")
    (DIST / "data/preferences.json").write_text((ROOT / "preferences.json").read_text(encoding="utf-8"), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    # Include reusable source digests for voice reading and portable export.
    exported = DIST / "data/digests"
    exported.mkdir(exist_ok=True)
    for day in days:
        (exported / f"{day['date']}.json").write_text(
            json.dumps(day, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(days)} day(s), {sum(len(d['papers']) for d in days)} selections in dist/")


if __name__ == "__main__":
    main()
