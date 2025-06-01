import Handlebars from 'handlebars';
import HandlebarsHelpers from 'handlebars-helpers';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';

import { writeFileSafely } from './writeFileSafely';
import { log, type ViewDef } from './types';

export const viewTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, 'templates/view.hbs')).toString()
);

export const generateView = async (path: string, viewDef: ViewDef) => {
  log('Generating view', viewDef.view);
  try {
    const content = prettier.format(viewTemplate(viewDef), {
      parser: 'typescript',
    });
    await writeFileSafely(path, content);
  } catch (e) {
    log('Error while rendering view', viewDef.view);
    log('--- error: ', e);
  }
};
