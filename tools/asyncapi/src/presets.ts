import { renderDate, renderOneOf } from './render';
import type { Preset } from '@asyncapi/modelina';

/**
 * A Modelina preset that rewrites properties with `format: date` to use a custom `DateSchema` type.
 *
 * @remarks
 * This is useful when you want to ensure consistency in generated date handling, such as wrapping
 * all date strings with a Zod preprocessor or using a shared type like `DateSchema`.
 */
export const DATE_PRESET: Preset = {
  interface: {
    property: ({ renderer, model, content }) => {
      return renderDate({ renderer, content, model });
    },
  },
};

/**
 * A Modelina preset that renders `oneOf` schema properties as union types in TypeScript.
 *
 * @example
 * If a property has:
 * ```json
 * {
 *   "oneOf": [
 *     { "type": "string" },
 *     { "type": "number" }
 *   ]
 * }
 * ```
 * It will be rendered as:
 * ```ts
 * prop: string | number;
 * ```
 */
export const ONE_OF_PRESET: Preset = {
  interface: {
    property: (defs) => {
      return renderOneOf(defs);
    },
  },
};
