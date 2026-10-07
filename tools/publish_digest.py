"""Publish one validated Markdown digest; credentials stay in the environment."""
import argparse
import base64
import datetime
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

if __package__:
    from .import_digest import parse_digest
else:
    from import_digest import parse_digest

REPOSITORY = "zhou-yang-quantum/daily-arXiv"
API_ROOT = f"https://api.github.com/repos/{REPOSITORY}/contents/incoming/"


def api_request(method, date, token, payload=None):
    datetime.date.fromisoformat(date)
    url = API_ROOT + date + ".md"
    if method == "GET":
        url += "?ref=main"
    request = urllib.request.Request(
        url, method=method,
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "daily-arxiv-publisher/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if method == "GET" and error.code == 404:
            return None
        # Do not print requests, headers, environment values, or response bodies.
        raise RuntimeError(f"GitHub returned HTTP {error.code}; check the cloud credential's repository access") from None


def check_date(date, token):
    datetime.date.fromisoformat(date)
    existing = api_request("GET", date, token)
    return {"date": date, "status": "exists" if existing is not None else "missing"}


def publish(text, token):
    digest = parse_digest(text)
    date = digest["date"]
    existing = api_request("GET", date, token)
    if existing is not None:
        if existing.get("encoding") != "base64":
            raise ValueError("Cannot verify the existing digest; refusing to overwrite it")
        previous = base64.b64decode(existing["content"]).decode("utf-8")
        if previous.rstrip() != text.rstrip():
            raise ValueError(f"{date} already exists with different content; refusing to overwrite it")
        return {"date": date, "papers": 10, "status": "already-delivered"}
    result = api_request("PUT", date, token, {
        "message": f"Add arXiv-{date} selection",
        "content": base64.b64encode(text.encode("utf-8")).decode("ascii"),
        "branch": "main",
    })
    if not result.get("commit", {}).get("sha"):
        raise RuntimeError("GitHub did not confirm a commit; publication is unverified")
    return {
        "date": date, "papers": 10, "status": "publication-queued",
        "commit": result["commit"]["sha"],
        "website": f"https://zhou-yang-quantum.github.io/daily-arXiv/#date={date}",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path, nargs="?")
    parser.add_argument("--check-date", help="Return only whether this date is already delivered")
    args = parser.parse_args()
    if bool(args.markdown) == bool(args.check_date):
        parser.error("Supply either a Markdown file or --check-date YYYY-MM-DD")
    token = os.environ.get("ARXIV_GITHUB_TOKEN", "").strip()
    if not token:
        raise SystemExit("ARXIV_GITHUB_TOKEN is missing; configure it in the cloud environment, not in a source file")
    try:
        result = check_date(args.check_date, token) if args.check_date else publish(
            args.markdown.read_text(encoding="utf-8-sig"), token)
    except (ValueError, RuntimeError, OSError, urllib.error.URLError) as error:
        raise SystemExit(str(error)) from None
    print(json.dumps(result))


if __name__ == "__main__":
    main()
