/**
 * Rewrites properties with `format: date` to use `DateSchema` instead of `string`.
 * This supports Modelina preset behavior for consistent date handling.
 *
 * @param params - Render context passed from Modelina.
 * @returns Modified TypeScript content string with replaced date types.
 */
export const renderDate = ({
  renderer,
  content,
  model,
}: {
  renderer: any;
  content: string;
  model: any;
}): string => {
  const { properties } = model.originalInput;

  if (properties) {
    for (const [prop, schema] of Object.entries(properties)) {
      // Replace all occurrences of `prop: string` with `prop: DateSchema` if it's a date
      if ((schema as any).format === 'date') {
        content = content.replace(
          new RegExp(`${prop}: string`, 'g'),
          `${prop}: DateSchema`
        );
      }
    }
  }

  return content;
};

/**
 * Rewrites a property with a `oneOf` definition into a union type.
 *
 * @example
 * Turns:
 * ```json
 * "status": {
 *   "oneOf": [
 *     { "x-parser-schema-id": "StatusActive" },
 *     { "x-parser-schema-id": "StatusInactive" }
 *   ]
 * }
 * ```
 * into:
 * ```ts
 * status: StatusActive | StatusInactive;
 * ```
 *
 * @param params - Render context passed from Modelina for a single property.
 * @returns A TypeScript property string with the union type applied.
 */
export const renderOneOf = ({
  renderer,
  content,
  model,
  inputModel,
  propertyName,
}: {
  renderer: any;
  content: string;
  model: any;
  inputModel: any;
  propertyName: string;
}): string => {
  const { properties } = model.originalInput;

  if (properties) {
    const schema = properties[propertyName];

    if (schema?.oneOf) {
      const union = schema.oneOf
        .map((s: any) => s['x-parser-schema-id'])
        .join(' | ');
      content = `${propertyName}: ${union};`;
    }
  }

  return content;
};
