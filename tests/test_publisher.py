import base64
import unittest
from unittest.mock import patch
from tools.publish_digest import publish, check_date
from test_archive import example_digest


class PublisherTests(unittest.TestCase):
    @patch('tools.publish_digest.api_request')
    def test_uploads_only_the_dated_markdown_to_main(self, api):
        api.side_effect = [None, {'commit': {'sha': 'a' * 40}}]
        text = example_digest()
        result = publish(text, 'test-credential')
        self.assertEqual(result['status'], 'publication-queued')
        method, date, _, payload = api.call_args.args
        self.assertEqual((method, date, payload['branch']), ('PUT', '2026-10-06', 'main'))
        self.assertEqual(base64.b64decode(payload['content']).decode('utf-8'), text)
        self.assertNotIn('sha', payload)

    @patch('tools.publish_digest.api_request')
    def test_identical_redelivery_does_not_write(self, api):
        text = example_digest()
        api.return_value = {'encoding': 'base64', 'content': base64.b64encode(text.encode()).decode()}
        self.assertEqual(publish(text, 'test-credential')['status'], 'already-delivered')
        self.assertEqual(api.call_count, 1)

    @patch('tools.publish_digest.api_request')
    def test_refuses_to_overwrite_a_date(self, api):
        api.return_value = {'encoding': 'base64', 'content': base64.b64encode(b'Old content').decode()}
        with self.assertRaises(ValueError):
            publish(example_digest(), 'test-credential')
        self.assertEqual(api.call_count, 1)

    @patch('tools.publish_digest.api_request')
    def test_invalid_digest_never_reaches_github(self, api):
        with self.assertRaises(ValueError):
            publish('# arXiv-2026-10-06\nIncomplete', 'test-credential')
        api.assert_not_called()

    @patch('tools.publish_digest.api_request')
    def test_date_check_does_not_return_digest_content(self, api):
        api.return_value = {'content': 'a large archived selection'}
        self.assertEqual(check_date('2026-10-06', 'test-credential'), {'date': '2026-10-06', 'status': 'exists'})


if __name__ == '__main__':
    unittest.main()
