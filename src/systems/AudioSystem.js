/**
 * AudioSystem.js
 * ---------------------------------------------------------------------------
 * Owns all game audio:
 *   - short procedural SFX
 *   - looping procedural ambient music
 *   - master / SFX / music volume control
 *
 * Uses the Web Audio API directly and requires no external audio assets.
 *
 * PUBLIC CONTRACT
 *   init(gameState) -> void
 *   playSfx(sfxId, options?) -> void
 *   setMasterVolume(0..1) -> void
 *   setSfxVolume(0..1) -> void
 *   setMusicVolume(0..1) -> void
 *   toggleMusic(shouldPlay) -> void
 *
 * GameState remains the source of truth for persisted volume settings.
 * ---------------------------------------------------------------------------
 */

import { eventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';

const MAX_CONCURRENT_SFX = 8;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const AudioSystem = {
  _ctx: null,
  _masterGainNode: null,
  _sfxGainNode: null,
  _musicGainNode: null,
  _musicScheduler: null,
  _musicNextNoteTime: 0,
  _musicStep: 0,
  _musicEnabled: true,
  _activeVoices: 0,
  _gameState: null,
  _initialized: false,
  _eventsWired: false,

  /**
   * Must normally be called from a user gesture because of browser autoplay
   * restrictions.
   *
   * @param {import('../state/GameState.js').GameState} gameState
   */
  init(gameState) {
    if (!gameState) {
      Logger.warn('AudioSystem', 'Cannot initialize without GameState.');
      return;
    }

    this._gameState = gameState;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      Logger.warn(
        'AudioSystem',
        'Web Audio API unavailable in this browser; audio disabled.'
      );
      return;
    }

    if (this._initialized) {
      this._resumeContext();
      this._syncAllGains();
      return;
    }

    try {
      this._ctx = new AudioContextClass();

      this._masterGainNode = this._ctx.createGain();
      this._sfxGainNode = this._ctx.createGain();
      this._musicGainNode = this._ctx.createGain();

      this._sfxGainNode.connect(this._masterGainNode);
      this._musicGainNode.connect(this._masterGainNode);
      this._masterGainNode.connect(this._ctx.destination);

      this._syncAllGains();

      this._startAmbientMusic();

      this._wireEventReactions();
      this._initialized = true;

      this._resumeContext();

      Logger.info('AudioSystem', 'Initialized.');
    } catch (error) {
      Logger.warn('AudioSystem', 'Audio initialization failed.', error);
      this._ctx = null;
      this._masterGainNode = null;
      this._sfxGainNode = null;
      this._musicGainNode = null;
    }
  },

  /**
   * Resume AudioContext when browser autoplay policy has suspended it.
   */
  _resumeContext() {
    if (!this._ctx) return;

    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch((error) => {
        Logger.warn('AudioSystem', 'Unable to resume AudioContext.', error);
      });
    }
  },

  /**
   * Plays a short synthesized sound effect.
   *
   * @param {string} sfxId
   * @param {{ volume?: number }} [options]
   */
  playSfx(sfxId, { volume = 1 } = {}) {
    if (!this._ctx || !this._sfxGainNode) return;
    if (this._activeVoices >= MAX_CONCURRENT_SFX) return;

    const sequence = SFX_SEQUENCES[sfxId];

    if (!sequence) {
      Logger.warn('AudioSystem', `Unknown sfxId: ${sfxId}`);
      return;
    }

    this._resumeContext();

    this._activeVoices += 1;

    const sfxVolume = Math.max(
      0,
      Number(volume) || 0
    );

    let cumulativeStart = this._ctx.currentTime;

    for (const note of sequence) {
      this._playTone(
        note,
        cumulativeStart,
        sfxVolume
      );

      cumulativeStart += note.durationSeconds * 0.85;
    }

    const totalDurationMs =
      sequence.reduce(
        (sum, note) => sum + note.durationSeconds,
        0
      ) * 1000;

    window.setTimeout(() => {
      this._activeVoices = Math.max(
        0,
        this._activeVoices - 1
      );
    }, totalDurationMs + 50);
  },

  setMasterVolume(value) {
    const normalized = clamp01(value);

    this._updateSetting(
      'audioMasterVolume',
      normalized
    );

    this._syncAllGains();
  },

  setSfxVolume(value) {
    const normalized = clamp01(value);

    this._updateSetting(
      'sfxVolume',
      normalized
    );

    this._syncAllGains();
  },

  setMusicVolume(value) {
    const normalized = clamp01(value);

    this._updateSetting(
      'musicVolume',
      normalized
    );

    this._syncAllGains();
  },

  /**
   * Enable/disable ambient music without changing the persisted music volume.
   *
   * @param {boolean} shouldPlay
   */
  toggleMusic(shouldPlay) {
    this._musicEnabled = Boolean(shouldPlay);
    this._syncMusicGain();
  },

  /**
   * Convenience method for UI callers.
   */
  isMusicPlaying() {
    return this._musicEnabled;
  },

  /**
   * Create a very quiet procedural ambient pad.
   *
   * The oscillators run continuously, while the gain node controls the
   * audible level. No external audio files are required.
   */
  /**
   * Start a lightweight procedural game soundtrack.
   *
   * Instead of holding one continuous chord, the soundtrack uses a
   * repeating musical pattern containing bass, chords, melody and pulse.
   * Everything is synthesized with Web Audio API oscillators, so the game
   * still requires zero external audio assets.
   */
  /**
   * Start the procedural Merge Empire soundtrack.
   *
   * Built to feel closer to a polished casual/mobile merge game:
   * warm bass, gentle harmony, repeating melody, light rhythmic pulse,
   * and occasional sparkle accents.
   */
  _startAmbientMusic() {
    if (!this._ctx || !this._musicGainNode) return;
    if (this._musicScheduler) return;

    this._musicStep = 0;
    this._musicNextNoteTime =
      this._ctx.currentTime + 0.08;

    const scheduleAheadTime = 0.16;

    const scheduler = () => {
      if (!this._ctx || !this._musicGainNode) return;

      while (
        this._musicNextNoteTime <
        this._ctx.currentTime + scheduleAheadTime
      ) {
        this._scheduleMusicStep(
          this._musicStep,
          this._musicNextNoteTime
        );

        this._musicStep =
          (this._musicStep + 1) % MUSIC_PATTERN.length;

        this._musicNextNoteTime += MUSIC_STEP_SECONDS;
      }
    };

    this._musicScheduler = window.setInterval(
      scheduler,
      50
    );

    scheduler();
  },

  /**
   * Schedule one step of the soundtrack.
   */
  _scheduleMusicStep(step, time) {
    if (!this._ctx || !this._musicGainNode) return;

    const pattern = MUSIC_PATTERN[step];
    if (!pattern) return;

    // Warm bass foundation.
    if (pattern.bass) {
      this._playMusicNote(
        pattern.bass,
        time,
        0.050,
        'sine',
        0.25
      );
    }

    // Soft harmonic layer.
    if (pattern.chord) {
      this._playMusicNote(
        pattern.chord,
        time,
        0.023,
        'triangle',
        0.34
      );
    }

    // Main melody.
    if (pattern.melody) {
      this._playMusicNote(
        pattern.melody,
        time + 0.018,
        0.033,
        'triangle',
        0.20
      );
    }

    // Gentle rhythmic pulse.
    if (pattern.pulse) {
      this._playMusicNote(
        pattern.pulse,
        time + 0.12,
        0.010,
        'sine',
        0.075
      );
    }

    // Occasional high sparkle at phrase endings.
    if (pattern.sparkle) {
      this._playMusicNote(
        pattern.sparkle,
        time + 0.015,
        0.015,
        'sine',
        0.14
      );
    }
  },

  /**
   * Create one soft musical note with a natural attack/release.
   */
  _playMusicNote(
    frequencyHz,
    startTime,
    volume,
    waveform,
    durationSeconds
  ) {
    if (!this._ctx || !this._musicGainNode) return;

    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = waveform;

    osc.frequency.setValueAtTime(
      frequencyHz,
      startTime
    );

    gain.gain.setValueAtTime(
      0.0001,
      startTime
    );

    gain.gain.linearRampToValueAtTime(
      volume,
      startTime + 0.025
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + durationSeconds
    );

    osc.connect(gain).connect(
      this._musicGainNode
    );

    osc.start(startTime);

    osc.stop(
      startTime + durationSeconds + 0.03
    );
  },


  _playTone(
    { frequencyHz, durationSeconds, waveform = 'sine' },
    startTime,
    peakVolume
  ) {
    if (!this._ctx || !this._sfxGainNode) return;

    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    const safeDuration = Math.max(
      0.02,
      Number(durationSeconds) || 0.02
    );

    const safePeakVolume = Math.max(
      0.0001,
      Number(peakVolume) || 0
    );

    osc.type = waveform;
    osc.frequency.setValueAtTime(
      frequencyHz,
      startTime
    );

    gain.gain.setValueAtTime(
      0.0001,
      startTime
    );

    gain.gain.linearRampToValueAtTime(
      safePeakVolume,
      startTime + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + safeDuration
    );

    osc.connect(gain).connect(this._sfxGainNode);

    osc.start(startTime);
    osc.stop(startTime + safeDuration + 0.02);
  },

  _updateSetting(key, value) {
    if (!this._gameState) return;

    this._gameState.update(
      (draft) => {
        draft.settings[key] = clamp01(value);
      },
      `audio:setting:${key}`
    );
  },

  _getSettings() {
    if (!this._gameState) {
      return {
        audioMasterVolume: 0,
        sfxVolume: 0,
        musicVolume: 0,
      };
    }

    return this._gameState.getState().settings;
  },

  _syncAllGains() {
    this._syncMasterGain();
    this._syncSfxGain();
    this._syncMusicGain();
  },

  _syncMasterGain() {
    if (!this._masterGainNode || !this._ctx) return;

    const { audioMasterVolume } = this._getSettings();

    this._masterGainNode.gain.setTargetAtTime(
      clamp01(audioMasterVolume),
      this._ctx.currentTime,
      0.015
    );
  },

  _syncSfxGain() {
    if (!this._sfxGainNode || !this._ctx) return;

    const { sfxVolume } = this._getSettings();

    this._sfxGainNode.gain.setTargetAtTime(
      clamp01(sfxVolume),
      this._ctx.currentTime,
      0.015
    );
  },

  _syncMusicGain() {
    if (!this._musicGainNode || !this._ctx) return;

    const { musicVolume } = this._getSettings();

    const target = this._musicEnabled
      ? clamp01(musicVolume)
      : 0;

    // Keep ambient music intentionally subtle.
    const musicLevel = target * 0.12;

    this._musicGainNode.gain.setTargetAtTime(
      musicLevel,
      this._ctx.currentTime,
      0.25
    );
  },

  _wireEventReactions() {
    if (this._eventsWired) return;

    this._eventsWired = true;

    eventBus.on(
      'merge:completed',
      ({ resultTier }) => {
        const tier = Math.max(
          1,
          Number(resultTier) || 1
        );

        const volume = Math.min(
          1.15,
          0.88 + tier * 0.045
        );

        this.playSfx('merge', { volume });
      }
    );

    eventBus.on(
      'merge:maxTierReached',
      () => this.playSfx('maxTier')
    );

    eventBus.on(
      'achievement:unlocked',
      () => this.playSfx('achievement')
    );

    eventBus.on(
      'upgrade:purchased',
      () => this.playSfx('purchase')
    );

    eventBus.on(
      'mission:claimed',
      () => this.playSfx('reward')
    );

    eventBus.on(
      'currency:insufficientFunds',
      () => this.playSfx('denied')
    );
  },
};

