import path from "path";
import fs from "fs";
import Handlebars from "handlebars";
import { logger } from "../utils";

Handlebars.registerHelper("toNestJSPath", function (path) {
  if (path.includes("{+path}")) {
    return path.replace("{+path}", ":path(*)");
  }

  return path.replace(/\{([^}]+)\}/g, ":$1");
});

Handlebars.registerHelper("buildControllerName", function (title) {
  return title
    .split(" ")
    .reduce(
      (acc: string, e: string) =>
        `${acc}${e.charAt(0).toUpperCase()}${e.substring(1)}`,
      ""
    );
});

Handlebars.registerHelper("firstLetterLowerCase", function (word) {
  return `${word.charAt(0).toLowerCase()}${word.substring(1)}`;
});

Handlebars.registerHelper("firstLetterUpperCase", function (word) {
  return `${word.charAt(0).toUpperCase()}${word.substring(1)}`;
});

Handlebars.registerHelper("getApiResponse", (response, status) => {
  const result: any = { status: parseInt(status) };
  if (response.description) result["description"] = response.description;
  if (
    response.content &&
    response.content["application/json"] &&
    response.content["application/json"].schema
  )
    result["schema"] = patchApiDecoratorSchema(
      response.content["application/json"].schema
    );

  return JSON.stringify(result);
});

Handlebars.registerHelper("json", function (context) {
  return JSON.stringify(context);
});

const patchApiDecoratorSchema = (obj: any): any =>
  !!obj
    ? Array.isArray(obj)
      ? obj.map((e) => patchApiDecoratorSchema(e))
      : typeof obj === "object"
      ? Object.fromEntries(
          Object.entries(obj).map(([k, v]) => {
            // remove these fields
            if (k.startsWith("x-") || k.startsWith("$")) return [];
            // unfortunatelly nestjs swagger library allows only type: string
            if (k === "type" && v == null) {
              // if the type is an array on the original schema,
              // which is essentialy an union type, we pick instead the first defined element
              // or define the type as null if there is not such an element
              return ["type", "null"];
            }
            if (k === "type" && Array.isArray(v))
              return [k, v.find((e) => !!e)];

            return [k, patchApiDecoratorSchema(v)];
          })
        )
      : obj
    : obj;

Handlebars.registerHelper("patchApiBodySchema", function (context) {
  const patched = patchApiDecoratorSchema(context);
  return JSON.stringify(patched);
});

Handlebars.registerHelper(
  "readParameterFromRequest",
  function (parameter: { in: string; name: string; schema: { type: string } }) {
    let result;
    switch (parameter.in) {
      case "header":
        result = `request.get('${parameter.name}') as string`;
        break;
      case "path":
        result = `request.params['${parameter.name}']`;
        break;

      case "query":
        result = `request.query['${parameter.name}'] as any`;
        break;

      case "cookie":
        result = `request.cookies['${parameter.name}']`;
        break;

      default:
        console.error("Unable to deduce parameter from request", parameter);
    }

    // path definition of some types
    if (parameter.schema.type === "integer")
      result = `parseInt(${result} as string)`;

    return result;
  }
);

const toType = function (args: {
  hash: { schema: { type: string; items: { type: string } } };
}) {
  const {
    hash: { schema },
  } = args;
  // remove any quotes from the type definition before matching
  const t = schema.type;

  switch (t.split('"').join("").split('"').join("")) {
    case "string":
    case "date":
    case "number":
    case "boolean":
    case "any":
      return t;
    case "null":
      return "nullable";
    case "array":
      return `${schema.items.type}[]`;
    case "integer":
      return "number";
    case "object":
      return getSchemaTypeName(args);
    default:
      console.log("unknown type", t);
      return "any";
  }
};

Handlebars.registerHelper("toType", toType);

const buildMethodName = function (
  method: string,
  path: string,
  parameters: { name: string }[],
  operationId: string
) {
  // if method has an operation id, use it as the name
  if (operationId)
    return operationId
      .split(" ")
      .reduce(
        (acc, v) => `${acc}${v.charAt(0).toUpperCase()}${v.substring(1)}`
      );

  const firstPart = path.split("/").reduce(
    (acc, e) =>
      e.charAt(0) !== "{" // skip path parameters
        ? `${acc}${e.charAt(0).toUpperCase()}${e.substring(1)}`
        : acc,
    method
  );

  let secondPart = "";
  if (parameters && parameters.length > 0)
    secondPart =
      "By" +
      parameters
        .map((p) => `${p.name.charAt(0).toUpperCase()}${p.name.substring(1)}`)
        .join("And");

  return firstPart + secondPart;
};

