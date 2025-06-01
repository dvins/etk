import {
  Options,
  TypeDefinitionDisplayStrings,
  type ParserField,
  type ParserTree,
} from 'graphql-js-tree';
import { upperFirst, isEqual, uniq } from 'lodash';

import { logger } from '../utils/logger';

/**
 * Built-in default GraphQL Scalars
 *   - Int
 *   - Float
 *   - String
 *   - Boolean
 *   - ID
 *   - JSON
 *
 * https://spec.graphql.org/draft/#sec-Scalars.Built-in-Scalars
 */
export class DefaultScalars {

  /** A signed 32‐bit integer. */
  static get Int(): string {
    return "Int";
  }

  /** A signed double-precision floating-point value. */
  static get Float(): string {
    return "Float";
  }

  /** A UTF‐8 character sequence. */
  static get String(): string {
    return "String";
  }

  /** A bool, either `true` or `false`. */
  static get Boolean(): string {
    return "Boolean";
  }

  /**
   * ID: A unique identifier, often used to refetch an object or as the key
   * for a cache. The ID type is serialized in the same way as a String;
   * however, defining it as an ID signifies that it is not intended to be
   * human‐readable. */
  static get ID(): string {
    return "ID";
  }

  /** Returns an iterable list of default scalar types */
  static [Symbol.iterator](): IterableIterator<string> {
    const allValues = [
      this.Int,
      this.Float,
      this.Boolean,
      this.String,
      this.ID
    ];

    return allValues[Symbol.iterator]();
  }
}

/**
 * Extends Default Scalars including:
 * - JSON
 * - DateTime
 *
 * This includes all types for non-object fields. This is used
 * for filtering between relations, not intended to extend types
 * on base models.
 */
export class ComplexScalars extends DefaultScalars {
  static get Json(): string {
    return "JSON";
  }

  static get DateTime(): string {
    return "DateTime";
  }

  static override [Symbol.iterator](): IterableIterator<string> {
    const allValues = [
      this.Int,
      this.Float,
      this.Boolean,
      this.String,
      this.ID,
      this.Json,
      this.DateTime,
    ]

    return allValues[Symbol.iterator]();
  }
}

/** A simple structure for GraphQL Schema Field Node information */
export type FieldInfo = {
  id: string;
  type: string;
  description?: string;
}

/**
 * Core GraphQL Types
 *   - Models (Objects): `type ...`
 *   - Interfaces: `interface ...`
 *   - Scalars: `scalar ...`
 *   - Enums: `enum ...`
 *   - Mutations:  `type Mutation { ... }`
 *   - Queries: `type Query { ... }`
 *   - Subscriptions: `type Subscription ...`
 *
 * See: {@link https://graphql.org/learn/schema/#type-system}
 *
 */
export type SchemaTypes = {
  /** Models (Objects): `type ...` */
  models: ParserField[],
  /** Interfaces: `interface ...` */
  interfaces: ParserField[],
  /** Scalars: `scalar ...` */
  scalars: ParserField[],
  /** Enums: `enum ...` */
  enums: ParserField[],
  /** Mutations:  `type Mutation { ... }` */
  mutations: ParserField[],
  /** Queries: `type Query { ... }` */
  queries: ParserField[],
  /** Subscriptions: `type Subscription ...` */
  subscriptions: ParserField[],
}

/**
 * Finds and returns all types
 *   - Models (Objects): `type ...`
 *   - Interfaces: `interface ...`
 *   - Scalars: `scalar ...`
 *   - Enums: `enum ...`
 *   - Mutations:  `type Mutation { ... }`
 *   - Queries: `type Query { ... }`
 *   - Subscriptions: `type Subscription ...`
 *
 * See: {@link https://graphql.org/learn/schema/#type-system}
 *
 * @note
 * Assumes root operation types, i.e. Mutation, Query, and Subscriptions have not been renamed
 * via a `Schema { ... } block.
 * */
export const getTypes = (
  schema: ParserTree
): SchemaTypes => {
  // Get the base enum, scalar, and defined types
  const types = schema.nodes.filter(node =>
    node.type.fieldType.type === Options.name &&
    node.type.fieldType.name === TypeDefinitionDisplayStrings.type);

  const enums = schema.nodes.filter(node =>
    node.type.fieldType.type === Options.name &&
    node.type.fieldType.name === TypeDefinitionDisplayStrings.enum);

  const interfaces = schema.nodes.filter(node =>
    node.type.fieldType.type === Options.name &&
    node.type.fieldType.name === TypeDefinitionDisplayStrings.interface);

  const scalars = schema.nodes.filter(node =>
    node.type.fieldType.type === Options.name &&
    node.type.fieldType.name === TypeDefinitionDisplayStrings.scalar);

  // Find the distinct mutation, query, and subscription types
  // This assumes they have not been renamed
  const mutations = types.find(t => t.id === 'Mutation')?.args ?? [];
  const queries = types.find(t => t.id === 'Query')?.args ?? [];
  const subscriptions = types.find(t => t.id === 'Subscription')?.args ?? [];

  // Filter out the the real model objects from the special types
  const models = types.filter(t => t.id !== 'Mutation' && t.id !== 'Query' && t.id !== 'Subscription');

  return {
    models,
    interfaces,
    scalars,
    enums,
    mutations,
    queries,
    subscriptions,
   };
};

