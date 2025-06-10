// SPDX-FileCopyrightText: 2025 Nicolas Chesnais <https://autre.space>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { html, nothing, TemplateResult } from 'lit'
import { property } from 'lit/decorators'
import { DirectiveResult } from 'lit/directive'
import { classMap } from 'lit/directives/class-map'
import { ifDefined } from 'lit/directives/if-defined'
import { inputFileAccept, maxSize } from 'shared/lib/emojis'
import { ptTr } from '../../directives/translation'
import { ValidationErrorType } from '../../models/validation'
import { LivechatElement } from '../livechat'

export type FormTypes = number | string | boolean | Date | Array<number | string>
export type FormRecord = Record<string, FormTypes>
export type FormArray = FormRecord[]
export type AnyForm = FormRecord | FormArray

export type FieldKind =
  | 'text'
  | 'number'
  | 'range'
  | 'date'
  | 'datetime'
  | 'datetime-local'
  | 'time'
  | 'week'
  | 'month'
  | 'password'
  | 'color'
  | 'tel'
  | 'email'
  | 'url'
  | 'file'
  | 'image'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'tags'
  | 'image-file'

export interface PartialFieldSchema {
  kind: FieldKind
  path: string
  label: string | DirectiveResult
  description?: string | DirectiveResult
  title?: string | DirectiveResult
  default?: FormTypes
  min?: number
  max?: number
  minlength?: number
  maxlength?: number
  size?: number
  options?: Record<string, string>
  datalist?: FormTypes[]
  separator?: string
  headerClassList?: string[]
  colClassList?: string[] // CSS classes to add to the <td> element.
}

export interface FieldSchema extends PartialFieldSchema {
  id: string
  valid?: boolean
}

function getClassesRecord (valid?: boolean, classes?: string[]): Record<string, boolean> {
  const classRecord = classes ? Object.fromEntries(classes.map((cls) => [cls, true])) : {}
  classRecord['is-invalid'] = valid === false
  classRecord['is-valid'] = valid === true
  return classRecord
}

export class FormBaseElement extends LivechatElement {
  @property({ type: String, attribute: false })
  public path = ''

  @property({ attribute: false })
  public form!: AnyForm

  @property({ type: Object, attribute: false })
  public validations: Record<string, ValidationErrorType[]> = {}

  @property({ attribute: false })
  public validationPrefix = ''

  protected _dispatchUpdateFormEvent = (): void => {
    this.requestUpdate('form')
    this.dispatchEvent(new CustomEvent('update-form', { detail: this.form, composed: true }))
  }

  protected _updateForm = (schema: FieldSchema, value: any): void => {}

