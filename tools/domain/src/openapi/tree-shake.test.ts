import { describe, it, expect } from 'vitest';
import { treeShakeSchema } from './tree-shake'; // Adjust import as needed

describe('treeShakeOpenApiSchema', () => {
  it('removes unused schemas but keeps used ones', () => {
    const input = {
      openapi: '3.1.0',
      components: {
        schemas: {
          Used: { type: 'object' },
          Unused: { type: 'object' },
        },
      },
      paths: {
        '/thing': {
          get: {
            responses: {
              200: {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Used',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = treeShakeSchema({ ...structuredClone(input) });
    expect(result.components.schemas).toHaveProperty('Used');
    expect(result.components.schemas).not.toHaveProperty('Unused');
  });

  it('removes unused securitySchemes but keeps used (root-level)', () => {
    const input = {
      openapi: '3.1.0',
      components: {
        securitySchemes: {
          BearerAuth: { type: 'http', scheme: 'bearer' },
          UnusedAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
      paths: {},
    };

    const result = treeShakeSchema({ ...structuredClone(input) });
    expect(result.components.securitySchemes).toHaveProperty('BearerAuth');
    expect(result.components.securitySchemes).not.toHaveProperty('UnusedAuth');
  });

  it('keeps securitySchemes used at operation level', () => {
    const input = {
      openapi: '3.1.0',
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
      paths: {
        '/secure': {
          get: {
            security: [
              {
                ApiKeyAuth: [],
              },
            ],
            responses: {
              200: {
                description: 'ok',
              },
            },
          },
        },
      },
    };

    const result = treeShakeSchema({ ...structuredClone(input) });
    expect(result.components.securitySchemes).toHaveProperty('ApiKeyAuth');
  });

  it('removes all schemas and schemes if unused', () => {
    const input = {
      openapi: '3.1.0',
      components: {
        schemas: {
          UnusedSchema: { type: 'object' },
        },
        securitySchemes: {
          UnusedAuth: {
            type: 'http',
            scheme: 'basic',
          },
        },
      },
      paths: {},
    };

    const result = treeShakeSchema({ ...structuredClone(input) });
    expect(result.components.schemas).toEqual({});
    expect(result.components.securitySchemes).toEqual({});
  });

  it('handles missing components gracefully', () => {
    const input = {
      openapi: '3.1.0',
      paths: {},
    };

    const result = treeShakeSchema({ ...structuredClone(input) });
    expect(result).toHaveProperty('openapi');
    expect(result.components?.schemas ?? {}).toEqual({});
    expect(result.components?.securitySchemes ?? {}).toEqual({});
  });
});
