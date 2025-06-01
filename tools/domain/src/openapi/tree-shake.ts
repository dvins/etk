/**
 * Collects all schema component names defined in the document under `components.schemas`.
 */
const findSchemas = (document: any): Set<string> => {
  const schemas = new Set<string>();
  if (document.components?.schemas) {
    for (const key in document.components.schemas) {
      schemas.add(key);
    }
  }
  return schemas;
};

/**
 * Recursively scans the document for any `$ref` usages that reference `#/components/schemas/...`
 * and tracks the names of the referenced schemas.
 *
 * This uses a breadth-first traversal via a queue to handle deeply nested structures,
 * including inside request bodies, parameters, and nested properties.
 *
 * Only `$ref`s targeting `#/components/schemas/*` are tracked; all others are ignored.
 */
const findSchemaReferences = (document: any): Set<string> => {
  const references = new Set<string>();

  // Queue holds nested objects to traverse. Start with the root document.
  const queue = [document];

  while (queue.length > 0) {
    const current = queue.shift();

    // Skip if current node isn't a valid object
    if (typeof current !== 'object' || current === null) continue;

    for (const key in current) {
      const value = current[key];

      // Check if this property is a $ref to a schema
      if (
        key === '$ref' &&
        typeof value === 'string' &&
        value.startsWith('#/components/schemas/')
      ) {
        // Extract the schema name from the $ref string
        const refName = value.split('/').pop();
        if (refName) references.add(refName);
      }

      // If this property is another object (or array), add to queue for traversal
      else if (typeof value === 'object' && value !== null) {
        queue.push(value);
      }
    }
  }

  return references;
};

/**
 * Extracts the names of all security schemes referenced via `security` blocks
 * at both the global and operation levels.
 *
 * Security schemes are not `$ref`ed like schemas. Instead, they're referenced by name
 * through objects like: `{ BearerAuth: [] }`, so we must track them explicitly.
 */
const findUsedSecuritySchemes = (document: any): Set<string> => {
  const used = new Set<string>();

  // Helper to extract scheme names from a security block (array of objects)
  const collectFromSecurityBlock = (block: any) => {
    if (Array.isArray(block)) {
      for (const entry of block) {
        if (typeof entry === 'object' && entry !== null) {
          for (const schemeName of Object.keys(entry)) {
            used.add(schemeName);
          }
        }
      }
    }
  };

  // Root-level security block
  if (document.security) {
    collectFromSecurityBlock(document.security);
  }

  // Operation-level security blocks
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      if (operation?.security) {
        collectFromSecurityBlock(operation.security);
      }
    }
  }

  return used;
};

/**
 * Removes schema definitions from `components.schemas` that are never $ref'd.
 */
const removeUnusedSchemas = (
  document: any,
  allSchemas: Set<string>,
  usedSchemas: Set<string>
): void => {
  for (const schema of allSchemas) {
    if (!usedSchemas.has(schema)) {
      delete document.components.schemas[schema];
    }
  }
};

/**
 * Removes unused entries from `components.securitySchemes` based on actual usage
 * in `security` blocks throughout the document.
 */
const removeUnusedSecuritySchemes = (
  document: any,
  usedSchemes: Set<string>
): void => {
  if (!document.components?.securitySchemes) return;

  for (const schemeName of Object.keys(document.components.securitySchemes)) {
    if (!usedSchemes.has(schemeName)) {
      delete document.components.securitySchemes[schemeName];
    }
  }
};

/**
 * Optimizes an OpenAPI 3.x document by removing unused component schemas and
 * security schemes.
 *
 * This is especially useful after merging multiple specs, where some components
 * may no longer be referenced. The tree-shaker ensures the final output
 * is minimal and valid.
 *
 * @param document - The OpenAPI document to tree-shake (mutated in-place)
 * @returns The same document object with pruned components
 */
export const treeShakeSchema = (document: any): any => {
  const allSchemas = findSchemas(document);
  const referencedSchemas = findSchemaReferences(document);
  const usedSecuritySchemes = findUsedSecuritySchemes(document);

  removeUnusedSchemas(document, allSchemas, referencedSchemas);
  removeUnusedSecuritySchemes(document, usedSecuritySchemes);

  return document;
};

