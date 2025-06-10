// SPDX-FileCopyrightText: 2024 Mehdi Benadel <https://mehdibenadel.com>
// SPDX-FileCopyrightText: 2024 John Livingston <https://www.john-livingston.fr/>
// SPDX-FileCopyrightText: 2025 Nicolas Chesnais <https://autre.space>
//
// SPDX-License-Identifier: AGPL-3.0-only

// FIXME: @stylistic/indent is buggy with strings literrals.
/* eslint-disable @stylistic/indent */

import { html, TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { DirectiveResult } from 'lit/directive'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { AddSVG, RemoveSVG } from '../../buttons'
import { ptTr } from '../../directives/translation'
import { FieldSchema, FormArray, FormBaseElement, FormTypes, PartialFieldSchema } from './form-base'

interface DynamicTableRowData {
  _id: number
  _originalIndex: number
  row: Record<string, FormTypes>
}

interface DynamicFormHeaderCellData {
  colName: TemplateResult | DirectiveResult
  description?: TemplateResult | DirectiveResult
  headerClassList?: string[]
}

export type DynamicFormHeader = Record<string, DynamicFormHeaderCellData>
export type DynamicFormSchema = Record<string, PartialFieldSchema>

@customElement('livechat-dynamic-table-form')
export class DynamicTableFormElement extends FormBaseElement {
  @property({ attribute: false })
  public header: DynamicFormHeader = {}

  @property({ attribute: false })
  public schema: DynamicFormSchema = {}

  @property({ attribute: false })
  public maxLines?: number = undefined

  @property({ type: Array, attribute: false })
  public override form: FormArray = []

  @state()
  public _rowsById: DynamicTableRowData[] = []

  @state()
  private _lastRowId = 1

  @property({ attribute: false })
  private columnOrder: string[] = []

  // fixes situations when list has been reinitialized or changed outside of CustomElement
  protected _updateLastRowId = (): void => {
    for (const rowById of this._rowsById) {
      this._lastRowId = Math.max(this._lastRowId, rowById._id + 1)
    }
  }

  protected _getDefaultRow = (): Record<string, FormTypes> => {
    this._updateLastRowId()
    return Object.fromEntries([...Object.entries(this.schema).map((entry) => [entry[0], entry[1].default ?? ''])])
  }

  protected _addRow = async (): Promise<void> => {
    const newRow = this._getDefaultRow()
    // Create row and assign id and original index
    this._rowsById.push({ _id: this._lastRowId++, _originalIndex: this.form.length, row: newRow })
    this.form.push(newRow)
    this.requestUpdate('form')
    this.requestUpdate('_rowsById')
    this.dispatchEvent(new CustomEvent('update', { detail: this.form }))

    // Once the update is completed, we give focus to the first input field of the new row.
    await this.updateComplete
    // Note: we make multiple querySelector, to be sure to not get a nested table.
    // We want the top level table associated tr.
    const input = this.querySelector('table')?.querySelector(
      '&>tbody>tr:last-child>td input:not([type=hidden]),' +
      '&>tbody>tr:last-child>td livechat-tags-input,' +
      '&>tbody>tr:last-child>td textarea'
    )
    if (input) {
      ;(input as HTMLElement).focus()
    }
  }

  protected _removeRow = async (rowId: number): Promise<void> => {
    const confirmMsg = await this.ptTranslate(LOC_ACTION_REMOVE_ENTRY_CONFIRM)
    await new Promise<void>((resolve, reject) => {
      this.ptOptions.peertubeHelpers.showModal({
        title: confirmMsg,
        content: '',
        close: true,
        cancel: {
          value: 'cancel',
          action: reject
        },
        confirm: {
          value: 'confirm',
          action: resolve
        }
      })
    })
    const rowToRemove = this._rowsById.filter((rowById) => rowById._id === rowId).map((rowById) => rowById.row)[0]
    this._rowsById = this._rowsById.filter((rowById) => rowById._id !== rowId)
    this.form = this.form.filter((row) => row !== rowToRemove)
    this.requestUpdate('_rowsById')
    this._dispatchUpdateFormEvent()
  }

  protected override render = (): unknown => {
    const inputId = `peertube-livechat-${this.path.replace(/_/g, '-')}-table`

    this._updateLastRowId()

    // Filter removed rows
    // FIXME: is this really necessary?
    this._rowsById = this._rowsById.filter((rowById) => this.form.includes(rowById.row))

    for (let i = 0; i < this.form.length; i++) {
      if (!this._rowsById.find((rowById) => rowById.row === this.form[i])) {
        // Add row and assign id
        this._rowsById.push({ _id: this._lastRowId++, _originalIndex: i, row: this.form[i] })
      } else {
        // Update index in case it changed
        this._rowsById
          .filter((rowById) => rowById.row === this.form[i])
          .forEach((value) => {
            value._originalIndex = i
          })
      }
    }

    if (this.columnOrder.length !== Object.keys(this.header).length) {
      this.columnOrder = this.columnOrder.filter((key) => Object.keys(this.header).includes(key))
      this.columnOrder.push(...Object.keys(this.header).filter((key) => !this.columnOrder.includes(key)))
    }

    return html`
      <div class="table-responsive">
        <table class="table" id=${inputId}>
          ${this._renderHeader()}
          <tbody>
            ${repeat(this._rowsById, (rowById) => rowById._id, this._renderDataRow)}
          </tbody>
          ${this._renderFooter()}
        </table>
      </div>
    `
  }

  protected _renderHeader = (): TemplateResult => {
    const columns = Object.entries(this.header).sort(
      ([k1, _1], [k2, _2]) => this.columnOrder.indexOf(k1) - this.columnOrder.indexOf(k2)
    )
    return html`<thead>
      <tr>
        ${columns.map(([_, v]) => this._renderHeaderCell(v))}
        <th scope="col"></th>
      </tr>
      <tr>
        ${columns.map(([_, v]) => this._renderHeaderDescriptionCell(v))}
        <th scope="col"></th>
      </tr>
    </thead>`
  }

  protected _renderHeaderCell = (headerCellData: DynamicFormHeaderCellData): TemplateResult => {
    return html`<th scope="col" class=${headerCellData.headerClassList?.join(' ') ?? ''}>
      <div data-toggle="tooltip" data-placement="bottom" data-html="true">${headerCellData.colName}</div>
    </th>`
  }

  protected _renderHeaderDescriptionCell = (headerCellData: DynamicFormHeaderCellData): TemplateResult => {
    const classList = ['livechat-dynamic-table-form-description-header']
    if (headerCellData.headerClassList) {
      classList.push(...headerCellData.headerClassList)
    }
    return html`<th scope="col" class=${classList.join(' ')}>${headerCellData.description ?? ''}</th>`
  }

  protected _renderDataRow = (rowData: DynamicTableRowData): TemplateResult => {
    const inputId = `peertube-livechat-${this.path.replace(/_/g, '-')}-row-${rowData._id}`

    return html`<tr id=${inputId}>
      ${Object.keys(this.header)
        .sort((k1, k2) => this.columnOrder.indexOf(k1) - this.columnOrder.indexOf(k2))
        .map((key) =>
          this._renderDataCell(key, rowData.row[key] ?? this.schema[key].default, rowData._id, rowData._originalIndex)
        )}
      <td class="form-group">
        <button
          type="button"
          class="dynamic-table-remove-row"
          .title=${ptTr(LOC_ACTION_REMOVE_ENTRY) as any}
          @click=${async () => this._removeRow(rowData._id)}
        >
          ${unsafeHTML(RemoveSVG)}
        </button>
      </td>
    </tr>`
  }

  protected _renderFooter = (): TemplateResult => {
    if (this.maxLines && this._rowsById.length >= this.maxLines) {
      return html``
    }
    // Note: the addRow button is in first column, so it won't be hidden if screen not wide enough.
    return html`<tfoot>
      <tr>
        <td class="dynamic-table-add-row-cell">
          <button
            type="button"
            class="dynamic-table-add-row"
            .title=${ptTr(LOC_ACTION_ADD_ENTRY) as any}
            @click=${this._addRow}
          >
            ${unsafeHTML(AddSVG)}
          </button>
        </td>
        ${Object.values(this.header).map(() => html`<td></td>`)}
      </tr>
    </tfoot>`
  }

  protected _renderDataCell = (
    propertyName: string,
    propertyValue: FormTypes,
    rowId: number,
    originalIndex: number
  ): TemplateResult => {
    const baseSchema = this.schema[propertyName] ?? {}
    const baseId = this.path.toLowerCase().replace(/[_.]/g, '-')
    const localId = propertyName.toLowerCase().replace(/[_.]/g, '-')
    const path = `${rowId}.${propertyName}`
    const schema = {
      ...baseSchema,
      path,
      id: `peertube-livechat-${baseId}-row-${originalIndex}-${localId}-${rowId}`,
      title: baseSchema.title ?? this.header[propertyName]?.colName,
      valid: !!this.validations?.[path]?.length
    }
    const classList = ['form-group']
    if (schema.colClassList?.length) classList.push(...schema.colClassList)

    return html`
      <td class=${classList.join(' ')}>${this._renderField(schema, propertyValue)} ${this._renderFeedback(schema)}</td>
    `
  }

  protected override _updateForm = (schema: FieldSchema, value: any): void => {
    const rowId = parseInt(schema.path.split('.')[0])

    if (value === undefined) {
      this.logger.warn('Could not update property : Target or value was undefined')
      return
    }

    const rowById = this._rowsById.find((rowById) => rowById._id === rowId)
    if (!rowById) {
      this.logger.warn(`Could not update property : Did not find a property named '${schema.path}' in row '${rowId}'`)
      return
    }

    switch (schema.default?.constructor) {
      case Array:
        if (value.constructor === Array || !schema.separator) {
          rowById.row[schema.path] = value
        } else {
          rowById.row[schema.path] = (value as string).split(schema.separator)
        }
        break
      case Number:
        rowById.row[schema.path] = Number(value)
        break
      default:
        rowById.row[schema.path] = value
        break
    }

    this.form = this._rowsById.map((rowById) => rowById.row)

    this.requestUpdate('_rowsById')
    this._dispatchUpdateFormEvent()
  }
}
