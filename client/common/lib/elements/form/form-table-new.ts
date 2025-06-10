import { type TemplateResult, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { ptTr } from '../../directives/translation'
import { LivechatElement } from '../livechat'
import type { AnyFormSchema, FormArray, TableSchema } from './form-base'
import { FormBuilder, getNestedModelValue, keyToId } from './form-base'

// FIXME aria-labeledby (header label) aria-describedby (header desc + local feedback)

@customElement('livechat-table-form')
export class TableForm extends FormBuilder<FormArray, typeof LivechatElement>(LivechatElement) {
  @property({ type: Array, attribute: false })
  public columns: TableSchema['columns'] = []

  @property({ type: Object, attribute: false })
  public validations: Record<string, string[]> = {}

  @property({ type: Number, attribute: false })
  public maxLines?: number = undefined

  public validate(): boolean {
    const items = this.model.flatMap((_, index) =>
      this.columns.map((item) => ({ ...item, key: `[${index}].${item.key}` }))
    )
    const isValid = items.map((item) => this._validateItemValue(item)).every((valid) => valid)
    console.log('table validation', this.validations)
    return isValid
  }

  private async _addRow(): Promise<void> {
    this.model.push(Object.fromEntries(this.columns.map((item) => [item.key, item.default])))
    this._dispatchUpdateModelEvent()

    // Once the update is completed, we give focus to the first input field of the new row.
    await this.updateComplete
    // Note: we make multiple querySelector, to be sure to not get a nested table.
    // We want the top level table associated tr.
    this.querySelector('table > tbody > tr:last-child > td')
      ?.querySelector<HTMLElement>('input:not([type=hidden]), livechat-tags-input, textarea')
      ?.focus()
  }

  private async _removeRow(rowIndex: number): Promise<void> {
    // const confirmMsg = await this.ptTranslate('LOC_ACTION_REMOVE_ENTRY_CONFIRM')
    // await new Promise<void>((resolve, reject) => {
    //   resolve()
    //   // this.ptOptions.peertubeHelpers.showModal({
    //   //   title: confirmMsg,
    //   //   content: '',
    //   //   close: true,
    //   //   cancel: {
    //   //     value: 'cancel',
    //   //     action: reject
    //   //   },
    //   //   confirm: {
    //   //     value: 'confirm',
    //   //     action: resolve
    //   //   }
    //   // })
    // })
    this.model.splice(rowIndex, 1)
    this._dispatchUpdateModelEvent()
  }

  private readonly _renderHeader = (): TemplateResult => {
    const columns = this.columns.map((column) => {
      const headerClassList = column.headerClassList?.join(' ') ?? ''
      const headerDescClassList = 'livechat-dynamic-table-form-description-header ' + headerClassList
      return { ...column, headerClassList, headerDescClassList }
    })

    return html`
      <thead>
        <tr>
          ${repeat(
            columns,
            (column) => column.key,
            (column) => html`
              <th scope="col" class=${column.headerClassList}>
                <!-- FIXME id to for aria-describedby -->
                <div data-toggle="tooltip" data-placement="bottom" data-html="true">${column.label}</div>
              </th>
            `
          )}
          <th scope="col"></th>
        </tr>
        <tr>
          ${repeat(
            columns,
            (column) => column.key,
            (column) => html` <th scope="col" class=${column.headerDescClassList}>${column.description ?? ''}</th> `
          )}
          <th scope="col"></th>
        </tr>
      </thead>
    `
  }

  private readonly _renderFormItemCell = (item: AnyFormSchema): TemplateResult => {
    const formItem = this._getRenderItemFn(item).bind(this)(item)
    const classList = 'form-group ' + (item.colClassList?.join(' ') ?? '')
    return html`
      <td class=${classList}>
        ${formItem}
        ${item.feedback ? html`<div role="alert" class="form-error">${item.feedback}</div>` : nothing}
      </td>
    `
  }

  private readonly _renderRow = (index: number): TemplateResult => {
    const trId = `peertube-livechat-${this.id}-row-${index}`
    const row = this.columns.map((item) => {
      const key = `[${index}].${item.key}`
      const feedback = this.validations[key]
      return {
        ...item,
        key,
        id: item.id || `peertube-livechat-form-table-row-${index}-${keyToId(key)}`,
        default: getNestedModelValue(key, this.model) ?? item.default,
        feedback,
        valid: feedback ? feedback.length === 0 : undefined
      }
    })

    return html`<tr id=${trId}>
      ${repeat(
        row,
        (item) => item.key,
        (item) => this._renderFormItemCell(item)
      )}
      <td class="form-group">
        <button
          type="button"
          class="dynamic-table-remove-row"
          .title=${ptTr('LOC_ACTION_REMOVE_ENTRY') as any}
          @click=${async () => this._removeRow(index)}
        >
          REMOVE ${index}
        </button>
      </td>
    </tr>`
  }

  private readonly _renderFooter = (): TemplateResult => {
    if (this.maxLines && this.model.length >= this.maxLines) return html``

    // Note: the addRow button is in first column, so it won't be hidden if screen not wide enough.
    return html`<tfoot>
      <tr>
        <td class="dynamic-table-add-row-cell">
          <button
            type="button"
            class="dynamic-table-add-row"
            .title=${ptTr('LOC_ACTION_ADD_ENTRY') as any}
            @click=${this._addRow}
          >
            ADD
          </button>
        </td>
        ${repeat(
          this.columns,
          (column) => column.key,
          () => html`<td></td>`
        )}
      </tr>
    </tfoot>`
  }

  protected override render = (): unknown => {
    return html`
      <div class="table-responsive">
        <table class="table">
          ${this._renderHeader()}

          <tbody>
            ${repeat(
              this.model,
              (_rowModel, i) => i,
              (_rowModel, i) => this._renderRow(i)
            )}
          </tbody>

          ${this._renderFooter()}
        </table>
      </div>
    `
  }
}
