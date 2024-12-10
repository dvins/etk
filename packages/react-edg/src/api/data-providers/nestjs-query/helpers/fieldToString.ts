/**
 * Converts an array of fields that represent nesting into a string.
 * If the input is already a string, it returns the input as is.
 *
 * @param field - The field or array of fields to be converted to a string.
 * @returns The concatenated string of fields separated by dots if the input is an array,
 *          or the original string if the input is a string.
 */
export const fieldToString = (field: string | string[]): string => {
  return Array.isArray(field) ? field.join('.') : field;
};
