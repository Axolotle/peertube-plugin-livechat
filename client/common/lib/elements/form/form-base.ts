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

export interface FieldSchema {
  inputType?: FieldKind
  inputTitle?: string
  min?: number
  max?: number
  minlength?: number
  maxlength?: number
  size?: number
  options?: Record<string, string>
  datalist?: FormTypes[]
  separator?: string
  default?: FormTypes
  colClassList?: string[] // CSS classes to add to the <td> element.
}

export class FormBaseElement extends LivechatElement {
  @property({ type: String, attribute: false })
  public path = ''

  @property()
  public validations: Record<string, ValidationErrorType[]> = {}

  protected _updateForm = (event: Event, propertyName: string, propertySchema: FieldSchema, rowId: number): void => {}

  protected _renderField = (
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: FormTypes,
    rowId: number,
    originalIndex: number,
    inputTitle?: DirectiveResult
  ): TemplateResult => {
    let formElement

    const inputName = `${this.path.replace(/-/g, '_')}_${propertyName.toString().replace(/-/g, '_')}_${rowId}`
    const inputId = `peertube-livechat-${this.path.replace(/_/g, '-')}-${propertyName
      .toString()
      .replace(/_/g, '-')}-${rowId}`
    const feedback = this._renderFeedback(inputId, propertyName, originalIndex)

    switch (propertySchema.default?.constructor) {
      case String:
        propertySchema.inputType ??= 'text'
        switch (propertySchema.inputType) {
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
            formElement = html`${this._renderInput(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue as string,
              originalIndex
            )}
            ${feedback} `
            break

          case 'textarea':
            formElement = html`${this._renderTextarea(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue as string,
              originalIndex
            )}
            ${feedback} `
            break

          case 'select':
            formElement = html`${this._renderSelect(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue as string,
              originalIndex
            )}
            ${feedback} `
            break

          case 'image-file':
            formElement = html`${this._renderImageFileInput(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue?.toString(),
              originalIndex
            )}
            ${feedback} `
            break
        }
        break

      case Date:
        propertySchema.inputType ??= 'datetime'
        switch (propertySchema.inputType) {
          case 'date':
          case 'datetime':
          case 'datetime-local':
          case 'time':
            formElement = html`${this._renderInput(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              (propertyValue as Date).toISOString(),
              originalIndex
            )}
            ${feedback} `
            break
        }
        break

      case Number:
        propertySchema.inputType ??= 'number'
        switch (propertySchema.inputType) {
          case 'number':
          case 'range':
            formElement = html`${this._renderInput(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue as string,
              originalIndex
            )}
            ${feedback} `
            break
        }
        break

      case Boolean:
        propertySchema.inputType ??= 'checkbox'
        switch (propertySchema.inputType) {
          case 'checkbox':
            formElement = html`${this._renderCheckbox(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue as boolean,
              originalIndex
            )}
            ${feedback} `
            break
        }
        break

      case Array:
        propertySchema.inputType ??= 'text'
        switch (propertySchema.inputType) {
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
            if (propertyValue.constructor !== Array) {
              propertyValue = propertyValue ? [propertyValue as number | string] : []
            }
            formElement = html`${this._renderInput(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue?.join(propertySchema.separator ?? ',') ?? propertyValue ?? propertySchema.default ?? '',
              originalIndex
            )}
            ${feedback} `
            break
          case 'textarea':
            if (propertyValue.constructor !== Array) {
              propertyValue = propertyValue ? [propertyValue as number | string] : []
            }
            formElement = html`${this._renderTextarea(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue?.join(propertySchema.separator ?? ',') ?? propertyValue ?? propertySchema.default ?? '',
              originalIndex
            )}
            ${feedback} `
            break
          case 'tags':
            if (propertyValue.constructor !== Array) {
              propertyValue = propertyValue ? [propertyValue as number | string] : []
            }
            formElement = html`${this._renderTagsInput(
              rowId,
              inputId,
              inputName,
              inputTitle,
              propertyName,
              propertySchema,
              propertyValue,
              originalIndex
            )}
            ${feedback} `
            break
        }
    }

    if (!formElement) {
      this.logger.warn(
        `value type '${propertyValue.constructor.toString()}' is incompatible` +
        `with field type '${propertySchema.inputType as string}' for form entry '${propertyName.toString()}'.`
      )
    }

    const classList = ['form-group']
    if (propertySchema.colClassList) {
      classList.push(...propertySchema.colClassList)
    }
    return html`<td class=${classList.join(' ')}>${formElement}</td>`
  }

  protected _renderInput = (
    rowId: number,
    inputId: string,
    inputName: string,
    inputTitle: string | DirectiveResult | undefined,
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: string,
    originalIndex: number
  ): TemplateResult => {
    return html`
      <input
        type=${propertySchema.inputType as any}
        name=${inputName}
        class=${classMap(
          Object.assign({ 'form-control': true }, this._getInputValidationClass(propertyName, originalIndex))
        )}
        id=${inputId}
        title=${ifDefined(inputTitle)}
        aria-describedby="${inputId}-feedback"
        list=${ifDefined(propertySchema.datalist ? inputId + '-datalist' : undefined)}
        min=${ifDefined(propertySchema.min)}
        max=${ifDefined(propertySchema.max)}
        minlength=${ifDefined(propertySchema.minlength)}
        maxlength=${ifDefined(propertySchema.maxlength)}
        @change=${(event: Event) => this._updateForm(event, propertyName, propertySchema, rowId)}
        .value=${propertyValue}
      />
      ${propertySchema.datalist
        ? html`<datalist id=${inputId + '-datalist'}>
            ${(propertySchema.datalist ?? []).map((value) => html`<option value=${value.toString()}></option>`)}
          </datalist>`
        : nothing}
    `
  }

