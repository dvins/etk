import { describe, it, expect } from 'vitest';
import { Options, ParserField, ParserTree } from "graphql-js-tree";

import {
  ComplexScalars,
  DefaultScalars,
  getRelationModelList,
  getTypes,
  NestJsQueryOperationRenderer,
  SchemaTypes,
} from "./graphql-parse";

describe("GraphQL Parser", () => {
  describe("Default & Complex Scalars", () => {
    it("should contain Default Scalars", () => {
      const defaultScalars = [...DefaultScalars];
      ["Int", "Float", "String", "Boolean", "ID"].forEach((v) =>
        expect(defaultScalars).toContain(v),
      );
      expect(defaultScalars.length).toBe(5);
    });

    it("should contain complex scalars", () => {
      const complexScalars = [...ComplexScalars];
      expect(complexScalars.includes("JSON")).toBeTruthy();
      expect(complexScalars.includes("DateTime")).toBeTruthy();
      expect(complexScalars).toStrictEqual([
        ...DefaultScalars,
        "JSON",
        "DateTime",
      ]);
    });
  });

  it("should getTypes", () => {
    const schema: ParserTree = {
      nodes: [
        {
          name: "test",
          id: "test",
          type: {
            fieldType: {
              type: Options.name,
              name: "type",
            },
          },
          data: {} as any,
          args: [],
          interfaces: [],
          directives: [],
        },
        {
          name: "test",
          id: "test",
          type: {
            fieldType: {
              type: Options.name,
              name: "scalar",
            },
          },
          data: {} as any,
          args: [],
          interfaces: [],
          directives: [],
        },
      ],
    };

    const resultTypes = getTypes(schema);

    expect(resultTypes).toBeDefined();
    expect(resultTypes.models.length).toEqual(1);
    expect(resultTypes.scalars.length).toEqual(1);
  });

  describe("Relation Query creation", () => {
    const schemaTypes: SchemaTypes = {
      models: [
        {
          name: "relation",
          id: "RelationType",
          args: [
            {
              id: "field1",
              name: "field1",
              args: [],
              type: { fieldType: { type: Options.name, name: "String" } },
            },
          ],
        } as any,
      ],
      interfaces: [],
      scalars: [],
      enums: [],
      mutations: [],
      queries: [],
      subscriptions: [],
    };

    const model: ParserField = {
      name: "test",
      id: "test",
      type: {
        fieldType: {
          type: Options.name,
          name: "TestingType",
        },
      },
      data: {} as any,
      args: [
        {
          id: 'relation',
          name: 'relation',
          type: {
            fieldType: {
              type: Options.name,
              name: "RelationType",
            },
          },
        } as any,
      ],
      interfaces: [],
      directives: [],
    };

    const relationNames = ["RelationType"];
    it("should getRelationModelList", () => {
      const result = getRelationModelList(schemaTypes, model, relationNames);

      expect(result).toBeDefined();
      expect(result.length).toBeTruthy();
      const internalResult = result[0];

      expect(internalResult.type.fieldType).toStrictEqual({
        type: Options.name,
        name: "RelationType",
      });
      expect(internalResult.args.length).toBeTruthy();
      expect(internalResult.args[0]).toStrictEqual(
        schemaTypes.models[0].args[0],
      );
    });

    it("should create queries for the resulting relations", () => {
      const relations = getRelationModelList(schemaTypes, model, relationNames);
      console.log(relations);

      const query = NestJsQueryOperationRenderer.getRelationQueries(relations);
      expect(query.length).toBeTruthy();
      console.log(query);
      // Removing all blank space
      expect(query[0].replace(/\s+/g, '')).toEqual(`relation{field1}`);
    });
  });
});
