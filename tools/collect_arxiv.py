"""Archive dated arXiv announcements and v1 metadata without calling a model."""
import argparse
from datetime import date, datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ATOM = {'a': 'http://www.w3.org/2005/Atom'}
ARXIV_ID = re.compile(r'(?:\d{4}\.\d{4,5}|[a-z-]+/\d{7})(?:v\d+)?$')


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


class ListingParser(HTMLParser):
    """Read dated recent-list sections; replacements are never collected."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.captures = []
        self.current_date = None
        self.current = None
        self.entries = []
        self.dates = set()

    def finish(self):
        if self.current and self.current.get('id') and self.current_date:
            self.entries.append({**self.current, 'date': self.current_date})
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'hr', 'img', 'input', 'link', 'meta', 'wbr'):
            return
        self.depth += 1
        values = dict(attrs)
        if tag == 'h3':
            self.finish()
            self.captures.append(('heading', self.depth, []))
        if tag == 'dt':
            self.finish()
            self.current = {}
        if self.current is not None and tag == 'a' and values.get('title') == 'Abstract':
            paper_id = values.get('href', '').removeprefix('/abs/')
            if ARXIV_ID.fullmatch(paper_id):
                self.current['id'] = re.sub(r'v\d+$', '', paper_id)
        field = {'list-title': 'title', 'list-authors': 'authors', 'list-subjects': 'subjects'}
        for class_name in values.get('class', '').split():
            if self.current is not None and class_name in field:
                self.captures.append((field[class_name], self.depth, []))

    def handle_data(self, text):
        for _, _, parts in self.captures:
            parts.append(text)

    def handle_endtag(self, tag):
        if tag in ('br', 'hr', 'img', 'input', 'link', 'meta', 'wbr'):
            return
        ending = [capture for capture in self.captures if capture[1] == self.depth]
        for field, _, parts in ending:
            value = clean(''.join(parts))
            if field == 'heading':
                match = re.search(r'\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{1,2} [A-Z][a-z]{2} \d{4})\b', value)
                self.current_date = datetime.strptime(match.group(1), '%d %b %Y').date().isoformat() if match else None
                if self.current_date:
                    self.dates.add(self.current_date)
            elif self.current is not None:
                self.current[field] = re.sub(r'^(?:Title|Subjects):\s*', '', value)
            self.captures.remove((field, _, parts))
        self.depth = max(0, self.depth - 1)

    def close(self):
        super().close()
        self.finish()


def parse_listing(text):
    parser = ListingParser()
    parser.feed(text)
    parser.close()
    total = re.search(r'Total of\s+([\d,]+)\s+entries', text)
    if not total:
        raise ValueError('Missing listing total; completeness is unverified')
    count = int(total.group(1).replace(',', ''))
    if count and not parser.dates:
        raise ValueError('No dated announcement sections found; refusing to infer a historical batch')
    return parser.entries, parser.dates, count


def fetch_text(url):
    last_error = None
    for attempt in range(3):
        request = urllib.request.Request(url, headers={'User-Agent': 'daily-arxiv-archive/1.0'})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read().decode('utf-8')
        except (OSError, TimeoutError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
    raise RuntimeError(f'Could not fetch {urllib.parse.urlsplit(url).hostname}; archive remains incomplete') from last_error


def parse_atom(text):
    entries = {}
    for entry in ET.fromstring(text).findall('a:entry', ATOM):
        raw_id = entry.findtext('a:id', '', ATOM).rsplit('/abs/', 1)[-1]
        if not ARXIV_ID.fullmatch(raw_id):
            raise ValueError('arXiv metadata returned an invalid entry')
        paper_id = re.sub(r'v\d+$', '', raw_id)
        entries[paper_id] = {
            'id': paper_id,
            'title': clean(entry.findtext('a:title', '', ATOM)),
            'authors': [clean(author.findtext('a:name', '', ATOM)) for author in entry.findall('a:author', ATOM)],
            'abstract': clean(entry.findtext('a:summary', '', ATOM)),
            'submitted_v1': entry.findtext('a:published', '', ATOM),
            'categories': sorted({item.attrib['term'] for item in entry.findall('a:category', ATOM)}),
            'url': f'https://arxiv.org/abs/{paper_id}',
            'source_v1': f'https://arxiv.org/abs/{paper_id}v1',
        }
        if not entries[paper_id]['title'] or not entries[paper_id]['abstract']:
            raise ValueError('arXiv metadata is incomplete')
    return entries


def fetch_metadata(ids):
    metadata = {}
    for start in range(0, len(ids), 40):
        if start:
            time.sleep(3)
        batch = ids[start:start + 40]
        query = urllib.parse.urlencode({'id_list': ','.join(paper_id + 'v1' for paper_id in batch), 'max_results': len(batch)})
        returned = parse_atom(fetch_text('https://export.arxiv.org/api/query?' + query))
        if set(returned) != set(batch):
            raise ValueError('Metadata batch did not contain every requested v1 paper')
        metadata.update(returned)
    return metadata


def collect(categories, since, folder, through=None):
    """Capture all available dated batches; never change an existing snapshot."""
    folder.mkdir(parents=True, exist_ok=True)
    through = through or datetime.now(timezone.utc).date().isoformat()
    batches = {}
    sources = {}
    all_dates = set()
    all_sources = set()
    for category in categories:
        offset = 0
        while True:
            url = f'https://arxiv.org/list/{category}/pastweek?' + urllib.parse.urlencode({'show': 2000, 'skip': offset})
            entries, dates_seen, total = parse_listing(fetch_text(url))
            all_dates.update(dates_seen)
            all_sources.add(url)
            for announced in dates_seen:
                if since <= announced <= through and not (folder / f'{announced}.json').exists():
                    batches.setdefault(announced, {})
                    sources.setdefault(announced, set()).add(url)
            for paper in entries:
                announced = paper['date']
                if announced in batches:
                    previous = batches[announced].setdefault(paper['id'], {**paper, 'listed_categories': []})
                    if category not in previous['listed_categories']:
                        previous['listed_categories'].append(category)
            offset += 2000
            if offset >= total:
                break
            if offset >= 20000:
                raise ValueError('Listing exceeds the collection safety limit; refusing a partial batch')
            time.sleep(3)
        time.sleep(3)
    # A missing *past* weekday inside the complete listing window is a verified
    # empty batch (for example a holiday). Never call today's delayed batch empty.
    if all_dates:
        from datetime import timedelta
        day = date.fromisoformat(max(since, min(all_dates)))
        closed_through = min(date.fromisoformat(through), datetime.now(timezone.utc).date() - timedelta(days=1))
        while day <= closed_through:
            announced = day.isoformat()
            if day.weekday() < 5 and announced not in all_dates and not (folder / f'{announced}.json').exists():
                batches.setdefault(announced, {})
                sources[announced] = all_sources.copy()
            day += timedelta(days=1)
    all_ids = sorted({paper_id for batch in batches.values() for paper_id in batch})
    metadata = fetch_metadata(all_ids)
    outputs = []
    for announced, batch in sorted(batches.items()):
        # A dated listing is the eligibility evidence. Submission timestamps are
        # retained for provenance, never used to guess announcement dates.
        papers = [{**metadata[paper_id], 'listed_categories': value['listed_categories'],
                   'announcement_date': announced} for paper_id, value in sorted(batch.items())]
        snapshot = {'date': announced, 'version': 1, 'metadata_version': 'v1',
                    'captured_at': datetime.now(timezone.utc).isoformat(),
                    'listing_sources': sorted(sources[announced]), 'papers': papers}
        target = folder / f'{announced}.json'
        target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        outputs.append({'date': announced, 'papers': len(papers)})
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--folder', type=Path, default=ROOT / 'sources')
    parser.add_argument('--since')
    args = parser.parse_args()
    config = json.loads((ROOT / 'local-pipeline.json').read_text(encoding='utf-8'))
    print(json.dumps({'captured': collect(config['categories'], args.since or config['start_date'], args.folder)}))


if __name__ == '__main__':
    main()
