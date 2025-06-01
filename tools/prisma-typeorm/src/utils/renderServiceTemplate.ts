import Handlebars from 'handlebars';
import HandlebarsHelpers from 'handlebars-helpers';
import fs from 'fs'
import path from 'path'

import { writeFileSafely } from './writeFileSafely'
import type { ServiceDef } from './types'

export const serviceTemplate = Handlebars.compile(
  fs
    .readFileSync(path.join(__dirname, 'templates/service.hbs'))
    .toString(),
)

export const generateService = async (path: string, serviceDef: ServiceDef) => {
  const content = serviceTemplate(serviceDef)
  await writeFileSafely(path, content)
}
