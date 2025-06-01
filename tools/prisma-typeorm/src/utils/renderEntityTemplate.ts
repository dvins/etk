import Handlebars from 'handlebars';
import HandlebarsHelpers from 'handlebars-helpers';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';

import { writeFileSafely } from './writeFileSafely';
import { type EntityDef } from './types';

export const entityTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, 'templates/entity.hbs')).toString()
);

export const generateEntity = async (path: string, entityDef: EntityDef) => {
  try {
    const content = prettier.format(entityTemplate(entityDef), {
      parser: 'typescript',
    });
    await writeFileSafely(path, content);
  } catch (e) {
    console.log('Error while rendering entity', entityDef.entity, e);
  }
};