Handlebars.registerHelper("buildMethodName", buildMethodName);

const getIstioPathFromOpenAPI = (path: string) => {
  const [p1, p2] = path.split(":");
  return `${p1}${p2 ? "*" : ""}`;
};

Handlebars.registerHelper("getIstioPathFromOpenAPI", getIstioPathFromOpenAPI);

const getSchemaName = function (args: any) {
  const { data } = args;
  if (
    data.key === "default" ||
    new RegExp(/^[1-5][0-9][0-9]$/).test(`${parseInt(data.key)}`)
  ) {
    const method = data._parent.key;
    const path = data._parent._parent.key;
    const operationId = data.root.paths[path][method].operationId;
    const methodName = buildMethodName(method, path, [], operationId);

    return `${methodName}Response${
      data.key === "default" ? "Default" : data.key
    }Schema`;
  }
  // we need to distinguish between schemas passed from the parameters and schemas from request body
  // as they are not at the same level from the root document
  const method = typeof data.key === "string" ? data.key : data._parent.key;
  const path =
    typeof data.key === "string" ? data._parent.key : data._parent._parent.key;
  const parameters = data.root.paths[path][method].parameters;
  const operationId = data.root.paths[path][method].operationId;
  const parameterName =
    typeof data.key === "number"
      ? safeParameterName(
          data.root.paths[path][method].parameters[data.key].name
        )
      : undefined;

  const methodName = buildMethodName(method, path, parameters, operationId);
  if (parameterName)
    return `${methodName}${parameterName
      .charAt(0)
      .toUpperCase()}${parameterName.substring(1)}ParameterSchema`;

  return `${methodName}BodySchema`;
};
Handlebars.registerHelper("getSchemaName", getSchemaName);

const getSchemaTypeName = (args: any) => {
  const schemaName = getSchemaName(args);
  return `${schemaName.charAt(0).toUpperCase()}${schemaName
    .substring(1)
    .slice(0, -6)}`;
};
Handlebars.registerHelper("getSchemaTypeName", getSchemaTypeName);

const getParametersSchemaName = (args: any) => {
  return getSchemaName(args).replace("BodySchema", "ParametersSchema");
};
Handlebars.registerHelper("getParametersSchemaName", getParametersSchemaName);

const getHeadersSchemaName = (args: any) => {
  return getSchemaName(args).replace("BodySchema", "HeadersSchema");
};
Handlebars.registerHelper("getHeadersSchemaName", getHeadersSchemaName);

Handlebars.registerHelper("inQuery", function (parameters: { in: string }[]) {
  return parameters.reduce((acc, v) => acc || v.in === "query", false);
});

Handlebars.registerHelper("inHeaders", function (parameters: { in: string }[]) {
  return parameters.reduce((acc, v) => acc || v.in === "header", false);
});

Handlebars.registerHelper("uppercase", function (s) {
  return s.toUpperCase();
});

Handlebars.registerHelper("eq", (a, b) => a === b);

Handlebars.registerHelper("defined", function (s) {
  return !!s;
});

Handlebars.registerHelper('hasAuthScheme', function (sec, scheme) {
  return sec && typeof sec === 'object' && Object.prototype.hasOwnProperty.call(sec, scheme);
});

Handlebars.registerHelper("isEmptyArray", function (val) {
  return Array.isArray(val) && val.length === 0;
});

// convert string to safe camel case
export const safeParameterName = (parameter: string) =>
  [...parameter].reduce((acc, v) =>
    ["-", " "].indexOf(acc.charAt(acc.length - 1)) > -1
      ? `${acc.slice(0, -1)}${v.toUpperCase()}`
      : acc + v
  );

Handlebars.registerHelper("safeParameterName", safeParameterName);

Handlebars.registerHelper("toZodType", function (t) {
  if (t === null) return "null";
  if (t === undefined) return "undefined";
  if (!t) {
    logger.warn(
      `toZodType received an invalid argument: ${t}, returning 'any'`
    );
    return "any";
  }
  // remove any quotes from the type definition before matching
  switch (t.split('"').join("").split('"').join("")) {
    case "string":
    case "object":
    case "date":
    case "number":
    case "boolean":
    case "array":
    case "null":
    case "undefined":
    case "any":
      return t;
    case "integer":
      return "number";
    default:
      console.log("unknown type", t);
      return "any";
  }
});

Handlebars.registerHelper("isNullable", function (args) {
  return Array.isArray(args) && args.indexOf(null) > -1;
});

Handlebars.registerHelper("getNullableType", function (args) {
  // TODO: this will work only for simple nullable types
  return args.find((e: any) => e !== null);
});

