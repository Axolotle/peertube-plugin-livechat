// SPDX-FileCopyrightText: 2025 Nicolas Chesnais <https://autre.space>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { LivechatElement } from './livechat'

@customElement('livechat-form-checkbox')
export class FormCheckbox extends LivechatElement {
  @property({ attribute: false })
  public label = ''

  @property({ attribute: false })
  public model = false

  private _onChange (e: Event): void {
    this.dispatchEvent(new CustomEvent('model-update', {
      detail: e.target.checked,
      bubbles: true,
      composed: true
    }))
  }

  protected override render = (): unknown => {
    return html`
      <label>
        <input
          type="checkbox"
          name=${this.id}
          id=${this.id}
          @change=${this._onChange}
          ?checked=${this.model}
        />
        ${this.label}
      </label>
    `
  }
}