  protected _renderField = (schema: FieldSchema, value: FormTypes): TemplateResult | typeof nothing => {
    let formElement

    switch (schema.default?.constructor) {
      case String:
        schema.kind ??= 'text'
        switch (schema.kind) {
          case 'text':
          case 'color':
          case 'date':
          case 'datetime':
          case 'datetime-local':
          case 'email':
          case 'file':
          case 'image':
          case 'month':
          case 'number':
          case 'password':
          case 'range':
          case 'tel':
          case 'time':
          case 'url':
          case 'week':
            formElement = html`${this._renderInput(schema, value as string)} `
            break

          case 'textarea':
            formElement = html`${this._renderTextarea(schema, value as string)} `
            break

          case 'select':
            formElement = html`${this._renderSelect(schema, value as string)} `
            break

          case 'image-file':
            formElement = html`${this._renderImageFileInput(schema, value?.toString())}`
            break
        }
        break

      case Date:
        schema.kind ??= 'datetime'
        switch (schema.kind) {
          case 'date':
          case 'datetime':
          case 'datetime-local':
          case 'time':
            formElement = html`${this._renderInput(schema, (value as Date).toISOString())} `
            break
        }
        break

      case Number:
        schema.kind ??= 'number'
        switch (schema.kind) {
          case 'number':
          case 'range':
            formElement = html`${this._renderInput(schema, value as string)} `
            break
        }
        break

      case Boolean:
        schema.kind ??= 'checkbox'
        switch (schema.kind) {
          case 'checkbox':
            formElement = html`${this._renderCheckbox(schema, value as boolean)} `
            break
        }
        break

      case Array:
        schema.kind ??= 'text'
        switch (schema.kind) {
          case 'text':
          case 'color':
          case 'date':
          case 'datetime':
          case 'datetime-local':
          case 'email':
          case 'file':
          case 'image':
          case 'month':
          case 'number':
          case 'password':
          case 'range':
          case 'tel':
          case 'time':
          case 'url':
          case 'week':
            if (value.constructor !== Array) {
              value = value ? [value as number | string] : []
            }
            formElement = html`${this._renderInput(
              schema,
              value?.join(schema.separator ?? ',') ?? value ?? schema.default ?? ''
            )} `
            break
          case 'textarea':
            if (value.constructor !== Array) {
              value = value ? [value as number | string] : []
            }
            formElement = html`${this._renderTextarea(
              schema,
              value?.join(schema.separator ?? ',') ?? value ?? schema.default ?? ''
            )}`
            break
          case 'tags':
            if (value.constructor !== Array) {
              value = value ? [value as number | string] : []
            }
            formElement = html`${this._renderTagsInput(schema, value)}`
            break
        }
    }

    if (!formElement) {
      this.logger.warn(
        `value type '${value.constructor.toString()}' is incompatible` +
        `with field type '${schema.kind as string}' for form entry '${schema.path}'.`
      )
    }

    return formElement || nothing
  }

  protected _renderInput = (schema: FieldSchema, value: string): TemplateResult => {
    return html`
      <input
        type=${schema.kind as any}
        name=${schema.id}
        id=${schema.id}
        class=${classMap(getClassesRecord(schema.valid, ['form-control']))}
        title=${ifDefined(schema.title)}
        aria-describedby="${schema.id}-feedback"
        list=${ifDefined(schema.datalist ? schema.id + '-datalist' : undefined)}
        min=${ifDefined(schema.min)}
        max=${ifDefined(schema.max)}
        minlength=${ifDefined(schema.minlength)}
        maxlength=${ifDefined(schema.maxlength)}
        .value=${value}
        @change=${(e: Event) => this._updateForm(schema, (e.target as HTMLInputElement).value)}
      />
      ${schema.datalist
        ? html`<datalist id=${schema.id + '-datalist'}>
            ${(schema.datalist ?? []).map((value) => html`<option value=${value.toString()}></option>`)}
          </datalist>`
        : nothing}
    `
  }

  protected _renderTextarea = (schema: FieldSchema, value: string): TemplateResult => {
    return html`
      <textarea
        name=${schema.id}
        id=${schema.id}
        class=${classMap(getClassesRecord(schema.valid, ['form-control']))}
        title=${ifDefined(schema.title)}
        aria-describedby="${schema.id}-feedback"
        min=${ifDefined(schema.min)}
        max=${ifDefined(schema.max)}
        minlength=${ifDefined(schema.minlength)}
        maxlength=${ifDefined(schema.maxlength)}
        .value=${value}
        @change=${(e: Event) => this._updateForm(schema, (e.target as HTMLTextAreaElement).value)}
      ></textarea>
    `
  }

  protected _renderSelect = (schema: FieldSchema, value: string): TemplateResult => {
    return html`
      <select
        name=${schema.id}
        id=${schema.id}
        class=${classMap(getClassesRecord(schema.valid, ['form-select']))}
        title=${ifDefined(schema.title)}
        aria-describedby="${schema.id}-feedback"
        @change=${(e: Event) => this._updateForm(schema, (e.target as HTMLSelectElement).value)}
      >
        <option ?selected=${!value}>${schema.title ?? ''}</option>
        ${Object.entries(schema.options ?? {})?.map(
          ([v, name]) => html`<option ?selected=${value === v} value=${value}>${name}</option>`
        )}
      </select>
    `
  }

