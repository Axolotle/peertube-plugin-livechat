// SPDX-FileCopyrightText: 2025 Nicolas Chesnais <https://autre.space>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { html, LitElement, nothing, type TemplateResult } from 'lit'
import type { DirectiveResult } from 'lit/async-directive.js'
import { property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { TranslationDirective } from '../../directives/translation'
import type { TableForm } from './form-table'
import { maxSize, inputFileAccept } from 'shared/lib/emojis'

// import { AddSVG, RemoveSVG } from '../../buttons'

export type FormRecord = Record<string, any>
export type FormArray = any[]
export type AnyForm = FormRecord | FormArray

type KeyParts = Array<string | number>
type DynamicTableAcceptedTypes = number | string | boolean | Date | Array<number | string>

export function pathToId(path: string): string {
  return path.toLocaleLowerCase().replace(/\./g, '-')
}
export function pathToKeys(path: string): KeyParts {
  return path.split('.').map((part) => (part.includes('[') ? parseInt(part.replace(/\[(\d+)\]/, '$1')) : part))
}

export function unwrapForm(partsOrPath: KeyParts | string, form: any): [any, string | number] {
  const [keyOrIndex, ...rest] = Array.isArray(partsOrPath) ? partsOrPath : pathToKeys(partsOrPath)
  if (rest.length) return unwrapForm(rest, form[keyOrIndex])
  else return [form, keyOrIndex]
}

export function getNestedFormValue(path: string, form: any) {
  const [unwrappedForm, keyOrIndex] = unwrapForm(path, form)
  return unwrappedForm[keyOrIndex]
}

export function ariaDescribedby(field: AnyField): string | undefined {
  const ids = Object.entries({
    description: !!field.description,
    feedback: !!field.feedback?.length
  })
    .filter(([_k, v]) => v)
    .map(([k, _v]) => `${field.id}-${k}`)
  return ids.length ? ids.join(' ') : undefined
}

const INPUT_ITEM_KINDS = [
  'text',
  'color',
  'date',
  'datetime',
  'datetime-local',
  'email',
  'file',
  'image',
  'month',
  'number',
  'password',
  'range',
  'tel',
  'time',
  'url',
  'week'
] as const
type InputFieldKind = (typeof INPUT_ITEM_KINDS)[number]
type FieldKind = 'button' | InputFieldKind | 'textarea' | 'select' | 'checkbox' | 'tags' | 'image-file' | 'table'

type Trad = DirectiveResult<typeof TranslationDirective>
type Text = Trad | Trad[] | string

export interface FieldSchema<Form extends AnyForm, Kind extends FieldKind> {
  kind: Kind
  path: string
  label: Text
  description?: Text
  helpPage?: string
  feedback?: Text[] | Record<string, Text[]>
  visible?: (form: Form) => boolean
  forcable?: boolean
  default?: any

  required?: boolean
  valid?: boolean
  id?: string
  // ariaLabeledby?: string
  headerClassList?: string[]
  colClassList?: string[]
  validator?: (field: FieldSchemaResolver<Form, Kind>, value: any, form: Form) => null | Text
}

export interface ButtonSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'button'> {}

export interface InputSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, InputFieldKind> {
  min?: number
  max?: number
  minlength?: number
  maxlength?: number
  datalist?: DynamicTableAcceptedTypes[]
  regex?: RegExp
}

export interface TextareaSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'textarea'> {
  min?: number
  max?: number
  minlength?: number
  maxlength?: number
  regex?: RegExp
}

export interface SelectSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'select'> {
  options?: Record<string, string>
}

export interface CheckboxSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'checkbox'> {}

export interface TagsSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'tags'> {
  min?: number
  max?: number
  minlength?: number
  maxlength?: number
  datalist?: DynamicTableAcceptedTypes[]
  separator?: string
}

export interface ImageFileSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'image-file'> {}

export interface TableSchema<Form extends AnyForm = AnyForm> extends FieldSchema<Form, 'table'> {
  columns: Array<AnyField<Form>>
}

export type AnyField<Form extends AnyForm = AnyForm> =
  | ButtonSchema<Form>
  | InputSchema<Form>
  | TextareaSchema<Form>
  | SelectSchema<Form>
  | CheckboxSchema<Form>
  | TagsSchema<Form>
  | ImageFileSchema<Form>
  | TableSchema<Form>

export type FieldSchemaResolver<Form extends AnyForm, Kind extends FieldKind> = Kind extends 'button'
  ? ButtonSchema<Form>
  : Kind extends InputFieldKind
  ? InputSchema<Form>
  : Kind extends 'textarea'
  ? TextareaSchema<Form>
  : Kind extends 'select'
  ? SelectSchema<Form>
  : Kind extends 'checkbox'
  ? CheckboxSchema<Form>
  : Kind extends 'tags'
  ? TagsSchema<Form>
  : Kind extends 'image-file'
  ? ImageFileSchema<Form>
  : Kind extends 'table'
  ? TableSchema<Form>
  : never

export interface FormSectionProps<Form extends AnyForm = AnyForm> {
  label: Text
  description?: Text
  helpPage?: string
  fields: Array<AnyField<Form>>
}

type RenderSchema<T extends AnyField = AnyField> = (field: T) => TemplateResult

function schemaIsInputSchema(field: AnyField): field is InputSchema {
  return INPUT_ITEM_KINDS.includes(field.kind as InputFieldKind)
}

type Constructor<T> = new (...args: any[]) => T

function renderInput(field: InputSchema, onUpdate?: (field: InputSchema, value: any) => void): TemplateResult {
  // title=${ifDefined(inputTitle)}
  return html`
    <input
      type=${field.kind}
      name=${field.path}
      id=${field.id}
      aria-describedby=${ifDefined(ariaDescribedby(field))}
      min=${ifDefined(field.min)}
      max=${ifDefined(field.max)}
      minlength=${ifDefined(field.minlength)}
      maxlength=${ifDefined(field.maxlength)}
      list=${ifDefined(field.datalist ? field.id + '-datalist' : undefined)}
      .value=${field.default ?? ''}
      @change=${(e: Event) => onUpdate?.(field, (e.target as HTMLInputElement).value)}
      class=${classMap({
        'form-control': true,
        'is-invalid': field.valid === false,
        'is-valid': field.valid === true
      })}
    />
    ${field.datalist
      ? html`<datalist id=${field.id + '-datalist'}>
          ${field.datalist.map((value) => html`<option value=${value.toString()}></option>`)}
        </datalist>`
      : nothing}
  `
}

export declare class FormBuilderInterface<Form extends AnyForm> {
  public path: string
  public form: Form
  public validations: Record<string, string[] | Record<string, string[]>>
  public actionDisabled: boolean
  protected _updateForm(path: string, value: any): void
  protected _parseItemValue(field: AnyField, value: any): any
  protected _validateItemValue(field: AnyField): boolean
  protected _dispatchUpdateFormEvent(): void
  protected _dispatchActionEvent(action: string): void
  protected _getRenderItemFn<T extends AnyField = AnyField>(field: T): RenderSchema<T>
  protected _renderInput(field: InputSchema): TemplateResult
  protected _renderTextarea(field: TextareaSchema): TemplateResult
  protected _renderSelect(field: SelectSchema): TemplateResult
  protected _renderCheckbox(field: CheckboxSchema): TemplateResult
  protected _renderTags(field: TagsSchema): TemplateResult
  protected _renderImageFile(field: ImageFileSchema): TemplateResult
  protected _renderTable(field: TableSchema): TemplateResult
  protected _renderButton(field: ButtonSchema): TemplateResult
}
export const FormBuilder = <Form extends AnyForm, T extends Constructor<LitElement>>(
  superClass: T
): Constructor<FormBuilderInterface<Form>> & T => {
  class FormBuilder extends superClass {
    @property({ type: String, attribute: false })
    public path = ''

    @property({ type: Array, attribute: false })
    public form?: Form

    @property({ type: Object, attribute: false })
    public validations: Record<string, Text[] | Record<string, Text[]>> = {}

    @property({ type: Boolean, attribute: false })
    public actionDisabled = false

    protected _updateForm(field: AnyField, value: any): void {
      value = this._parseItemValue(field, value)
      const [unwrappedForm, keyOrIndex] = unwrapForm(pathToKeys(field.path), this.form)
      unwrappedForm[keyOrIndex] = value
      // this._validateItemValue(field, value)
      this._dispatchUpdateFormEvent()
    }

    protected _parseItemValue(field: AnyField, value: any): any {
      console.log('parse', field, value)
      if (value === '') value = undefined
      if (value !== undefined) {
        if (field.kind === 'number') {
          return Number(value)
        }
      }
      return value
    }

    protected _validateItemValue(field: AnyField, v?: any): boolean {
      if (field.kind === 'button') return true

      if (field.kind === 'table') {
        const table = this.querySelector(
          `#${field.id || `peertube-livechat-form-${pathToId(field.path)}`}`
        ) as TableForm
        const isValid = table.validate()
        this.validations[field.path] = table.validations
        return isValid
      }

      if (field.kind === 'tags') {
        // FIXME
      }

      const value = this._parseItemValue(field, v === undefined ? getNestedFormValue(field.path, this.form) : v)
      const errors: Text[] = []
      console.log('validate', field, value)

      if (value === undefined) {
        if (field.required) {
          errors.push('LOC_INVALID_VALUE_MISSING')
        }
      } else {
        if (field.kind === 'number') {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push('LOC_INVALID_VALUE_WRONG_TYPE')
          } else {
            if ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) {
              errors.push('LOC_INVALID_VALUE_NOT_IN_RANGE')
            }
          }
          // } else if (field.kind === 'table') {
          //   this.validations[field.path] = {}
          //   ;(value as any[]).forEach((_, index) => {
          //     field.columns.forEach((subItem) => {
          //       this.validations[field.path][`[${index}]`]

          //     })
          //   });
        }

        if (field.validator) {
          const customError = field.validator(field, value, this.form)
          if (customError) errors.push(customError)
        }
      }

      this.validations[field.path] = errors

      if (errors.length) {
        console.log('errors', errors, this)
        this.requestUpdate('validations')
        return false
      }

      return true
    }

    protected _dispatchUpdateFormEvent(): void {
      this.requestUpdate('form')
      this.dispatchEvent(
        new CustomEvent('update-form', {
          detail: this.form,
          composed: true
        })
      )
    }

    protected _dispatchActionEvent(action: string): void {
      this.dispatchEvent(
        new CustomEvent('action', {
          detail: { form: this.form, action },
          composed: true
        })
      )
    }

    protected _getRenderItemFn<T extends AnyField = AnyField>(field: T): RenderSchema<T> {
      const methods = {
        textarea: this._renderTextarea,
        select: this._renderSelect,
        checkbox: this._renderCheckbox,
        tags: this._renderTags,
        'image-file': this._renderImageFile,
        table: this._renderTable,
        button: this._renderButton
      } as const
      const renderMethod = schemaIsInputSchema(field) ? this._renderInput : methods[field.kind]

      if (!renderMethod) throw new Error(`Unknow form field kind: '${(field as any).kind}'`)

      return renderMethod as RenderSchema
    }

    protected _renderInput(field: InputSchema): TemplateResult {
      // title=${ifDefined(inputTitle)}
      return html`
        <input
          type=${field.kind}
          name=${field.path}
          id=${field.id}
          aria-describedby=${ifDefined(ariaDescribedby(field))}
          min=${ifDefined(field.min)}
          max=${ifDefined(field.max)}
          minlength=${ifDefined(field.minlength)}
          maxlength=${ifDefined(field.maxlength)}
          list=${ifDefined(field.datalist ? field.id + '-datalist' : undefined)}
          .value=${field.default ?? ''}
          @change=${(e: Event) => this._updateForm(field, (e.target as HTMLInputElement).value)}
          class=${classMap({
            'form-control': true,
            'is-invalid': field.valid === false,
            'is-valid': field.valid === true
          })}
        />
        ${field.datalist
          ? html`<datalist id=${field.id + '-datalist'}>
              ${field.datalist.map((value) => html`<option value=${value.toString()}></option>`)}
            </datalist>`
          : nothing}
      `
    }

    protected _renderTextarea(field: TextareaSchema): TemplateResult {
      // title=${ifDefined(inputTitle)}
      return html`
        <textarea
          name=${field.path}
          id=${field.id}
          aria-describedby=${ifDefined(ariaDescribedby(field))}
          min=${ifDefined(field.min)}
          max=${ifDefined(field.max)}
          minlength=${ifDefined(field.minlength)}
          maxlength=${ifDefined(field.maxlength)}
          .value=${field.default ?? ''}
          @change=${(e: Event) => this._updateForm(field, (e.target as HTMLTextAreaElement).value)}
          class=${classMap({
            'form-control': true,
            'is-invalid': field.valid === false,
            'is-valid': field.valid === true
          })}
        ></textarea>
      `
    }

    protected _renderSelect(field: SelectSchema): TemplateResult {
      const inputTitle = field.label
      const propertyValue = field.default
      // title=${ifDefined(inputTitle)}
      // aria-label=${inputName}
      return html`
        <select
          name=${field.path}
          id=${field.id}
          aria-describedby=${ifDefined(ariaDescribedby(field))}
          @change=${(e: Event) => this._updateForm(field, (e.target as HTMLSelectElement).value)}
          class=${classMap({
            'form-select': true,
            'is-invalid': field.valid === false,
            'is-valid': field.valid === true
          })}
        >
          <option ?selected=${!propertyValue}>${inputTitle ?? ''}</option>
          ${Object.entries(field.options ?? {})?.map(
            ([value, name]) => html`<option ?selected=${propertyValue === value} value=${value}>${name}</option>`
          )}
        </select>
      `
    }

    protected _renderCheckbox(field: CheckboxSchema): TemplateResult {
      // title=${ifDefined(inputTitle)}
      return html`
        <input
          type="checkbox"
          name=${field.path}
          id=${field.id}
          aria-describedby=${ifDefined(ariaDescribedby(field))}
          value="1"
          ?checked=${field.default ?? false}
          @change=${(e: Event) => this._updateForm(field, (e.target as HTMLInputElement).checked)}
          class=${classMap({
            'form-check-input': true,
            'is-invalid': field.valid === false,
            'is-valid': field.valid === true
          })}
        />
      `
    }

    protected _renderTags(field: TagsSchema): TemplateResult {
      // .inputTitle=${inputTitle as any}
      return html`
        <livechat-tags-input
          .name=${field.path}
          id=${field.id}
          aria-describedby=${ifDefined(ariaDescribedby(field))}
          .min=${field.min}
          .max=${field.max}
          .minlength=${field.minlength}
          .maxlength=${field.maxlength}
          .datalist=${field.datalist as any}
          .separator=${field.separator ?? '\n'}
          .value=${field.default ?? []}
          @change=${(e: CustomEvent) => this._updateForm(field, e.detail)}
          class=${classMap({
            'form-control': true,
            'is-invalid': field.valid === false,
            'is-valid': field.valid === true
          })}
        ></livechat-tags-input>
      `
    }

    protected _renderImageFile(field: ImageFileSchema): TemplateResult {
      const propertyValue = field.default
      // .inputTitle=${inputTitle as any}
      return html`
        <livechat-image-file-input
          .name=${field.path}
          id=${field.id}
          aria-describedby=${ifDefined(ariaDescribedby(field))}
          .value=${propertyValue}
          .maxSize=${maxSize}
          .accept=${inputFileAccept}
          @change=${(e: CustomEvent) => this._updateForm(field, e.detail)}
          class=${classMap({ 'is-invalid': field.valid === false, 'is-valid': field.valid === true })}
        ></livechat-image-file-input>
      `
    }

    protected _renderTable(field: TableSchema): TemplateResult {
      return html`
        <livechat-table-form
          id=${field.id}
          .columns=${field.columns}
          .path=${field.path}
          .validations=${this.validations[field.path] ?? {}}
          .form=${field.default ?? []}
          .actionDisabled=${this.actionDisabled}
          @update-form=${(e: CustomEvent) => this._updateForm(field, e.detail)}
        ></livechat-table-form>
      `
    }

    protected _renderButton(field: ButtonSchema): TemplateResult {
      return html`
        <button
          type="button"
          ?disabled=${this.actionDisabled}
          @click=${(_e: MouseEvent) => this._dispatchActionEvent(field.path)}
        >
          ${field.label}
        </button>
      `
    }
  }

  return FormBuilder as unknown as Constructor<FormBuilderInterface<Form>> & T
}
