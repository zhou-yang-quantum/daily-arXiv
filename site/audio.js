/* Real media files keep playing without a background speech/JavaScript loop. */
(function (root) {
  'use strict';
  class DigestAudio {
    constructor(panel) {
      this.panel = panel;
      this.audio = panel.querySelector('audio');
      this.title = panel.querySelector('#audio-title');
      this.status = panel.querySelector('#audio-status');
      this.file = panel.querySelector('#audio-file');
      this.index = { days: {} };
      this.track = null;
      this.request = 0;
      panel.querySelector('#audio-back').addEventListener('click', () => this.seek(-30));
      panel.querySelector('#audio-forward').addEventListener('click', () => this.seek(30));
      panel.querySelector('#audio-close').addEventListener('click', () => this.close());
      panel.querySelector('#audio-rate').addEventListener('change', (event) => {
        this.audio.playbackRate = Number(event.target.value); this.position();
      });
      for (const name of ['playing', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'timeupdate', 'ratechange']) {
        this.audio.addEventListener(name, () => this.update());
      }
      this.audio.addEventListener('waiting', () => { this.status.textContent = 'Loading audio…'; });
      this.audio.addEventListener('error', () => {
        if (this.track) this.status.textContent = 'Audio could not be loaded. Try opening the audio file.';
        this.mediaState('paused');
      });
      this.mediaHandlers();
    }
    entry(day, rank) {
      const data = this.index.days?.[day.date];
      if (!data) return null;
      const source = rank == null ? data.day : data.items.find((item) => item.rank === rank);
      if (!source || !source.url.startsWith('https://github.com/zhou-yang-quantum/daily-arXiv/releases/download/audio-')) return null;
      return { ...source, label: rank == null ? day.title + ' — Full digest' : day.title + ' — Item ' + rank,
        title: rank == null ? day.title : source.title, date: day.date };
    }
    async play(day, rank) {
      const track = this.entry(day, rank);
      if (!track) return;
      const request = ++this.request;
      this.audio.pause();
      this.track = track;
      this.panel.hidden = false;
      document.body.classList.add('has-audio-player');
      this.title.textContent = track.label;
      this.status.textContent = 'Loading audio…';
      this.file.href = track.url;
      this.audio.src = track.url;
      this.audio.playbackRate = Number(this.panel.querySelector('#audio-rate').value);
      if ('audioSession' in navigator) {
        try { navigator.audioSession.type = 'playback'; } catch { /* Optional platform API. */ }
      }
      if ('mediaSession' in navigator && 'MediaMetadata' in root) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: track.label + (rank == null ? '' : ' · ' + track.title),
          artist: 'daily-arXiv', album: day.title });
      }
      try { await this.audio.play(); }
      catch {
        if (request === this.request) this.status.textContent = 'Tap the audio player to start, or open the audio file.';
      }
    }
    seek(offset) { this.seekTo(this.audio.currentTime + offset); }
    seekTo(value) {
      if (!this.track || !Number.isFinite(this.audio.duration) || this.audio.duration <= 0 || !Number.isFinite(value)) return;
      this.audio.currentTime = Math.max(0, Math.min(value, this.audio.duration));
      this.position();
    }
    mediaState(state) {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state;
    }
    position() {
      if (!navigator.mediaSession?.setPositionState || !Number.isFinite(this.audio.duration) || this.audio.duration <= 0) return;
      try { navigator.mediaSession.setPositionState({ duration: this.audio.duration, playbackRate: this.audio.playbackRate,
        position: Math.max(0, Math.min(this.audio.currentTime, this.audio.duration)) }); } catch { /* Older browser. */ }
    }
    update() {
      if (!this.track) return;
      const status = this.audio.ended ? 'Finished' : this.audio.paused ? 'Paused' : 'Playing';
      if (this.status.textContent !== status) this.status.textContent = status;
      this.mediaState(this.audio.paused ? 'paused' : 'playing');
      this.position();
    }
    mediaHandlers() {
      if (!navigator.mediaSession?.setActionHandler) return;
      const actions = {
        play: () => { if (this.track) this.audio.play().catch(() => { this.status.textContent = 'Tap the audio player to resume.'; }); },
        pause: () => this.audio.pause(), stop: () => this.close(),
        seekbackward: () => this.seek(-30), seekforward: () => this.seek(30),
        previoustrack: () => this.seek(-30), nexttrack: () => this.seek(30),
        seekto: (details) => this.seekTo(details.seekTime),
      };
      for (const [action, handler] of Object.entries(actions)) {
        try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Unsupported action. */ }
      }
    }
    close() {
      ++this.request;
      this.track = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.panel.hidden = true;
      document.body.classList.remove('has-audio-player');
      this.mediaState('none');
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        try { navigator.mediaSession.setPositionState?.(); } catch { /* Optional API. */ }
      }
    }
  }
  root.DigestAudio = DigestAudio;
})(globalThis);