/**
 * Builds a unique list of scalars and/pr models from schema types that
 * can be used when iterating over a model's fields to screen out unsupported
 * field types when automatically generating query operations.
 */
export const buildTypeList = (
  schemaTypes: SchemaTypes,
  options?: {
    allowedTypes?: 'models' | 'scalars' | 'scalarsAndModels',
}): string[] => {
  const allowedTypes = options?.allowedTypes ?? 'scalarsAndModels';

  // Build a collection of all uniq types
  const fieldTypes = uniq([
    ...(allowedTypes !== 'models' ? DefaultScalars : []),
    ...(allowedTypes !== 'models' ? schemaTypes.scalars.map(t => t.id) : []),
    ...(allowedTypes !== 'scalars' ? schemaTypes.models.map(t => t.id) : []),
  ]);

  fieldTypes.map(t => logger.info( `Found type: ${t}`));

  const allowedFieldTypes = [
    ...fieldTypes,
    ...(fieldTypes.map(t => t + '!')), // Non-null required form? (may not be necessary)
  ];

  return allowedFieldTypes;
}

/**
 * Gets the identifier and type and type structure from an argument field.
 * @note Handles simple, required, and nested (array) field types.
 */
export const getArgumentInfo = (
  arg: ParserField
): FieldInfo => {
  const type =
    // @ts-ignore
    arg.type.fieldType.name ??
    // @ts-ignore
    arg.type.fieldType.nest?.name ??
    // @ts-ignore
    '[' + arg.type.fieldType.nest?.nest?.nest?.name + '!]!';

  return { id: arg.id, type, description: arg.description };
}

/**
 * Gets the identifier and type from a field
 *
 * Handles simple, required, and nested (array) field types.
 */
export const getFieldInfo = (
  field: ParserField
): FieldInfo => {
  const info = { id: field.id, description: field.description };
  const typeInfo = field.type.fieldType;

  switch (typeInfo.type) {
    case Options.required:
      if (typeInfo.nest.type === Options.array) {
        return {
          ...info,
          type:
            typeInfo.nest.nest.type === Options.required
              ? typeInfo.nest.nest.nest.type === Options.name
                ? typeInfo.nest.nest.nest.name
                : "Unknown"
              : typeInfo.nest.nest.type,
        };
      } else {
        return { ...info, type:
          typeInfo.nest.type === Options.name ? typeInfo.nest.name : typeInfo.nest.type,
        };
      }
    case Options.array:
      return {
        ...info,
        type:
          typeInfo.nest.type === Options.required
            ? typeInfo.nest.nest.type === Options.name
              ? typeInfo.nest.nest.name
              : typeInfo.nest.nest.nest.type
            : typeInfo.nest.type,
      };
    case Options.name:
      return { ...info,  type: typeInfo.name };
    default:
      return { ...info,  type: 'Unknown' }
  };
}

/**
 * Checks that a node is in fact a GraphQL Model (Object)
 **/
export const isModel = (
  node: ParserField
): boolean => {
  const fieldType = node.type.fieldType;

  if (fieldType.type !== Options.name)
    return false;
  if (fieldType.name !== TypeDefinitionDisplayStrings.type)
    return false;

  if (!['Query', 'Mutation', 'Subscription'].includes(node.id))
    return true;

  return false;
}

/**
 * Checks the arguments of a Query to determine if it matches the signature
 * of a dynamically generated NestJs-Query query many resolver.
 * {@link https://tripss.github.io/nestjs-query/docs/graphql/queries/endpoints}
 * @note
 * Assumes the query many resolver has paging, filter, and ordering enabled.
 */
export const isNestJsQueryManyResolver = (
  query: ParserField,
): boolean => {
  const queryArgs = query.args.map(arg => getArgumentInfo(arg));

  // if (queryArgs.length === 0)
  //   return false;

  // All query many resolvers return a `{Model}Connection!`
  if (!getFieldInfo(query).type?.endsWith('Connection'))
    return false;

  // Most query many resolvers are configured with paging, filtering, and sorting
  if (isEqual(['paging', 'filter', 'sorting'], queryArgs.map(arg => arg.id)))
    return true;

  return false;
}

/**
 * Gets and returns a model's (object) or an abstract model's (interface)
 * fields.
 */
export const getModelFieldsList = (
  /** Model (object) type only */
  model: ParserField,
  /** Optional, uses {@link DefaultScalars} if not provided */
  allowedFieldTypeList: string[] = [...DefaultScalars],
  /** Optional, for field-reference models only. Defaults to true */
  checkModelMapping: boolean = true,
): string[] => {
  if (checkModelMapping && (!isModel(model) || allowedFieldTypeList.length === 0)) {
    return [];
  }

  const allFields = model.args;
  const allowedFields = allFields
    .filter(field => allowedFieldTypeList.includes(getFieldInfo(field).type))
    .map(allowedField => allowedField.id);

  return allowedFields;
}

