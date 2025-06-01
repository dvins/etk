import { DMMF } from '@prisma/generator-helper'
import Field = DMMF.Field

export const getColModifier = (field: Field) => {
  if (field.isRequired) return '!'
  else return '?'
}
