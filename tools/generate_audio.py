"""Render immutable MP3 releases with offline CPU speech; no model APIs."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request
import wave

if __package__:
    from .build import ROOT, load_archive, audio_source_hash
else:
    from build import ROOT, load_archive, audio_source_hash

REPOSITORY = 'zhou-yang-quantum/daily-arXiv'
VOICE = 'en_US-ljspeech-medium'
REVISION = 'c10ece1aade47bb51c153c893d14e5bf8e5b7117'
MODEL_SHA = '6f52a751e2349abe7a76735eb09dc1875298c77ea2342ffd2fef79ff81b87f22'
CONFIG_SHA = '141d612cc0a95ed7efc1ca936b845c2364967f2e9217c5dbfcf69fc4d6c65860'
CACHE = ROOT / '.cache/audio'


def command(args, timeout=120):
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', timeout=timeout)
    if result.returncode:
        # Only a diagnostic tail; never include credentials or request headers.
        raise RuntimeError(f'{Path(args[0]).name} failed: {result.stderr[-1200:]}')
    return result.stdout


def fingerprint(prepared):
    settings = {'voice': VOICE, 'voice_sha': MODEL_SHA, 'config_sha': CONFIG_SHA, 'piper': '1.4.2', 'encoder': 'mp3-64k-id3-v1', 'content': prepared}
    return hashlib.sha256(json.dumps(settings, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def cached_release(tag):
    result = subprocess.run(['gh', 'api', f'repos/{REPOSITORY}/releases/tags/{tag}'], capture_output=True, text=True, encoding='utf-8', timeout=60)
    if result.returncode:
        if '404' in result.stderr:
            return None
        raise RuntimeError('Could not check the audio release; refusing duplicate generation')
    data = json.loads(result.stdout)
    names = {asset['name'] for asset in data.get('assets', [])}
    if 'manifest.json' not in names:
        return None
    asset = next(asset for asset in data['assets'] if asset['name'] == 'manifest.json')
    manifest = json.loads(command(['gh', 'api', f'repos/{REPOSITORY}/releases/assets/{asset["id"]}', '-H', 'Accept: application/octet-stream']))
    required = {'day.mp3'} | {f'item-{item["rank"]:02}.mp3' for item in manifest['items']}
    if not required <= names:
        return None
    return manifest


def download_voice():
    folder = CACHE / 'voice'
    folder.mkdir(parents=True, exist_ok=True)
    base = f'https://huggingface.co/rhasspy/piper-voices/resolve/{REVISION}/en/en_US/ljspeech/medium/'
    for suffix, expected in (('.onnx', MODEL_SHA), ('.onnx.json', CONFIG_SHA)):
        target = folder / (VOICE + suffix)
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            continue
        partial = target.with_suffix(target.suffix + '.partial')
        with urllib.request.urlopen(base + target.name, timeout=120) as response, partial.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if hashlib.sha256(partial.read_bytes()).hexdigest() != expected:
            raise ValueError('Speech model checksum mismatch')
        partial.replace(target)
    return folder / (VOICE + '.onnx')


def duration(path):
    with wave.open(str(path), 'rb') as wav:
        return wav.getnframes() / wav.getframerate()


def save_index(path, index):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def render(prepared, tag, voice):
    from piper import SynthesisConfig
    folder = CACHE / 'renders' / tag
    folder.mkdir(parents=True, exist_ok=True)
    segments = [('intro', prepared['intro'])] + [(f'item-{item["rank"]:02}', item['text']) for item in prepared['items']]
    if prepared['notes']:
        segments.append(('notes', prepared['notes']))
    paths, starts = [], {}
    elapsed = 0.0
    for name, text in segments:
        target = folder / (name + '.wav')
        # A successful segment can be reused after an interrupted generation.
        if not target.exists():
            partial = target.with_suffix('.partial.wav')
            with wave.open(str(partial), 'wb') as wav:
                voice.synthesize_wav(text, wav, syn_config=SynthesisConfig(length_scale=1.0))
            partial.replace(target)
        starts[name] = elapsed
        elapsed += duration(target)
        paths.append(target)
        if name.startswith('item-'):
            item = next(item for item in prepared['items'] if name == f'item-{item["rank"]:02}')
            command(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(target), '-c:a', 'libmp3lame', '-b:a', '64k', '-write_xing', '1',
                     '-metadata', 'title=' + prepared['title'] + ' — Item ' + str(item['rank']) + ' — ' + item['title'],
                     '-metadata', 'artist=daily-arXiv', '-metadata', 'album=' + prepared['title'], str(folder / (name + '.mp3'))])
    # Concatenate PCM into a single day file so playback never needs a background
    # JavaScript callback to move to another paper while the screen is locked.
    combined = folder / 'day.wav'
    with wave.open(str(combined), 'wb') as output:
        for index, path in enumerate(paths):
            with wave.open(str(path), 'rb') as source:
                if index == 0:
                    output.setparams(source.getparams())
                elif (source.getframerate(), source.getnchannels(), source.getsampwidth()) != (output.getframerate(), output.getnchannels(), output.getsampwidth()):
                    raise ValueError('Incompatible speech segments')
                output.writeframes(source.readframes(source.getnframes()))
    command(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(combined), '-c:a', 'libmp3lame', '-b:a', '64k', '-write_xing', '1',
             '-metadata', 'title=' + prepared['title'] + ' — Full digest', '-metadata', 'artist=daily-arXiv',
             '-metadata', 'album=' + prepared['title'], str(folder / 'day.mp3')], timeout=300)
    base = f'https://github.com/{REPOSITORY}/releases/download/{tag}/'
    items = [{key: item[key] for key in ('rank', 'id', 'title')} | {'url': base + f'item-{item["rank"]:02}.mp3',
             'start': round(starts[f'item-{item["rank"]:02}'], 3), 'duration': round(duration(folder / f'item-{item["rank"]:02}.wav'), 3)} for item in prepared['items']]
    return {'date': prepared['date'], 'source_hash': prepared['source_hash'], 'content_hash': fingerprint(prepared), 'voice': VOICE, 'generated_at': datetime.now(timezone.utc).isoformat(),
            'day': {'url': base + 'day.mp3', 'duration': round(elapsed, 3)}, 'items': items}, folder


def publish(manifest, folder, tag):
    path = folder / 'manifest.json'
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Existing partial releases are repaired; only these exact deterministic
    # asset names are touched. The manifest is uploaded last as the ready marker.
    view = subprocess.run(['gh', 'release', 'view', tag, '--repo', REPOSITORY, '--json', 'tagName'], capture_output=True, timeout=60)
    if view.returncode:
        notes = folder / 'release-notes.md'
        notes.write_text('Offline synthetic reading of ' + manifest['date'] + '.\n\n'
            'Voice: Piper LJSpeech medium (public-domain training dataset).\n'
            'Math pronunciation: KaTeX MathML and Speech Rule Engine.\n'
            'Source digest: https://github.com/' + REPOSITORY + '/blob/main/incoming/' + manifest['date'] + '.md\n'
            'Generated without model API calls.\n', encoding='utf-8')
        command(['gh', 'release', 'create', tag, '--repo', REPOSITORY, '--target', os.environ.get('GITHUB_SHA', 'main'),
                 '--title', 'arXiv-' + manifest['date'] + ' audio', '--notes-file', str(notes), '--latest=false'])
    command(['gh', 'release', 'upload', tag, '--repo', REPOSITORY, '--clobber', *[str(p) for p in sorted(folder.glob('*.mp3'))]], timeout=600)
    command(['gh', 'release', 'upload', tag, '--repo', REPOSITORY, '--clobber', str(path)])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date')
    parser.add_argument('--local-only', action='store_true')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    days = load_archive(ROOT / 'content/digests', ROOT / 'incoming')
    if args.date:
        days = [day for day in days if day['date'] == args.date]
        if not days:
            raise ValueError('Requested digest does not exist')
    source = CACHE / 'days.json'
    source.write_text(json.dumps(days, ensure_ascii=False), encoding='utf-8')
    text_folder = CACHE / 'text'
    command(['node', str(ROOT / 'tools/export_audio.mjs'), str(source), str(text_folder)], timeout=300)
    index_file = ROOT / 'audio/index.json'
    index_file.parent.mkdir(parents=True, exist_ok=True)
    seed = json.loads(index_file.read_text(encoding='utf-8')) if index_file.exists() else {'days': {}}
    if not seed.get('days'):
        try:
            with urllib.request.urlopen('https://zhou-yang-quantum.github.io/daily-arXiv/data/audio/index.json', timeout=20) as response:
                seed = json.load(response)
        except (OSError, ValueError):
            pass
    index = {'version': 1, 'days': {}}
    save_index(index_file, index)
    voice = None
    for day in days:
        prepared = json.loads((text_folder / (day['date'] + '.json')).read_text(encoding='utf-8'))
        prepared['source_hash'] = audio_source_hash(day)
        tag = 'audio-' + day['date'] + '-' + fingerprint(prepared)[:16]
        existing = seed.get('days', {}).get(day['date'])
        if existing and existing.get('content_hash') != fingerprint(prepared):
            existing = None
        if existing is None and not args.local_only:
            existing = cached_release(tag)
        if existing:
            if existing['content_hash'] != fingerprint(prepared) or existing['date'] != day['date']:
                raise ValueError('Audio release content mismatch')
            manifest = existing
            print('Reused audio for ' + day['date'], flush=True)
        else:
            if voice is None:
                from piper import PiperVoice
                voice = PiperVoice.load(str(download_voice()), use_cuda=False)
            manifest, folder = render(prepared, tag, voice)
            if not args.local_only:
                publish(manifest, folder, tag)
                verified = cached_release(tag)
                if verified is None or verified['content_hash'] != manifest['content_hash']:
                    raise RuntimeError('Audio publication could not be verified')
            print('Rendered audio for ' + day['date'] + ': ' + str(round(manifest['day']['duration'] / 60, 1)) + ' minutes', flush=True)
        index['days'][day['date']] = manifest
        save_index(index_file, index)


if __name__ == '__main__':
    main()
