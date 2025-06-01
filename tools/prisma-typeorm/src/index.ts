#!/bin/env node

import {
  generatorHandler,
  GeneratorOptions,
  type DMMF,
  type ReadonlyDeep
} from '@prisma/generator-helper';

import path from 'path';
import ts from 'typescript';
import { ModuleResolutionKind, ScriptTarget } from 'typescript';

import { GENERATOR_NAME } from './constants';
import { getColModifier } from './helpers/getColModifier';
import { genEnum } from './helpers/genEnum';
import { mapTypeFromPrisma } from './helpers/mapTypeFromPrisma';
import { writeFileSafely } from './utils/writeFileSafely';
import { generateEntity } from './utils/renderEntityTemplate';
import { generateIndex } from './utils/renderIndexTemplate';
import { EntityDef, ServiceDef, log } from './utils/types';
import { generateView } from './utils/renderViewTemplate';

import ModuleKind = ts.ModuleKind;

const { version } = require('../package.json');

log('Starting generator..');

const compilerOptions: ts.CompilerOptions = {
  strict: false,
  target: ScriptTarget.ESNext,
  module: ModuleKind.CommonJS,
  resolveJsonModule: true,
  esModuleInterop: true,
  emitDecoratorMetadata: true,
  experimentalDecorators: true,
  allowSyntheticDefaultImports: true,
  declaration: true,
  inlineSourceMap: true,
  moduleResolution: ModuleResolutionKind.NodeJs,
  composite: false,
};

