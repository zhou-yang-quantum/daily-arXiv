import json
from pathlib import Path
import tempfile
import unittest
import wave
from unittest.mock import patch

from tools.build import audio_source_hash, audio_script_hash, load_audio_index
from tools.generate_audio import fingerprint, concatenate, append_silence, text_chunks
from tools.speech_text import make_script
from tools.import_digest import parse_digest
from test_archive import example_digest


class AudioTests(unittest.TestCase):
    def setUp(self):
        self.day = parse_digest(example_digest(include_priority=False))
        prefix = 'https://github.com/zhou-yang-quantum/daily-arXiv/releases/download/audio-test/'
        self.audio = {'date': self.day['date'], 'source_hash': audio_source_hash(self.day),
                      'day': {'url': prefix + 'day.mp3', 'duration': 120},
                      'items': [{'rank': p['rank'], 'id': p['id'], 'url': prefix + f'item-{p["rank"]:02}.mp3',
                                 'duration': 30} for p in self.day['papers']]}

    def read(self, audio):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder, 'index.json')
            path.write_text(json.dumps({'days': {self.day['date']: audio}}), encoding='utf-8')
            return load_audio_index([self.day], path)

    def test_edited_prose_cannot_use_an_old_recording(self):
        self.assertIn(self.day['date'], self.read(self.audio)['days'])
        self.day['papers'][0]['summary'] += ' Corrected statement.'
        self.assertEqual(self.read(self.audio)['days'], {})

    def test_wrong_item_ids_ranks_and_external_hosts_are_rejected(self):
        for key, value in [('id', '2610.99999'), ('rank', 20), ('url', 'https://example.com/track.mp3')]:
            changed = json.loads(json.dumps(self.audio))
            changed['items'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.read(changed)

    def test_hash_covers_all_reading_sections_but_not_topic_tags(self):
        original = audio_source_hash(self.day)
        self.day['papers'][0]['topics'] = ['Quantum simulation']
        self.assertEqual(original, audio_source_hash(self.day))
        for field in ('title', 'authors', 'summary', 'background', 'why'):
            changed = json.loads(json.dumps(self.day))
            changed['papers'][0][field] += ' Changed.'
            self.assertNotEqual(original, audio_source_hash(changed))

    def test_immutable_release_identity_changes_with_speech_or_voice_source(self):
        first = {'date': '2026-10-08', 'items': [{'text': 'An exact sentence.'}]}
        self.assertEqual(fingerprint(first), fingerprint(json.loads(json.dumps(first))))
        self.assertNotEqual(fingerprint(first), fingerprint({**first, 'items': [{'text': 'A different sentence.'}]}))

    def test_math_requires_complete_plain_english_without_changing_prose(self):
        self.day['papers'][0]['summary'] = 'The result is $x^2$.'
        original = json.loads(json.dumps(self.day))
        with self.assertRaises(ValueError):
            make_script(self.day, [])
        with self.assertRaises(ValueError):
            make_script(self.day, [{'latex': '$x^2$', 'spoken': 'x^2'}])
        script = make_script(self.day, [{'latex': '$x^2$', 'spoken': 'x squared'}])
        self.assertEqual(self.day, original)
        self.assertEqual(script['source_hash'], audio_source_hash(self.day))
        with self.assertRaises(ValueError):
            make_script(self.day, script['pronunciations'] * 2)

    def test_edited_pronunciation_cannot_use_old_audio(self):
        script = make_script(self.day, [])
        with tempfile.TemporaryDirectory() as folder, patch('tools.build.ROOT', Path(folder)):
            scripts = Path(folder, 'audio/scripts')
            scripts.mkdir(parents=True)
            (scripts / (self.day['date'] + '.json')).write_text(json.dumps(script), encoding='utf-8')
            self.assertEqual(self.read(self.audio)['days'], {})
            self.audio['speech_script_hash'] = audio_script_hash(script)
            self.assertIn(self.day['date'], self.read(self.audio)['days'])

    def test_day_pcm_is_exactly_item_pcm_and_pauses_are_real_silence(self):
        with tempfile.TemporaryDirectory() as folder:
            files, content = [], []
            for index in range(2):
                path = Path(folder, f'item-{index}.wav')
                with wave.open(str(path), 'wb') as output:
                    output.setnchannels(1)
                    output.setsampwidth(2)
                    output.setframerate(1000)
                    output.writeframes(bytes([index + 1, 0]) * 100)
                    append_silence(output, 1.5)
                with wave.open(str(path), 'rb') as source:
                    data = source.readframes(source.getnframes())
                    self.assertEqual(data[-3000:], b'\0' * 3000)
                    content.append(data)
                files.append(path)
            target = Path(folder, 'day.wav')
            concatenate(files, target)
            with wave.open(str(target), 'rb') as source:
                self.assertEqual(source.readframes(source.getnframes()), b''.join(content))

    def test_chunking_preserves_every_word_including_long_sentences(self):
        text = ' '.join('word' + str(i) for i in range(500))
        self.assertEqual(' '.join(text_chunks(text)).split(), text.split())


if __name__ == '__main__':
    unittest.main()
