// SPDX-FileCopyrightText: 2024 John Livingston <https://www.john-livingston.fr/>
//
// SPDX-License-Identifier: AGPL-3.0-only

// FIXME: @stylistic/indent is buggy with strings literrals.
/* eslint-disable @stylistic/indent */

import type { AdminFirewallElement } from '../elements/admin-firewall'
import type { TemplateResult } from 'lit'
import type { DynamicFormSchema } from '../../../lib/elements/form/form-table'
import { maxFirewallFiles, maxFirewallNameLength, maxFirewallFileSize } from 'shared/lib/admin-firewall'
import { ptTr } from '../../../lib/directives/translation'
import { html } from 'lit'

export function tplAdminFirewall (el: AdminFirewallElement): TemplateResult {
  const tableSchema: DynamicFormSchema = [
    {
      kind: 'checkbox',
      path: 'enabled',
      label: ptTr(LOC_PROSODY_FIREWALL_FILE_ENABLED),
      default: true
    },
    {
      kind: 'text',
      path: 'name',
      label: ptTr(LOC_PROSODY_FIREWALL_NAME),
      description: ptTr(LOC_PROSODY_FIREWALL_NAME_DESC),
      default: '',
      maxlength: maxFirewallNameLength,
      headerClassList: ['peertube-livechat-admin-firewall-col-name']
    },
    {
      kind: 'textarea',
      path: 'content',
      label: ptTr(LOC_PROSODY_FIREWALL_CONTENT),
      default: '',
      maxlength: maxFirewallFileSize,
      headerClassList: ['peertube-livechat-admin-firewall-col-content']
    }
  ]

  return html`
    <div class="margin-content peertube-plugin-livechat-admin-firewall">
      <h1>
        ${ptTr(LOC_PROSODY_FIREWALL_CONFIGURATION)}
      </h1>
      <p>
        ${ptTr(LOC_PROSODY_FIREWALL_CONFIGURATION_HELP, true)}
        <livechat-help-button .page=${'documentation/admin/mod_firewall'}>
        </livechat-help-button>
      </p>
      ${
        el.firewallConfiguration?.enabled
          ? ''
          : html`<p class="peertube-plugin-livechat-warning">${ptTr(LOC_PROSODY_FIREWALL_DISABLED_WARNING, true)}</p>`
      }

      <form role="form" @submit=${el.saveConfig} @change=${el.resetValidation}>
        <livechat-dynamic-table-form
          .schema=${tableSchema}
          .maxLines=${maxFirewallFiles}
          .validations=${el.validationError?.properties}
          .validationPrefix=${'files'}
          .form=${el.firewallConfiguration?.files ?? []}
          @update-form=${(e: CustomEvent) => {
              el.resetValidation(e)
              if (el.firewallConfiguration) {
                el.firewallConfiguration.files = e.detail
                el.requestUpdate('firewallConfiguration')
              }
            }
          }
        ></livechat-dynamic-table-form>

        <div class="form-group mt-5">
          <button type="reset" @click=${el.reset} ?disabled=${el.actionDisabled}>
            ${ptTr(LOC_CANCEL)}
          </button>
          <button type="submit" ?disabled=${el.actionDisabled}>
            ${ptTr(LOC_SAVE)}
          </button>
        </div>
      </form>
    </div>`
}
