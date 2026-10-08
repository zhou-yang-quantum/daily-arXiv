import json
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools import collect_arxiv as collector
from tools import local_pipeline as pipeline
from test_archive import example_digest


def snapshot(count=10, day='2026-10-07'):
    return {'date': day, 'metadata_version': 'v1', 'listing_sources': ['https://arxiv.org/list/quant-ph/pastweek?show=2000'],
            'papers': [{'id': f'2610.{n:05d}', 'title': f'Paper {n}', 'abstract': f'Abstract {n}',
                        'authors': ['Author'], 'categories': ['quant-ph'], 'announcement_date': day}
                       for n in range(1, count + 1)]}


class CollectorTests(unittest.TestCase):
    def test_dates_metadata_math_and_replacements(self):
        listing = '''<div>Total of 2 entries</div><dl>
        <h3>Wed, 7 Oct 2026 (showing 1 of 1 entries)</h3>
        <dt><a href="/abs/2610.00001" title="Abstract">arXiv:2610.00001</a></dt>
        <dd><div class="list-title mathjax"><span>Title:</span> A $Q$ &amp; theory</div>
        <div class="list-authors"><a>A. Author</a>, <a>B. Author</a></div></dd>
        <h3>Tue, 6 Oct 2026 (showing 1 of 1 entries)</h3>
        <dt><a href="/abs/2610.00002" title="Abstract">arXiv:2610.00002</a></dt>
        <dd><div class="list-title">Title: Earlier paper</div></dd>
        <h3>Replacements</h3><dt><a href="/abs/2610.00003v2" title="Abstract">replacement</a></dt>
        </dl>'''
        papers, dates, total = collector.parse_listing(listing)
        self.assertEqual(total, 2)
        self.assertEqual(dates, {'2026-10-07', '2026-10-06'})
        self.assertEqual([paper['date'] for paper in papers], ['2026-10-07', '2026-10-06'])
        self.assertEqual(papers[0]['title'], 'A $Q$ & theory')
        self.assertEqual(papers[0]['authors'], 'A. Author, B. Author')

    def test_refuses_undated_monthly_list(self):
        with self.assertRaises(ValueError):
            collector.parse_listing('Total of 1 entries<dt><a href="/abs/2610.00001" title="Abstract">x</a></dt>')

    def test_empty_category_is_valid(self):
        self.assertEqual(collector.parse_listing('Total of 0 entries'), ([], set(), 0))

    def test_atom_v1_metadata_and_error_entries(self):
        atom = '''<feed xmlns="http://www.w3.org/2005/Atom"><entry>
        <id>http://arxiv.org/abs/2610.00001v1</id><title>A paper</title>
        <summary>First version abstract.</summary><published>2026-10-01T12:00:00Z</published>
        <author><name>A. Author</name></author><category term="quant-ph"/>
        </entry></feed>'''
        paper = collector.parse_atom(atom)['2610.00001']
        self.assertEqual(paper['source_v1'], 'https://arxiv.org/abs/2610.00001v1')
        self.assertEqual(paper['authors'], ['A. Author'])
        with self.assertRaises(ValueError):
            collector.parse_atom(atom.replace('http://arxiv.org/abs/2610.00001v1', 'http://arxiv.org/api/errors#incorrect_id_format'))


class QueueTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root_patch = patch.object(pipeline, 'ROOT', Path(temporary.name))
        root_patch.start()
        self.addCleanup(root_patch.stop)
        self.config = {'start_date': '2026-10-07', 'timezone': 'America/Chicago', 'hour': 10, 'minute': 0,
                       'model': 'gpt-6.1-sol', 'reasoning_effort': 'high', 'retry_minutes': 60,
                       'generation_timeout_minutes': 45, 'categories': ['quant-ph']}

    def test_before_ten_only_older_dates_and_weekends(self):
        morning = datetime(2026, 10, 8, 14, 59, tzinfo=timezone.utc)
        self.assertEqual(pipeline.expected_dates(self.config, morning), ['2026-10-07'])
        self.assertEqual(pipeline.expected_dates(self.config, datetime(2026, 10, 8, 15, tzinfo=timezone.utc)), ['2026-10-07', '2026-10-08'])
        dates = pipeline.expected_dates(self.config, datetime(2026, 10, 12, 16, tzinfo=timezone.utc))
        self.assertEqual(dates, ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'])

    def test_timezone_follows_daylight_saving(self):
        config = {**self.config, 'start_date': '2026-11-02'}
        self.assertEqual(pipeline.expected_dates(config, datetime(2026, 11, 2, 15, 59, tzinfo=timezone.utc)), [])
        self.assertEqual(pipeline.expected_dates(config, datetime(2026, 11, 2, 16, tzinfo=timezone.utc)), ['2026-11-02'])

    def test_missing_gap_not_just_latest_date(self):
        now = datetime(2026, 10, 9, 18, tzinfo=timezone.utc)
        state = {'days': {'2026-10-08': {'status': 'published'}}}
        self.assertEqual(pipeline.plan(self.config, state, now)['due'], ['2026-10-07', '2026-10-09'])

    def test_retry_and_review_are_not_false_completions(self):
        now = datetime(2026, 10, 9, 18, tzinfo=timezone.utc)
        state = {'days': {'2026-10-07': {'status': 'retry', 'retry_at': '2026-10-09T19:00:00+00:00'},
                          '2026-10-08': {'status': 'needs-review'}}}
        result = pipeline.plan(self.config, state, now)
        self.assertEqual(result['due'], ['2026-10-09'])
        self.assertEqual(result['waiting'], ['2026-10-07'])
        self.assertEqual(result['needs_review'], ['2026-10-08'])

    def test_quota_or_network_cooldown_applies_to_entire_queue(self):
        now = datetime(2026, 10, 9, 18, tzinfo=timezone.utc)
        state = {'days': {}, 'pause_until': '2026-10-09T19:00:00+00:00'}
        result = pipeline.plan(self.config, state, now)
        self.assertEqual(result['due'], [])
        self.assertEqual(result['waiting'], ['2026-10-07', '2026-10-08', '2026-10-09'])
        self.assertEqual(len(pipeline.plan(self.config, state, datetime(2026, 10, 9, 19, tzinfo=timezone.utc))['due']), 3)

    def test_saved_schedule_model_changes_apply_to_startup_worker(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            config_path = root / 'config.json'
            config_path.write_text(json.dumps({**self.config, 'require_chatgpt_login': True, 'allow_paid_api': False}), encoding='utf-8')
            (root / 'runtime.json').write_text(json.dumps({'automation_id': 'fixture'}), encoding='utf-8')
            task_folder = root / 'automations/fixture'
            task_folder.mkdir(parents=True)
            (task_folder / 'automation.toml').write_text('model = "gpt-6-sol"\nreasoning_effort = "medium"\n', encoding='utf-8')
            with patch.object(pipeline, 'RUNTIME', root), patch.object(pipeline, 'CONFIG', config_path), patch.dict(os.environ, {'CODEX_HOME': str(root)}):
                loaded = pipeline.load_config()
            self.assertEqual((loaded['model'], loaded['reasoning_effort']), ('gpt-6-sol', 'medium'))

    def test_kernel_lock_prevents_duplicate_workers_and_releases(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(pipeline, 'RUNTIME', Path(folder)):
            with pipeline.pipeline_lock() as first:
                self.assertTrue(first)
                with pipeline.pipeline_lock() as second:
                    self.assertFalse(second)
            with pipeline.pipeline_lock() as third:
                self.assertTrue(third)

    def test_model_and_effort_override_current_chat_and_strip_keys(self):
        command = pipeline.generation_command('codex', self.config, Path('result.json'), Path('schema.json'))
        self.assertIn('gpt-6.1-sol', command)
        self.assertIn('model_reasoning_effort="high"', command)
        self.assertIn('forced_login_method="chatgpt"', command)
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'secret', 'ARXIV_GITHUB_TOKEN': 'secret', 'GH_TOKEN': 'secret'}):
            environment = pipeline.child_environment()
            self.assertNotIn('OPENAI_API_KEY', environment)
            self.assertNotIn('ARXIV_GITHUB_TOKEN', environment)
            self.assertNotIn('GH_TOKEN', environment)

    def test_automatic_worker_honors_app_schedule_pause(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(pipeline, 'RUNTIME', Path(folder)), \
             patch.object(pipeline, 'load_config', return_value={**self.config, 'enabled': False}), \
             patch.object(pipeline, 'github_token') as credential:
            self.assertEqual(pipeline.run_pipeline(automatic=True)['status'], 'paused')
            credential.assert_not_called()

    def test_rejects_wrong_date_wrong_batch_and_changed_title(self):
        result = {'status': 'ready', 'markdown': example_digest(include_priority=False).replace('2026-10-06', '2026-10-07')}
        pipeline.validate_result(result, snapshot(), '2026-10-07')
        for changed in (result['markdown'].replace('2026-10-07', '2026-10-08'),
                        result['markdown'].replace('2610.00001', '2610.99999'),
                        result['markdown'].replace('### Paper 1\n', '### Invented title\n')):
            with self.subTest(changed=changed[:80]), self.assertRaises(ValueError):
                pipeline.validate_result({**result, 'markdown': changed}, snapshot(), '2026-10-07')

    def test_existing_dates_never_generate_and_success_survives_restart(self):
        now = datetime(2026, 10, 8, 18, tzinfo=timezone.utc)
        text = example_digest(include_priority=False).replace('2026-10-06', '2026-10-08')
        with tempfile.TemporaryDirectory() as folder, patch.object(pipeline, 'RUNTIME', Path(folder)), \
             patch.object(pipeline, 'load_config', return_value=self.config), \
             patch.object(pipeline, 'app_is_running', return_value=True), \
             patch.object(pipeline, 'github_token', return_value='test-token'), \
             patch.object(pipeline, 'plan', side_effect=lambda config, state, _: pipeline_plan(config, state, now)), \
             patch.object(pipeline.publish_digest, 'check_date', side_effect=[{'status': 'exists'}, {'status': 'missing'}, {'status': 'exists'}]), \
             patch.object(pipeline, 'get_snapshot', return_value=snapshot(day='2026-10-08')), \
             patch.object(pipeline, 'generate', return_value={'status': 'ready', 'markdown': text}) as generate, \
             patch.object(pipeline.publish_digest, 'publish', return_value={'date': '2026-10-08', 'status': 'publication-queued', 'commit': 'a' * 40}):
            (Path(folder) / 'runs/2026-10-08').mkdir(parents=True)
            result = pipeline.run_pipeline()
            self.assertEqual(len(result['results']), 2)
            generate.assert_called_once()
            self.assertEqual(pipeline.read_state()['days']['2026-10-08']['status'], 'published')
            self.assertEqual(pipeline_plan(self.config, pipeline.read_state(), now)['due'], [])


pipeline_plan = pipeline.plan


if __name__ == '__main__':
    unittest.main()
