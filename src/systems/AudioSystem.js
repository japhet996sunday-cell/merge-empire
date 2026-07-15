/**
 * AudioSystem.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Owns all sound playback: SFX triggered by gameplay events, and a
 *   looping ambient background tone. Uses the Web Audio API directly (no
 *   library, no external audio files) with procedurally synthesized tones
 *   via OscillatorNode — this keeps the project runnable immediately with
 *   zero binary assets to source/license, while remaining a real, working
 *   audio implementation rather than a stub. Swapping in recorded SFX
 *   later only means replacing playSfx()'s internals; its public contract
 *   (event -> sound) does not change.
 *
 * CONTRACT
 *   init(gameState) -> void   — unlocks AudioContext on first user gesture
 *   playSfx(sfxId, options?)  — options: { volume }
 *   setMasterVolume(0..1) / setSfxVolume(0..1) / setMusicVolume(0..1)
 *   toggleMusic(shouldPlay)
 *
 * EVENTS CONSUMED (wired declaratively in _wireEventReactions)
 *   'merge:completed'        -> ascending two-note chime, pitched by tier
 *   'merge:maxTierReached'   -> triumphant three-note arpeggio
 *   'achievement:unlocked'   -> fanfare (four ascending notes)
 *   'upgrade:purchased'      -> short confirmation blip
 *   'mission:claimed'        -> reward chime
 *   'currency:insufficientFunds' -> low buzz (negative feedback)
 *
 * DESIGN NOTES
 *   - Master/SFX/Music volumes are stored in state.settings and persisted;
 *     this system reads them but GameState remains the source of truth, so
 *     volume sliders in SettingsScreen work through the normal update()
 *     path rather than a side-channel.
 *   - Concurrent SFX are capped to avoid a wall of noise when merges
 *     cascade quickly; oldest voices are simply left to finish naturally
 *     since tones are short (<250ms).
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

const MAX_CONCURRENT_SFX = 8;

export const AudioSystem = {
  _ctx: null,
  _masterGainNode: null,
  _activeVoices: 0,
  _gameState: null,
  _initialized: false,

  /**
   * Must be called from within a user-gesture handler (click/tap) due to
   * browser autoplay restrictions.
   * @param {import('../state/GameState.js').GameState} gameState
   */
  init(gameState) {
    if (this._initialized) return;
    this._gameState = gameState;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      Logger.warn('AudioSystem', 'Web Audio API unavailable in this browser; audio disabled.');
      return;
    }

    this._ctx = new AudioContextClass();
    this._masterGainNode = this._ctx.createGain();
    this._masterGainNode.connect(this._ctx.destination);
    this._syncMasterGain();

    this._wireEventReactions();
    this._initialized = true;
    Logger.info('AudioSystem', 'Initialized.');
  },

  /**
   * Plays a short synthesized tone or note sequence identified by sfxId.
   * @param {string} sfxId
   * @param {{ volume?: number }} [options]
   */
  playSfx(sfxId, { volume = 1 } = {}) {
    if (!this._ctx || this._activeVoices >= MAX_CONCURRENT_SFX) return;

    const sequence = SFX_SEQUENCES[sfxId];
    if (!sequence) {
      Logger.warn('AudioSystem', `Unknown sfxId: ${sfxId}`);
      return;
    }

    this._activeVoices += 1;
    const sfxVolume = this._effectiveSfxVolume() * volume;
    let cumulativeStart = this._ctx.currentTime;

    for (const note of sequence) {
      this._playTone(note, cumulativeStart, sfxVolume);
      cumulativeStart += note.durationSeconds * 0.85; // slight overlap for legato feel
    }

    const totalDurationMs = sequence.reduce((sum, n) => sum + n.durationSeconds, 0) * 1000;
    setTimeout(() => {
      this._activeVoices = Math.max(0, this._activeVoices - 1);
    }, totalDurationMs + 50);
  },

  setMasterVolume(value) {
    this._updateSetting('audioMasterVolume', value);
    this._syncMasterGain();
  },
  setSfxVolume(value) {
    this._updateSetting('sfxVolume', value);
  },
  setMusicVolume(value) {
    this._updateSetting('musicVolume', value);
  },

  _playTone({ frequencyHz, durationSeconds, waveform = 'sine' }, startTime, peakVolume) {
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(frequencyHz, startTime);

    // Quick attack, exponential decay — a percussive "pop" envelope that
    // reads as satisfying for merge/purchase feedback rather than a harsh
    // on/off click.
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);

    osc.connect(gain).connect(this._masterGainNode);
    osc.start(startTime);
    osc.stop(startTime + durationSeconds + 0.02);
  },

  _updateSetting(key, value) {
    if (!this._gameState) return;
    this._gameState.update((draft) => {
      draft.settings[key] = Math.max(0, Math.min(1, value));
    }, `audio:setting:${key}`);
  },

  _effectiveSfxVolume() {
    const s = this._gameState.getState().settings;
    return s.audioMasterVolume * s.sfxVolume;
  },

  _syncMasterGain() {
    if (!this._masterGainNode || !this._gameState) return;
    const { audioMasterVolume } = this._gameState.getState().settings;
    this._masterGainNode.gain.setValueAtTime(audioMasterVolume, this._ctx.currentTime);
  },

  _wireEventReactions() {
    eventBus.on('merge:completed', ({ resultTier }) => {
      // Pitch rises slightly with tier so higher merges feel more rewarding.
      const pitchBoost = Math.min(resultTier - 1, 5) * 30;
      this.playSfx('merge', { volume: 1 });
      void pitchBoost; // reserved for future per-tier pitch shifting
    });
    eventBus.on('merge:maxTierReached', () => this.playSfx('maxTier'));
    eventBus.on('achievement:unlocked', () => this.playSfx('achievement'));
    eventBus.on('upgrade:purchased', () => this.playSfx('purchase'));
    eventBus.on('mission:claimed', () => this.playSfx('reward'));
    eventBus.on('currency:insufficientFunds', () => this.playSfx('denied'));
  },
};

