/**
 * SettingsModal.js
 * ---------------------------------------------------------------------------
 * Player-facing settings modal.
 *
 * Audio volume changes are delegated to AudioSystem so each audio setting
 * produces exactly one GameState update and the live Web Audio graph is
 * synchronized immediately.
 *
 * Non-audio settings continue to use GameState directly.
 * ---------------------------------------------------------------------------
 */

import { h } from '../Renderer.js';
import { Modal } from './Modal.js';
import { Toast } from './Toast.js';
import { createButton } from './Button.js';

export const SettingsModal = {
  open(ctx) {
    const state = ctx.gameState.getState();

    const bodyEl = h('div', { class: 'settings-modal-body' }, [
      this._buildVolumeRow(
        'Master Volume',
        'audioMasterVolume',
        state,
        ctx
      ),

      this._buildVolumeRow(
        'Music Volume',
        'musicVolume',
        state,
        ctx
      ),

      this._buildVolumeRow(
        'SFX Volume',
        'sfxVolume',
        state,
        ctx
      ),

      this._buildMusicToggle(ctx),

      this._buildThemeRow(state, ctx),

      this._buildReducedMotionToggle(state, ctx),

      this._buildSaveActions(ctx),
    ]);

    Modal.open({
      title: 'Settings',
      bodyEl,
      actions: [
        {
          label: 'Done',
          variant: 'primary',
        },
      ],
    });
  },

  _buildVolumeRow(
    label,
    settingKey,
    state,
    ctx
  ) {
    const initialValue = Number(
      state.settings[settingKey] ?? 0
    );

    const valueLabel = h(
      'span',
      {
        class: 'settings-row-value',
      },
      `${Math.round(initialValue * 100)}%`
    );

    const input = h(
      'input',
      {
        type: 'range',
        min: '0',
        max: '1',
        step: '0.01',
        value: String(initialValue),
        class: 'settings-slider',

        'aria-label': label,

        onInput: (e) => {
          const value = Math.max(
            0,
            Math.min(
              1,
              Number(e.target.value) || 0
            )
          );

          valueLabel.textContent =
            `${Math.round(value * 100)}%`;

          const audioSystem =
            ctx.systems.audioSystem;

          if (
            audioSystem &&
            typeof audioSystem[
              this._audioSetterFor(settingKey)
            ] === 'function'
          ) {
            audioSystem[
              this._audioSetterFor(settingKey)
            ](value);

            return;
          }

          // Defensive fallback if AudioSystem is unavailable.
          ctx.gameState.update(
            (draft) => {
              draft.settings[settingKey] = value;
            },
            `settings:${settingKey}`
          );
        },
      }
    );

    return h(
      'div',
      {
        class: 'settings-row',
      },
      [
        h(
          'label',
          {
            class: 'settings-row-label',
          },
          label
        ),

        h(
          'div',
          {
            class: 'settings-row-control',
          },
          [
            input,
            valueLabel,
          ]
        ),
      ]
    );
  },

  _audioSetterFor(settingKey) {
    const setters = {
      audioMasterVolume: 'setMasterVolume',
      musicVolume: 'setMusicVolume',
      sfxVolume: 'setSfxVolume',
    };

    return setters[settingKey];
  },

  _buildMusicToggle(ctx) {
    const audioSystem =
      ctx.systems.audioSystem;

    const enabled =
      audioSystem?.isMusicPlaying?.() ?? true;

    const input = h(
      'input',
      {
        type: 'checkbox',
        class: 'settings-checkbox',
        checked: enabled ? '' : undefined,

        'aria-label': 'Ambient Music',

        onChange: (e) => {
          audioSystem?.toggleMusic?.(
            e.target.checked
          );
        },
      }
    );

    return h(
      'label',
      {
        class: 'settings-row settings-row--toggle',
      },
      [
        h(
          'span',
          {
            class: 'settings-row-label',
          },
          'Ambient Music'
        ),

        input,
      ]
    );
  },

  _buildThemeRow(state, ctx) {
    const options = [
      {
        value: 'system',
        label: 'Auto',
      },
      {
        value: 'light',
        label: 'Light',
      },
      {
        value: 'dark',
        label: 'Dark',
      },
    ];

    const buttons = options.map(
      (opt) =>
        h(
          'button',
          {
            class:
              `theme-option-btn ${
                state.settings.theme === opt.value
                  ? 'is-active'
                  : ''
              }`,

            type: 'button',

            onClick: () => {
              ctx.gameState.update(
                (draft) => {
                  draft.settings.theme =
                    opt.value;
                },
                'settings:theme'
              );

              document.body.dataset.theme =
                opt.value;

              for (const btn of buttons) {
                btn.classList.remove(
                  'is-active'
                );
              }

              const clicked =
                buttons[
                  options.findIndex(
                    (o) =>
                      o.value === opt.value
                  )
                ];

              clicked?.classList.add(
                'is-active'
              );
            },
          },
          opt.label
        )
    );

    return h(
      'div',
      {
        class: 'settings-row',
      },
      [
        h(
          'label',
          {
            class: 'settings-row-label',
          },
          'Theme'
        ),

        h(
          'div',
          {
            class: 'theme-option-group',
          },
          buttons
        ),
      ]
    );
  },

  _buildReducedMotionToggle(state, ctx) {
    const input = h(
      'input',
      {
        type: 'checkbox',
        class: 'settings-checkbox',

        checked:
          state.settings.reducedMotion
            ? ''
            : undefined,

        'aria-label': 'Reduce Motion',

        onChange: (e) => {
          ctx.gameState.update(
            (draft) => {
              draft.settings.reducedMotion =
                e.target.checked;
            },
            'settings:reducedMotion'
          );
        },
      }
    );

    return h(
      'label',
      {
        class:
          'settings-row settings-row--toggle',
      },
      [
        h(
          'span',
          {
            class: 'settings-row-label',
          },
          'Reduce Motion'
        ),

        input,
      ]
    );
  },

  _buildSaveActions(ctx) {
    return h(
      'div',
      {
        class: 'settings-save-actions',
      },
      [
        createButton({
          label: 'Export Save',
          variant: 'secondary',

          onClick: () => {
            const json =
              ctx.systems.saveManager
                .exportSaveString();

            if (
              navigator.clipboard?.writeText
            ) {
              navigator.clipboard.writeText(
                json
              );

              Toast.show(
                'Save copied to clipboard',
                {
                  variant: 'success',
                }
              );
            } else {
              Toast.show(
                'Clipboard unavailable in this browser',
                {
                  variant: 'warning',
                }
              );
            }
          },
        }),

        createButton({
          label: 'Reset Game',
          variant: 'danger',

          onClick: () => {
            this._confirmReset(ctx);
          },
        }),
      ]
    );
  },

  _confirmReset(ctx) {
    Modal.open({
      title: 'Reset Game?',

      bodyEl: h(
        'p',
        {},
        'This will permanently erase your progress. This cannot be undone.'
      ),

      actions: [
        {
          label: 'Cancel',
          variant: 'secondary',
        },

        {
          label: 'Erase Everything',
          variant: 'danger',

          onClick: () => {
            ctx.systems.saveManager
              .hardReset();

            window.location.reload();
          },
        },
      ],
    });
  },
};