  protected _renderTextarea = (
    rowId: number,
    inputId: string,
    inputName: string,
    inputTitle: string | DirectiveResult | undefined,
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: string,
    originalIndex: number
  ): TemplateResult => {
    return html`
      <textarea
        name=${inputName}
        class=${classMap(
          Object.assign({ 'form-control': true }, this._getInputValidationClass(propertyName, originalIndex))
        )}
        id=${inputId}
        title=${ifDefined(inputTitle)}
        aria-describedby="${inputId}-feedback"
        min=${ifDefined(propertySchema.min)}
        max=${ifDefined(propertySchema.max)}
        minlength=${ifDefined(propertySchema.minlength)}
        maxlength=${ifDefined(propertySchema.maxlength)}
        @change=${(event: Event) => this._updateForm(event, propertyName, propertySchema, rowId)}
        .value=${propertyValue}
      ></textarea>
    `
  }

  protected _renderSelect = (
    rowId: number,
    inputId: string,
    inputName: string,
    inputTitle: string | DirectiveResult | undefined,
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: string,
    originalIndex: number
  ): TemplateResult => {
    return html`
      <select
        class=${classMap(
          Object.assign({ 'form-select': true }, this._getInputValidationClass(propertyName, originalIndex))
        )}
        id=${inputId}
        title=${ifDefined(inputTitle)}
        aria-describedby="${inputId}-feedback"
        aria-label=${inputName}
        @change=${(event: Event) => this._updateForm(event, propertyName, propertySchema, rowId)}
      >
        <option ?selected=${!propertyValue}>${inputTitle ?? ''}</option>
        ${Object.entries(propertySchema.options ?? {})?.map(
          ([value, name]) => html`<option ?selected=${propertyValue === value} value=${value}>${name}</option>`
        )}
      </select>
    `
  }

  protected _renderCheckbox = (
    rowId: number,
    inputId: string,
    inputName: string,
    inputTitle: string | DirectiveResult | undefined,
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: boolean,
    originalIndex: number
  ): TemplateResult => {
    return html`
      <input
        type="checkbox"
        name=${inputName}
        class=${classMap(
          Object.assign({ 'form-check-input': true }, this._getInputValidationClass(propertyName, originalIndex))
        )}
        id=${inputId}
        title=${ifDefined(inputTitle)}
        aria-describedby="${inputId}-feedback"
        @change=${(event: Event) => this._updateForm(event, propertyName, propertySchema, rowId)}
        value="1"
        ?checked=${propertyValue}
      />
    `
  }

  protected _renderTagsInput = (
    rowId: number,
    inputId: string,
    inputName: string,
    inputTitle: string | DirectiveResult | undefined,
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: Array<string | number>,
    originalIndex: number
  ): TemplateResult => {
    return html`
      <livechat-tags-input
        .name=${inputName}
        class=${classMap(
          Object.assign({ 'form-control': true }, this._getInputValidationClass(propertyName, originalIndex))
        )}
        id=${inputId}
        .inputTitle=${inputTitle as any}
        aria-describedby="${inputId}-feedback"
        .min=${propertySchema.min}
        .max=${propertySchema.max}
        .minlength=${propertySchema.minlength}
        .maxlength=${propertySchema.maxlength}
        .datalist=${propertySchema.datalist as any}
        .separator=${propertySchema.separator ?? '\n'}
        @change=${(event: Event) => this._updateForm(event, propertyName, propertySchema, rowId)}
        .value=${propertyValue as any}
      ></livechat-tags-input>
    `
  }

  protected _renderImageFileInput = (
    rowId: number,
    inputId: string,
    inputName: string,
    inputTitle: string | DirectiveResult | undefined,
    propertyName: string,
    propertySchema: FieldSchema,
    propertyValue: string,
    originalIndex: number
  ): TemplateResult => {
    return html`
      <livechat-image-file-input
        .name=${inputName}
        class=${classMap(this._getInputValidationClass(propertyName, originalIndex))}
        id=${inputId}
        .inputTitle=${inputTitle as any}
        aria-describedby="${inputId}-feedback"
        @change=${(event: Event) => this._updateForm(event, propertyName, propertySchema, rowId)}
        .value=${propertyValue}
        .maxSize=${maxSize}
        .accept=${inputFileAccept}
      ></livechat-image-file-input>
    `
  }

  protected _getInputValidationClass = (propertyName: string, originalIndex: number): Record<string, boolean> => {
    const validationErrorTypes: ValidationErrorType[] | undefined =
      this.validations?.[`${originalIndex}.${propertyName}`]

    return validationErrorTypes !== undefined
      ? validationErrorTypes.length
        ? { 'is-invalid': true }
        : { 'is-valid': true }
      : {}
  }

  protected _renderFeedback = (
    inputId: string,
    propertyName: string,
    originalIndex: number
  ): TemplateResult | typeof nothing => {
    const errorMessages: TemplateResult[] = []
    const validationErrorTypes: ValidationErrorType[] | undefined =
      this.validations?.[`${originalIndex}.${propertyName}`]

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

      return html`<div id="${inputId}-feedback" class="invalid-feedback">${errorMessages}</div>`
    } else {
      return nothing
    }
  }
}