/**
 * Procedural soundtrack.
 *
 * The pattern is intentionally simple and loop-friendly:
 * C major -> A minor -> F major -> G major.
 *
 * Frequencies are used directly so no musical library is required.
 */
const MUSIC_STEP_SECONDS = 0.30;

/**
 * 32-step casual merge-game soundtrack.
 *
 * Progression:
 *   C major -> A minor -> F major -> G major
 *
 * The melody deliberately moves mostly by nearby notes so it feels
 * catchy and relaxed rather than like a technical scale exercise.
 */
const MUSIC_PATTERN = [
  // ---- C major phrase --------------------------------------------
  { bass: 130.81, chord: 261.63, melody: 523.25, pulse: 261.63 },
  { bass: 130.81, chord: 329.63, melody: 587.33 },
  { bass: 130.81, chord: 392.00, melody: 659.25, pulse: 392.00 },
  { bass: 130.81, chord: 329.63, melody: 587.33 },

  { bass: 130.81, chord: 261.63, melody: 523.25, pulse: 261.63 },
  { bass: 130.81, chord: 329.63, melody: 659.25 },
  { bass: 130.81, chord: 392.00, melody: 783.99, sparkle: 1046.50 },
  { bass: 130.81, chord: 329.63, melody: 659.25 },

  // ---- A minor phrase --------------------------------------------
  { bass: 110.00, chord: 220.00, melody: 440.00, pulse: 220.00 },
  { bass: 110.00, chord: 261.63, melody: 523.25 },
  { bass: 110.00, chord: 329.63, melody: 587.33, pulse: 329.63 },
  { bass: 110.00, chord: 261.63, melody: 523.25 },

  { bass: 110.00, chord: 220.00, melody: 440.00, pulse: 220.00 },
  { bass: 110.00, chord: 261.63, melody: 587.33 },
  { bass: 110.00, chord: 329.63, melody: 659.25, sparkle: 880.00 },
  { bass: 110.00, chord: 261.63, melody: 587.33 },

  // ---- F major phrase --------------------------------------------
  { bass: 87.31, chord: 174.61, melody: 349.23, pulse: 174.61 },
  { bass: 87.31, chord: 261.63, melody: 440.00 },
  { bass: 87.31, chord: 349.23, melody: 523.25, pulse: 349.23 },
  { bass: 87.31, chord: 261.63, melody: 440.00 },

  { bass: 87.31, chord: 174.61, melody: 349.23, pulse: 174.61 },
  { bass: 87.31, chord: 261.63, melody: 523.25 },
  { bass: 87.31, chord: 349.23, melody: 698.46, sparkle: 1046.50 },
  { bass: 87.31, chord: 261.63, melody: 587.33 },

  // ---- G major phrase --------------------------------------------
  { bass: 98.00, chord: 196.00, melody: 392.00, pulse: 196.00 },
  { bass: 98.00, chord: 293.66, melody: 493.88 },
  { bass: 98.00, chord: 392.00, melody: 587.33, pulse: 392.00 },
  { bass: 98.00, chord: 293.66, melody: 493.88 },

  { bass: 98.00, chord: 196.00, melody: 392.00, pulse: 196.00 },
  { bass: 98.00, chord: 293.66, melody: 587.33 },
  { bass: 98.00, chord: 392.00, melody: 783.99, sparkle: 1174.66 },
  { bass: 98.00, chord: 261.63, melody: 659.25 },
];