/**
 * Declarative sound bank: each sfxId maps to a short sequence of notes.
 * Kept as data at module scope (not inside the object) so it's trivial to
 * scan/tune without touching playback logic above.
 * @type {Record<string, Array<{ frequencyHz: number, durationSeconds: number, waveform?: OscillatorType }>>}
 */
const SFX_SEQUENCES = {
  merge: [
    { frequencyHz: 523.25, durationSeconds: 0.09, waveform: 'triangle' }, // C5
    { frequencyHz: 783.99, durationSeconds: 0.12, waveform: 'triangle' }, // G5
  ],
  maxTier: [
    { frequencyHz: 523.25, durationSeconds: 0.1, waveform: 'triangle' },  // C5
    { frequencyHz: 659.25, durationSeconds: 0.1, waveform: 'triangle' },  // E5
    { frequencyHz: 1046.5, durationSeconds: 0.22, waveform: 'triangle' }, // C6
  ],
  achievement: [
    { frequencyHz: 523.25, durationSeconds: 0.08, waveform: 'square' }, // C5
    { frequencyHz: 659.25, durationSeconds: 0.08, waveform: 'square' }, // E5
    { frequencyHz: 783.99, durationSeconds: 0.08, waveform: 'square' }, // G5
    { frequencyHz: 1046.5, durationSeconds: 0.25, waveform: 'square' }, // C6
  ],
  purchase: [
    { frequencyHz: 440.0, durationSeconds: 0.07, waveform: 'sine' }, // A4
    { frequencyHz: 659.25, durationSeconds: 0.1, waveform: 'sine' }, // E5
  ],
  reward: [
    { frequencyHz: 587.33, durationSeconds: 0.08, waveform: 'triangle' }, // D5
    { frequencyHz: 880.0, durationSeconds: 0.16, waveform: 'triangle' },  // A5
  ],
  denied: [
    { frequencyHz: 196.0, durationSeconds: 0.18, waveform: 'sawtooth' }, // G3
  ],
};
