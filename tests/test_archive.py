import json
import tempfile
import unittest
from pathlib import Path
from tools.import_digest import parse_digest
from tools.build import load_archive, ROOT


def example_digest():
    return '# arXiv-2026-10-06\n\nOverview\n\n' + '\n\n'.join(
        f'## arXiv-2026-10-06 — Item {n}\n\n### Paper {n}\n**Author — arXiv:2610.{n:05d}**\n**Priority: high**\n\nSummary of paper {n}.\n\n**Background.** A useful concept.\n\n**Why it matters for you:** A useful connection.\n'
        for n in range(1, 11)
    )


class DigestTests(unittest.TestCase):
    def test_import_preserves_sections_and_date(self):
        day = parse_digest(example_digest())
        self.assertEqual(day['date'], '2026-10-06')
        self.assertEqual(len(day['papers']), 10)
        self.assertEqual(day['papers'][0]['authors'], 'Author')
        self.assertEqual(day['papers'][0]['summary'], 'Summary of paper 1.')
        self.assertEqual(day['papers'][0]['background'], 'A useful concept.')
        self.assertEqual(day['papers'][0]['why'], 'A useful connection.')

    def test_rejects_wrong_date_and_duplicate_ids(self):
        with self.assertRaises(ValueError):
            parse_digest(example_digest().replace('2026-10-06 — Item 2', '2026-10-05 — Item 2'))
        with self.assertRaises(ValueError):
            parse_digest(example_digest().replace('2610.00002', '2610.00001'))

    def test_rejects_missing_background_and_missing_rank(self):
        with self.assertRaises(ValueError):
            parse_digest(example_digest().replace('**Background.**', '**Details.**', 1))
        with self.assertRaises(ValueError):
            parse_digest(example_digest().replace('— Item 10', '— Item 11'))

    def test_build_rejects_unsafe_paper_link(self):
        day = parse_digest(example_digest())
        day['papers'][0]['url'] = 'javascript:alert(1)'
        with tempfile.TemporaryDirectory() as folder:
            Path(folder, '2026-10-06.json').write_text(json.dumps(day), encoding='utf-8')
            with self.assertRaises(ValueError):
                load_archive(Path(folder))

    def test_real_archive_has_complete_sections(self):
        days = load_archive(ROOT / 'content/digests')
        for day in days:
            self.assertEqual(len(day['papers']), 10)
            self.assertEqual(sorted(day['reading_order']), list(range(1, 11)))
            for paper in day['papers']:
                for key in ('summary', 'background', 'why'):
                    self.assertNotIn('\ue200', paper[key])


if __name__ == '__main__':
    unittest.main()