  protected _renderCheckbox = (schema: FieldSchema, value: boolean): TemplateResult => {
    return html`
      <input
        type="checkbox"
        name=${schema.id}
        id=${schema.id}
        class=${classMap(getClassesRecord(schema.valid, ['form-check-input']))}
        title=${ifDefined(schema.title)}
        aria-describedby="${schema.id}-feedback"
        value="1"
        ?checked=${value}
        @change=${(e: Event) => this._updateForm(schema, (e.target as HTMLInputElement).checked)}
      />
    `
  }

  protected _renderTagsInput = (schema: FieldSchema, value: Array<string | number>): TemplateResult => {
    return html`
      <livechat-tags-input
        .name=${schema.id}
        id=${schema.id}
        class=${classMap(getClassesRecord(schema.valid, ['form-control']))}
        .inputTitle=${schema.title}
        aria-describedby="${schema.id}-feedback"
        .min=${schema.min}
        .max=${schema.max}
        .minlength=${schema.minlength}
        .maxlength=${schema.maxlength}
        .datalist=${schema.datalist as any}
        .separator=${schema.separator ?? '\n'}
        .value=${value as any}
        @change=${(e: CustomEvent) => this._updateForm(schema, e.detail)}
      ></livechat-tags-input>
    `
  }

  protected _renderImageFileInput = (schema: FieldSchema, value: string): TemplateResult => {
    return html`
      <livechat-image-file-input
        .name=${schema.id}
        id=${schema.id}
        class=${classMap(getClassesRecord(schema.valid))}
        .inputTitle=${schema.title}
        aria-describedby="${schema.id}-feedback"
        .maxSize=${maxSize}
        .accept=${inputFileAccept}
        .value=${value}
        @change=${(e: CustomEvent) => this._updateForm(schema, e.detail)}
      ></livechat-image-file-input>
    `
  }

  protected _renderFeedback = (schema: FieldSchema): TemplateResult | typeof nothing => {
    const errorMessages: TemplateResult[] = []
    const validationErrorTypes: ValidationErrorType[] | undefined =
      this.validations?.[`${this.validationPrefix ? this.validationPrefix + '.' : ''}${schema.path}`]

    // FIXME: this code is duplicated in channel-configuration
    if (validationErrorTypes !== undefined && validationErrorTypes.length !== 0) {
      if (validationErrorTypes.includes(ValidationErrorType.Missing)) {
        errorMessages.push(html`${ptTr(LOC_INVALID_VALUE_MISSING)}`)
      }
      if (validationErrorTypes.includes(ValidationErrorType.WrongType)) {
        errorMessages.push(html`${ptTr(LOC_INVALID_VALUE_WRONG_TYPE)}`)
      }
      if (validationErrorTypes.includes(ValidationErrorType.WrongFormat)) {
        errorMessages.push(html`${ptTr(LOC_INVALID_VALUE_WRONG_FORMAT)}`)
      }
      if (validationErrorTypes.includes(ValidationErrorType.NotInRange)) {
        errorMessages.push(html`${ptTr(LOC_INVALID_VALUE_NOT_IN_RANGE)}`)
      }
      if (validationErrorTypes.includes(ValidationErrorType.Duplicate)) {
        errorMessages.push(html`${ptTr(LOC_INVALID_VALUE_DUPLICATE)}`)
      }
      if (validationErrorTypes.includes(ValidationErrorType.TooLong)) {
        errorMessages.push(html`${ptTr(LOC_INVALID_VALUE_TOO_LONG)}`)
      }

      return html`<div id="${schema.id}-feedback" class="invalid-feedback">${errorMessages}</div>`
    } else {
      return nothing
    }
  }
}