export const getArguments = (node: ParserField) => {
  const args = node.args.map(arg => getArgumentInfo(arg));
  return args;
}

export class TypesParser {
  /** Core schema types */
  readonly types: SchemaTypes;

  readonly _allowedModels: string[];
  readonly _allowedScalars: string[];

  constructor(schema: ParserTree ) {
    this.types = getTypes(schema);
    this._allowedModels = buildTypeList(this.types, { allowedTypes: 'models' });
    this._allowedScalars = buildTypeList(this.types, { allowedTypes: 'scalars' })
  }
}

/**
 * Gets and returns a model (object) list by the id reference, matching the base model
 * fields. Return object contain args from the relation model.
 */
export const getRelationModelList = (
  /** Model (object) type only */
  baseTypes: SchemaTypes,
  model: ParserField,
  relationNames: string[],
): ParserField[]  => {
  const allowedModels: ParserField[] = [];

  for (const field of model.args) {
    // If field is a relation
    if (relationNames.includes(getFieldInfo(field).type)) {
      // Gets the base Model Field for the referenced field (from within the model received)
      const fieldBaseModel = baseTypes.models.find(m => m.id === getFieldInfo(field).type);
      if (!fieldBaseModel) continue;
      /**
      * Fields with arguments are nested attributes of the relation.
      * This disables support for nested fields in a relation.
      */
      const fieldArgs = fieldBaseModel.args.filter(f => !isNestJsQueryManyResolver(f));

      allowedModels.push({
        ...field,
        args: [...fieldArgs],
      })
    }
  }


  return allowedModels;
}

/**
 * Renders operations based on NestJs-Query query many resolver definitions
 * https://tripss.github.io/nestjs-query/docs/graphql/queries/endpoints
 * @note Assumes the query many resolver has paging, filter, and ordering enabled.
 */
export class NestJsQueryOperationRenderer {

  /**
   * Renders a GraphQL query operation to find a record by id
   * https://tripss.github.io/nestjs-query/docs/graphql/queries/endpoints#find-by-id
   */
  static findById = (
    query: ParserField,
    nodeFields: string[],
    relationModels: ParserField[]
  ) => {
    if (!isNestJsQueryManyResolver(query))
      return '';

    const id = this.getSingularForm(query.id);
    const name = upperFirst(id);
    const fields = nodeFields.join('\n');
    const relationQueries = this.getRelationQueries(relationModels);

    return /*gql*/ `
      # Find a ${name} record by id.
      query ${id} (
        $id: ID!
      ) {
        ${id} (
          id: $id
        ) {
          ${fields}
          ${relationQueries.length ? relationQueries.join('\n') : ''}
        }
      }
    `;
  }

  /**
   * Renders a GraphQL query operation to filter, page, and sort records
   * https://tripss.github.io/nestjs-query/docs/graphql/queries/endpoints#querying
   */
  static queryMany = (
    query: ParserField,
    nodeFields: string[],
  ) => {
    if (!isNestJsQueryManyResolver(query))
      return '';

    const queryArgs = getArguments(query);

    const id = query.id;
    const name = upperFirst(this.getSingularForm(id));
    const fields = nodeFields.join('\n');
    const queryParams = queryArgs.map(arg => `$${arg.id}: ${arg.type}`).join('\n');
    const resolverParams = queryArgs.map(arg => `${arg.id}: $${arg.id}`).join(',\n');

    return /*gql*/ `
      # Filter, page, and sort ${name} records.
      query ${id} (
        ${queryParams}
      ) {
        ${id} (
          ${resolverParams}
        ) {
          # Paging information
          pageInfo {
            # true if paging forward and there are more records.
            hasNextPage
            # true if paging backwards and there are more records.
            hasPreviousPage
            # The cursor of the first returned record.
            startCursor
            # The cursor of the last returned record.
            endCursor
          }
          # Array of edges.
          edges {
            # The node containing the ${name}
            node {
              ${fields}
            }
            # Cursor for this node.
            cursor
          }
          # Total count of records
          totalCount
        }
      }
    `;
  }

  private static getSingularForm = (word: string) => {
    if (word.endsWith('ies'))
      return word.slice(0, -3) + 'y';

    if (word.endsWith('s') || word.endsWith('S'))
      return word.slice(0, -1);

    return word;
  };

  /**
   * Gets nested fields for relations within the base query.
   *
   * @param relationModels Field-reference models of the relations
   * These are extracted for the base model (Object)
   */
  static getRelationQueries = (
    relationModels: ParserField[],
  ): string[] => {
    const result: string[] = [];

    for (const relationModel of relationModels) {
      // Get valid scalar-only fields including JSON & DateTime
      const relatedFieldNames = getModelFieldsList(relationModel, [...ComplexScalars], false);
      if (!relatedFieldNames.length) continue;

      /**
       * Creates a query per each relation received e.g. [ relation { ... } ]
       * those are then joint as nested queries.
      */
      const nestedQuery = `
        ${getFieldInfo(relationModel).id} {
          ${relatedFieldNames.join("\n")}
        }
      `;
      result.push(nestedQuery);
    }
    return result;
  };
}