/**
 * Procedural sound bank.
 *
 * @type {Record<string, Array<{
 *   frequencyHz: number,
 *   durationSeconds: number,
 *   waveform?: OscillatorType
 * }>>}
 */
const SFX_SEQUENCES = {
  merge: [
    {
      frequencyHz: 523.25,
      durationSeconds: 0.09,
      waveform: 'triangle',
    },
    {
      frequencyHz: 783.99,
      durationSeconds: 0.12,
      waveform: 'triangle',
    },
  ],

  maxTier: [
    {
      frequencyHz: 523.25,
      durationSeconds: 0.1,
      waveform: 'triangle',
    },
    {
      frequencyHz: 659.25,
      durationSeconds: 0.1,
      waveform: 'triangle',
    },
    {
      frequencyHz: 1046.5,
      durationSeconds: 0.22,
      waveform: 'triangle',
    },
  ],

  achievement: [
    {
      frequencyHz: 523.25,
      durationSeconds: 0.08,
      waveform: 'square',
    },
    {
      frequencyHz: 659.25,
      durationSeconds: 0.08,
      waveform: 'square',
    },
    {
      frequencyHz: 783.99,
      durationSeconds: 0.08,
      waveform: 'square',
    },
    {
      frequencyHz: 1046.5,
      durationSeconds: 0.25,
      waveform: 'square',
    },
  ],

  purchase: [
    {
      frequencyHz: 440.0,
      durationSeconds: 0.07,
      waveform: 'sine',
    },
    {
      frequencyHz: 659.25,
      durationSeconds: 0.1,
      waveform: 'sine',
    },
  ],

  reward: [
    {
      frequencyHz: 587.33,
      durationSeconds: 0.08,
      waveform: 'triangle',
    },
    {
      frequencyHz: 880.0,
      durationSeconds: 0.16,
      waveform: 'triangle',
    },
  ],

  denied: [
    {
      frequencyHz: 196.0,
      durationSeconds: 0.18,
      waveform: 'sawtooth',
    },
  ],
};
