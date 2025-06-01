import Handlebars from 'handlebars';
import HandlebarsHelpers from 'handlebars-helpers';
import fs from 'fs';
import path from 'path';

import { writeFileSafely } from './writeFileSafely';

export const indexTemplate = Handlebars.compile(
  fs
    .readFileSync(path.join(__dirname, 'templates/index.hbs'))
    .toString()
);

export const generateIndex = async (
  path: string,
  fileExports: { path: string }[]
) => {
  try {
    const content = indexTemplate({ fileExports });
    await writeFileSafely(path, content);
  } catch (e) {
    console.log('Error while rendering index', e);
  }
};
