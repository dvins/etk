import Handlebars from "handlebars";
import HandlebarsHelpers from "handlebars-helpers";
import { readFileSync } from "fs";
import { unescape } from "lodash";
import path from 'path';

/**
 * Loads and compiles a Handlebars template
 *
 * Templates are always loaded from the `./dist/templates/message_types` folder and this
 * function will prefix the _templatePath_` with this.
 *
 * Templates must always have an extension of `.hbs` and this function
 * will automatically suffix the _templatePath_ with this.
 *
 * For instance, e.g. using a _templatePath_ of `some-template.ts` will
 * resolve the template file path as `./dist/templates/message_types/some-template.ts.hbs`.
 *
 */
export const compileMessageTypesTemplate = (
  templatePath: string,
  options?: CompileOptions
) => {
  // Add String Unescape Helper
  Handlebars.registerHelper(
    "unescape",
    (s: string) => new Handlebars.SafeString(unescape(s))
  );

  HandlebarsHelpers({
    handlebars: Handlebars,
  });

  return Handlebars.compile(
    readFileSync(path.join(__dirname, `./templates/message_types/${templatePath}.hbs`)).toString(),
    options
  );
};
