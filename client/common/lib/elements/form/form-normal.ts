import { type TemplateResult, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { ptTr } from '../../directives/translation'
import { LivechatElement } from '../livechat'
import type { AnyFormSchema, FormRecord, FormSectionProps } from './form-base'
import { FormBuilder, getNestedModelValue, keyToId } from './form-base'

export interface ApplyEvent<Form extends FormRecord> extends CustomEvent {
  detail: Form
}

@customElement('livechat-form')
export class Form extends FormBuilder<FormRecord, typeof LivechatElement>(LivechatElement) {
  @property({ type: Array, attribute: false })
  public sections: FormSectionProps[] = []

  public readonly _onSubmit = async (e?: Event): Promise<void> => {
    e?.preventDefault()
    if (!this.validate()) return

    this.dispatchEvent(new CustomEvent('apply', { detail: this.model, composed: true }))
    console.log('config save', e, this.validate())
  }

  public async resetForm(e?: Event): Promise<void> {
    e?.preventDefault()
    this.actionDisabled = true
    // this._asyncTaskRender = this._initTask()
    // this.requestUpdate()
  }

  public resetValidation(e?: Event): void {
    console.log('reset validation', e)
  }

  public validate(): boolean {
    const items = this.sections.flatMap((section) => section.items)
    const isValid = items.map((item) => this._validateItemValue(item)).every((valid) => valid)
    console.log('all validation', this.validations)
    return isValid
  }

  protected _renderFormGroup(item: AnyFormSchema): TemplateResult {
    const formItem = this._getRenderItemFn(item).bind(this)(item)
    const helpPage = item.helpPage
      ? html`<livechat-help-button .page=${item.helpPage}></livechat-help-button>`
      : nothing

    return item.visible?.(this.model) !== false
      ? html`
          <div class="form-group">
            ${item.kind === 'checkbox'
              ? html`<label>${formItem} ${item.label} ${helpPage}</label>`
              : item.kind === 'button'
              ? html`${formItem}`
              : html`<label for=${item.id!}>${item.label} ${helpPage}</label> ${formItem}`}
            ${item.description ? html`<div id="${item.id}-description" class="form-group-description"><p>${item.description}</p></div>` : nothing}
            ${item.feedback ? html`<div id="${item.id}-feedback" role="alert" class="form-error">${item.feedback}</div>` : nothing}
          </div>
        `
      : html``
  }

  protected _getFormatedSections() {
    return this.sections.map((section) => {
      const items = section.items.map((item) => {
        const feedback = this.validations[item.key]
        return {
          ...item,
          id: item.id || `peertube-livechat-form-${keyToId(item.key)}`,
          default: getNestedModelValue(item.key, this.model) ?? item.default,
          feedback,
          valid: feedback ? feedback.length === 0 : undefined
        }
      })
      return {
        ...section,
        items
      }
    })
  }

  protected override render = (): TemplateResult => {
    console.log('render form')
    const sections = this._getFormatedSections()

    return html`
      <pre>${JSON.stringify(this.model, undefined, 2)}</pre>
      <pre>${JSON.stringify(this.validations, undefined, 2)}</pre>

      <form
        livechat-configuration-channel-options
        role="form"
        @submit=${this._onSubmit}
        @change=${this.resetValidation}
        novalidate
      >
        ${repeat(
          sections,
          (section) => section.label,
          (section) => html`
            <div class="pt-two-cols mt-4">
              <div class="title-col">
                <h2>
                  ${section.label}
                  ${section.helpPage
                    ? html`<livechat-help-button .page=${section.helpPage}></livechat-help-button>`
                    : nothing}
                </h2>
                ${section.description
                  ? html`<div class="inner-form-description"><p>${section.description}</p></div>`
                  : nothing}
              </div>

              <div class="content-col">
                ${repeat(
                  section.items,
                  (item) => item.key,
                  (item) => this._renderFormGroup(item)
                )}
              </div>
            </div>
          `
        )}

        <div class="form-group mt-5">
          <input
            type="reset"
            .value=${ptTr('LOC_CANCEL') as string}
            ?disabled=${this.actionDisabled}
            class="peertube-button primary-button"
          />
          <input
            type="submit"
            .value=${ptTr('LOC_SAVE') as string}
            ?disabled=${this.actionDisabled}
            class="peertube-button primary-button"
          />
        </div>
      </form>
    `
  }
}