Handlebars.registerHelper("getFileName", function (args) {
  const { data } = args;
  const method = typeof data.key === "string" ? data.key : data._parent.key;
  const path =
    typeof data.key === "string" ? data._parent.key : data._parent._parent.key;
  const operationId = data.root.paths[path][method].operationId;
  const requestBody = data.root.paths[path][method].requestBody;

  const properties =
    requestBody.content["multipart/form-data"].schema.properties;
  return Object.keys(properties).filter(
    (k) => properties[k].format === "binary"
  )[0];
});

Handlebars.registerHelper("toZodFormat", function (f) {
  switch (f) {
    case "email":
    case "url":
    case "uuid":
      return f;
    case "uri":
      return "url";
    // this is for file uploads
    case "binary":
      return "string";

    default:
      console.warn("unknown format", f);
  }
});

Handlebars.registerHelper(
  "getEnumName",
  function (enumDef: string[] | number[]) {
    return (
      "Enum" +
      enumDef
        .map((v) => `${v}`)
        .reduce(
          (acc, v) =>
            `${acc}${v.charAt(0).toUpperCase()}${v.substring(1)}`
              .replaceAll(".", "")
              .replaceAll("*", "")
              .replaceAll("[]", "Array")
              .replaceAll("-", "_"),
          ""
        )
    );
  }
);

Handlebars.registerHelper("getMetadata", function (s: any, f: string) {
  const getMetadata = (schema: any, field: string): string[] =>
    schema
      ? Object.entries(schema).reduce(
          (acc: string[], [k, v]: [string, any]) => {
            if (v && v.enum && v[field]) return [...acc, v[field]];
            if (typeof v === "object")
              return [...acc, ...getMetadata(v, field)];
            if (Array.isArray(v))
              return [
                ...acc,
                ...v.reduce(
                  (acc2, vv) => [...acc2, ...getMetadata(vv, field)],
                  []
                ),
              ];

            return acc;
          },
          []
        )
      : [];
  const result = getMetadata(s, f)
    .filter((e) => !!e)
    .reduce(
      (acc: string[], v: string) => (acc.indexOf(v) < 0 ? [...acc, v] : acc),
      []
    );
  //console.log("getMetadata", f, result);
  return result;
});

Handlebars.registerHelper("optional", function (s, required) {
  return required && Array.isArray(required) ? required.indexOf(s) < 0 : true;
});

Handlebars.registerHelper("startWithNumber", function (value) {
  return value.length !== 0 && value[0] >= "0" && value[0] <= "9";
});

Handlebars.registerHelper("renderZod", function (s) {
  return zodSchemaTemplate({ ...s });
});

Handlebars.registerHelper("isUnionType", function (s) {
  return Array.isArray(s);
});

const zodSchemaTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/openapi-zod-schema.hbs")
    )
    .toString()
);
Handlebars.registerPartial("zodSchema", zodSchemaTemplate);

const nestControllerTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/nest-controller.hbs")
    )
    .toString()
);
Handlebars.registerPartial("nestController", nestControllerTemplate);

const methodTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/method.hbs")
    )
    .toString()
);

Handlebars.registerPartial("method", methodTemplate);

const methodSchemaDefsTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/method-schema-defs.hbs")
    )
    .toString()
);

Handlebars.registerPartial("methodSchemaDefs", methodSchemaDefsTemplate);

const importsTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/imports.hbs")
    )
    .toString()
);

Handlebars.registerPartial("imports", importsTemplate);

const handlerTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/handler.hbs")
    )
    .toString()
);

Handlebars.registerPartial("handler", handlerTemplate);

export const libraryTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/library.hbs")
    )
    .toString()
);

const swaggerTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/swagger.hbs")
    )
    .toString()
);

Handlebars.registerPartial("swagger", swaggerTemplate);

export const istioAuthorizationPolicyTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/istio-authorization-policy.hbs")
    )
    .toString()
);

Handlebars.registerPartial(
  "istioAuthorizationPolicyTemplate",
  istioAuthorizationPolicyTemplate
);

const validationGuardTemplate = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/validation-guard.hbs")
    )
    .toString()
);

Handlebars.registerPartial("validation-guard", validationGuardTemplate);

const zodValidationExceptionFilter = Handlebars.compile(
  fs
    .readFileSync(
      path.join(__dirname, "./templates/openapi/zod-validation-exception-filter.hbs")
    )
    .toString()
);

Handlebars.registerPartial(
  "zod-validation-exception-filter",
  zodValidationExceptionFilter
);