generatorHandler({
  onManifest() {
    console.info(`${GENERATOR_NAME}: Registered`);
    return {
      version,
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
      previewFeatures: ['multiSchema', 'views'],
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    // log('Generating...\n', options);

    const views = options.datamodel
      .split('\nview ')
      .map((v) => v.split(' {')[0])
      // remove the first item in this list, as is not a view
      .slice(1);

    // log('Views', views);

    const getModelSchema = (modelName: string) => {
      const body = options.datamodel
        .split(`${modelName} {`)[1]
        .split('}')[0]
        .trim();
      const match = body.match(/@@schema\("(.+?)"\)/);
      if (match) {
        log(`Model schema for ${modelName}: ${match[1]}`);
        return { schema: match[1] };
      }
      return;
    };

    for (const enumInfo of options.dmmf.datamodel.enums) {
      const tsEnum = genEnum(enumInfo);

      const writeLocation = path.join(
        options.generator.output?.value!,
        `${enumInfo.name}.ts`
      );

      await writeFileSafely(writeLocation, tsEnum);
    }

    type ImportDef = { name: string; path: string };

    const entityDefs: { [key: string]: EntityDef } = {};
    const serviceDefs: { [key: string]: ServiceDef } = {};
    const fileExports: ImportDef[] = [];

    // first let's build the definition objects
    for (const modelInfo of options.dmmf.datamodel.models) {
      serviceDefs[modelInfo.name] = {
        entity: modelInfo.name,
      };

      const entityDef = buildEntityDef(modelInfo, views, options, getModelSchema);
      entityDefs[modelInfo.name] = entityDef;
    }

    // log(
    //   prettyPrint(entityDefs, {
    //     indent: '  ',
    //     singleQuotes: false,
    //   }),
    // );

    // Loop through every model defined in the Prisma datamodel.
    for (const modelInfo of options.dmmf.datamodel.models) {
      await generateClasses(modelInfo, views, options, entityDefs, fileExports);
    }

    // finally, generate the index.ts file
    await generateIndex(
      path.join(options.generator.output?.value!, `index.ts`),
      fileExports
    );

    // // now compile everything
    // const program = ts.createProgram(
    //   [path.join(options.generator.output?.value!, `index.ts`)],
    //   compilerOptions
    // );

    // const result = program.emit();

    // let allDiagnostics = ts
    //   .getPreEmitDiagnostics(program)
    //   .concat(result.diagnostics);

    // allDiagnostics.forEach((diagnostic) => {
    //   if (diagnostic.file) {
    //     let { line, character } = ts.getLineAndCharacterOfPosition(
    //       diagnostic.file,
    //       diagnostic.start!
    //     );
    //     let message = ts.flattenDiagnosticMessageText(
    //       diagnostic.messageText,
    //       '\n'
    //     );
    //     log(
    //       `${diagnostic.file.fileName.replace(__dirname, '')} (${line + 1},${
    //         character + 1
    //       }): ${message}`
    //     );
    //   } else {
    //     log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    //   }
    // });

    // let exitCode = result.emitSkipped ? 1 : 0;

    const exitCode = 1;
    log(`Process exiting with code '${exitCode}'.`);
  },
});

/**
 * @description
 *
 * #### What This Code Does
 *
 * 1. Initialization:
 * For each model (from a Prisma schema), it sets up an entity definition (EntityDef) that will be used to generate a TypeORM class.
 *
 * 2. Processing Each Field:
 * It loops over every field of the model with a reduce:
 *
 *   - Column Options: Determines additional options for a column (such as making it nullable or indicating it holds JSON data).
 *   - Column Metadata: Creates an object (col) for the field that includes its name, the mapped column type, and any modifiers.
 *   - Enum Imports: If the field is an enum and hasn’t been imported already, it adds an import statement.
 *   - Special Field Handling: Fields like updatedAt, createdAt, or primary keys are sorted into their corresponding arrays.
 *   - Relationship Handling:
 *       - For fields representing relationships (those with a relationName):
 *       - It adds an import for the related model if needed.
 *       - It locates the target model and the specific field in that model that relates back.
 *       - Depending on whether the field (or its counterpart) is a list, it classifies the relationship as one-to-many, many-to-one, one-to-one, or many-to-many (with a warning that many-to-many relationships are not fully supported).
 *   - Regular Columns: If none of the above conditions apply, the field is added as a regular column.
 *
 * 3. Accumulation:
 * The accumulator (acc) collects all these pieces—columns, keys, relationships, and imports—to form the complete metadata for the model.
 *
 */
const buildEntityDef = (
  modelInfo: ReadonlyDeep<ReadonlyDeep<ReadonlyDeep<{
    name: string;
    dbName: string | null;
    fields: DMMF.Field[];
    uniqueFields: string[][];
    uniqueIndexes: DMMF.uniqueIndex[];
    documentation?: string;
    primaryKey: DMMF.PrimaryKey | null;
    isGenerated?: boolean;
  }>>>,
  views: string[],
  options: GeneratorOptions,
  getModelSchema: (modelName: string) => { schema: string } | undefined
): EntityDef => {
  return modelInfo.fields.reduce((acc, field) => {
    const colOptions = getColOptions(field);
    const col = createColumn(field, colOptions);

    addEnumImport(acc, field);

    // Handle timestamps ('updatedAt' and 'createdAt')
    if (processTimestamp(acc, field, col)) return acc;

    // Handle primary keys
    if (processPrimaryKey(acc, field, col, modelInfo)) return acc;

    // Process relationships if this field has one
    if (field.relationName !== undefined) {
      processRelationship(acc, field, modelInfo, views, options);
      return acc;
    }

    // Fallback: Regular column
    acc.columns.push(col);
    return acc;
  }, {
    entity: modelInfo.name,
    entityName: modelInfo.dbName ?? modelInfo.name,
    columns: [],
    primary: [],
    updatedAt: [],
    createdAt: [],
    oneToOne: [],
    oneToMany: [],
    manyToMany: [],
    manyToOne: [],
    imports: [],
    ...getModelSchema(modelInfo.name),
  } as EntityDef);
};

/**
 * Build additional options for a column.
 */
const getColOptions = (field: DMMF.Field): object => {
  return {
    ...(!field.isRequired ? { nullable: true } : {}),
    ...(field.type === 'Json' ? { isJson: true } : {}),
  };
};

/**
 * Create a column object for the field.
 */
const createColumn = (field: DMMF.Field, colOptions: object): {
  name: string;
  colType: string;
  colModifier: any;
  colOptions?: object;
} => {
  return {
    name: field.name,
    colType: mapTypeFromPrisma(field.type),
    colModifier: getColModifier(field),
    colOptions: Object.keys(colOptions).length > 0 ? colOptions : undefined,
  };
};

/**
 * If the field is an enum and not yet imported, add its import.
 */
const addEnumImport = (acc: EntityDef, field: DMMF.Field): void => {
  if (field.kind === 'enum' && !acc.imports.some((imp) => imp.name === field.type)) {
    acc.imports.push({
      name: field.type,
      path: `./${field.type}`,
    });
  }
};

/**
 * Determines whether the model should be rendered as a view.
 */
const isViewModel = (modelName: string, views: string[]): boolean => {
  return views.includes(modelName);
};

/**
 * Returns the file type extension based on whether the model is a view.
 */
const getFileExtension = (isView: boolean): 'view' | 'entity' => {
  return isView ? 'view' : 'entity';
};

/**
 * Builds the full file path for the generated file.
 */
const buildFilePath = (modelName: string, fileType: 'view' | 'entity', outputDir: string): string => {
  return path.join(outputDir, `${modelName}.${fileType}.ts`);
};

/**
 * Generates the file for a model using the appropriate generator function.
 */
const generateModelFile = async (
  modelInfo: ReadonlyDeep<{
    name: string;
    dbName: string | null;
    fields: DMMF.Field[];
    uniqueFields: string[][];
    uniqueIndexes: DMMF.uniqueIndex[];
    documentation?: string;
    primaryKey: DMMF.PrimaryKey | null;
    isGenerated?: boolean;
  }>,
  views: string[],
  options: GeneratorOptions,
  entityDefs: { [key: string]: EntityDef; }
): Promise<{ name: string; path: string }> => {
  log('Generating', modelInfo.name);

  const isView = isViewModel(modelInfo.name, views);
  const fileType = getFileExtension(isView);
  const outputDir = options.generator.output?.value!;
  const filePath = buildFilePath(modelInfo.name, fileType, outputDir);

  // Generate the file using the proper function.
  if (isView) {
    await generateView(filePath, {
      ...entityDefs[modelInfo.name],
      view: entityDefs[modelInfo.name].entity,
      viewName: entityDefs[modelInfo.name].entityName,
    });
  } else {
    await generateEntity(filePath, entityDefs[modelInfo.name]);
  }

  return {
    name: modelInfo.name,
    path: `./${modelInfo.name}.${fileType}`,
  };
};

/**
 * @description
 *
 * #### What This Code Does
 *
 * 1. Service Generation (Commented Out):
 * There is a commented-out block that would generate a service file for the model using generateService. This code is disabled, but if enabled, it would create a service file and add its export to fileExports.
 *
 * 2. Generating Views vs. Entities:
 *   - If the model name exists in the views array, the code calls generateView with a file path ending in .view.ts and passes a modified entity definition tailored for views.
 *   - Otherwise, generateEntity is called to generate a standard entity file ending in .entity.ts.
 *
 * 3.Updating Exports:
 * After successful generation, an export object is pushed to the fileExports array, recording the model's name and its corresponding file path. The file path is determined by whether the model is a view or an entity.
 *
 */
const generateClasses = async (
  modelInfo: ReadonlyDeep<{
    name: string;
    dbName: string | null;
    fields: DMMF.Field[];
    uniqueFields: string[][];
    uniqueIndexes: DMMF.uniqueIndex[];
    documentation?: string;
    primaryKey: DMMF.PrimaryKey | null;
    isGenerated?: boolean;
  }>,
  views: string[],
  options: GeneratorOptions,
  entityDefs: { [key: string]: EntityDef; },
  fileExports: { name: string; path: string; }[]
) => {
  try {
    const exportEntry = await generateModelFile(modelInfo, views, options, entityDefs);
    fileExports.push(exportEntry);
  } catch (e) {
    console.error('unable to render model', modelInfo.name);
  }
};

/**
 * Process timestamp fields ('updatedAt' and 'createdAt').
 * Returns true if the field was handled.
 */
const processTimestamp = (
  acc: EntityDef,
  field: DMMF.Field,
  col: ReturnType<typeof createColumn>
): boolean => {
  if (field.name === 'updatedAt') {
    acc.updatedAt.push(col);
    return true;
  }
  if (field.name === 'createdAt') {
    acc.createdAt.push(col);
    return true;
  }
  return false;
};

/**
 * Process primary key fields.
 * Returns true if the field was handled.
 */
const processPrimaryKey = (
  acc: EntityDef,
  field: DMMF.Field,
  col: ReturnType<typeof createColumn>,
  modelInfo: { primaryKey: DMMF.PrimaryKey | null }
): boolean => {
  if (
    field.isId ||
    (modelInfo.primaryKey && modelInfo.primaryKey.fields.includes(field.name))
  ) {
    acc.primary.push(col);
    return true;
  }
  return false;
};

/**
 * Process a relationship field.
 */
const processRelationship = (
  acc: EntityDef,
  field: DMMF.Field,
  modelInfo: { name: string; primaryKey: DMMF.PrimaryKey | null },
  views: string[],
  options: GeneratorOptions
): void => {
  // Determine if the current model is a view by checking if its name is in the `views` array.
  const currentIsView = views.includes(modelInfo.name);
  // Determine if the related model (the type of the field) is a view.
  const relatedIsView = views.includes(field.type);

  // Skip relationships that cross boundaries.
  // This means if one model is a view and the other is an entity,
  // the relationship is not processed.
  if (currentIsView !== relatedIsView) {
    return;
  }

  // Add an import for the related model if needed:
  // - Ensure it’s not a self-reference (field.type !== modelInfo.name).
  // - Ensure we haven't already imported it.
  // - Use the correct file extension based on whether the related model is a view.
  if (
    field.type !== modelInfo.name &&
    !acc.imports.some((imp) => imp.name === field.type)
  ) {
    acc.imports.push({
      name: field.type,
      path: `./${field.type}.${relatedIsView ? "view" : "entity"}`,
    });
  }

  // Retrieve the related model definition from Prisma DMMF metadata.
  const other = options.dmmf.datamodel.models.find(m => m.name === field.type);
  if (!other) {
    console.error('Unable to find target model of relationship', field);
    return;
  }

  // Locate the target field on the related model that links back to the current model.
  const targetField = other.fields.find(tf => tf.type === modelInfo.name);
  if (!targetField) {
    log('Unable to find target field of current field', field);
    return;
  }

  // Handle self-referencing relationships:
  // If the current model references itself and the field is a list, treat it as a one-to-many relationship.
  if (other.name === modelInfo.name && field.isList) {
    acc.oneToMany.push({
      entity: modelInfo.name,
      field: field.name,
      targetField: field.relationName!,
    });
    return;
  }

  // For non-self relationships, decide how to classify the relationship based on list properties.
  if (field.isList) {
    // If both the current field and the target field are lists, this implies a many-to-many relationship.
    if (targetField.isList) {
      log(`Warning: we don't support many-to-many relationships, check`, modelInfo.name, 'model');
      acc.manyToMany.push({
        entity: field.type,
        field: field.name,
        targetField: targetField.name,
      });
    } else {
      // If only the current field is a list, it's a one-to-many relationship.
      acc.oneToMany.push({
        entity: field.type,
        field: field.name,
        targetField: targetField.name,
      });
    }
  } else {
    // If the current field is not a list, then we decide between many-to-one and one-to-one.
    if (targetField.isList) {
      // In a many-to-one relationship, create a mapping for the relation fields.
      const { relationFromFields = [], relationToFields = [] } = field;
      acc.manyToOne.push({
        entity: field.type,
        field: field.name,
        targetField: targetField.name,
        fieldMap: relationFromFields.map((n, i) => ({
          name: n,
          referencedColumnName: relationToFields[i],
        })),
      });
    } else {
      // Otherwise, it's a one-to-one relationship.
      // Optionally add an extra decorator (e.g., @JoinColumn()) if relation fields are present.
      acc.oneToOne.push({
        entity: field.type,
        field: field.name,
        targetField: targetField.name,
        extraDecorator:
          field.relationFromFields && field.relationFromFields.length > 0
            ? ['@JoinColumn()']
            : undefined,
      });
    }
  }
};
