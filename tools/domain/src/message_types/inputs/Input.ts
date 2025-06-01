import { escape } from "lodash";
import {
  ArrayLiteralExpression,
  ArrowFunction,
  Expression,
  Identifier,
  Node,
  ObjectLiteralElementLike,
  ObjectLiteralExpression,
  PropertyAssignment,
  SyntaxKind,
} from "ts-morph";

import { logger } from "../../utils";

export interface IInput {
  name: string;
  inputType: string;
  type: string;
}

export abstract class AbstractInput<T extends Node> implements IInput {
  protected _node: T;
  protected _metadataType = "abstract";

  constructor(node: T) {
    this._node = node;
  }

  get name(): string {
    return this._node.getText().replace("Definition", "");
  }
  get type(): string {
    return this._node.getType().getText().replace("Definition", "");
  }
  get inputType(): string {
    return this._metadataType;
  }

  toPlainObject(): IInput {
    return {
      name: this.name,
      type: this.type,
      inputType: this.inputType,
    };
  }
}

/**
 * Extract the corresponding type name from an identifier node referencing a type
 */
export const getTypeNameFromIdentifier = (
  node: Identifier,
  replaceSearchValue: string | RegExp
) => {
  const identifierText = node.getText();
  const typeName = identifierText.replace(replaceSearchValue, "");

  return typeName;
};

/**
 * Extract the corresponding type names from a node array literal expression with any
 * references to strong type and preserve any string based literals also present in
 * the array.
 */
export const getTypeNamesFromArrayLiteral = (
  node: ArrayLiteralExpression,
  replaceSearchValue: string | RegExp
) => {
  const typeNames: string[] = [];
  const elements = node.getElements();

  if (!elements) return typeNames;

  elements.map((element) => {
    const kind = element.getKind();
    switch (kind) {
      case SyntaxKind.Identifier:
        typeNames.push(
          getTypeNameFromIdentifier(element as Identifier, replaceSearchValue)
        );
        break;

      case SyntaxKind.ObjectLiteralExpression:
        // Recursive case
        const objectLiteral = element as ObjectLiteralExpression;
        const properties = objectLiteral.getChildrenOfKind(
          SyntaxKind.PropertyAssignment
        );
        replacePropertyTypesWithTypeNames(
          properties as ObjectLiteralElementLike[],
          replaceSearchValue
        );
        break;

      case SyntaxKind.StringLiteral:
        typeNames.push(element.getText());
        break;

      default:
        logger.warn(`Unsupported Element Kind: ${element.getKindName()}`);
        break;
    }
  });

  return typeNames;
};

/**
 * Replaces any references to strong types in an expression with
 * corresponding string type names.
 */
export const replaceExpressionTypesWithTypeNames = (
  node: Expression,
  replaceSearchValue: string | RegExp
) => {
  const kind = node.getKind();
  switch (kind) {
    case SyntaxKind.ArrayLiteralExpression:
      // Recursive case
      const arrayLiteral = node as ArrayLiteralExpression;
      const elements = arrayLiteral.getElements();
      elements.map((element) =>
        replaceExpressionTypesWithTypeNames(element, replaceSearchValue)
      );
      break;

    case SyntaxKind.Identifier:
      const typeName = getTypeNameFromIdentifier(
        node as Identifier,
        replaceSearchValue
      );
      node.replaceWithText(`'${typeName}'`);
      break;

    case SyntaxKind.ObjectLiteralExpression:
      // Recursive case
      const objectLiteral = node as ObjectLiteralExpression;
      const properties = objectLiteral.getProperties();
      replacePropertyTypesWithTypeNames(properties, replaceSearchValue);
      break;

    case SyntaxKind.ArrowFunction:
      const arrowFunction = node as ArrowFunction;
      const arrowFunctionTxt = arrowFunction.getText();
      const escapedArrowFunctionTxt = escape(arrowFunctionTxt);
      arrowFunction.replaceWithText(`'${escapedArrowFunctionTxt}'`);
      break;

    case SyntaxKind.StringLiteral:
    case SyntaxKind.NoSubstitutionTemplateLiteral:
      break;

    default:
      logger.warn(`Unsupported Expression Kind: ${node.getKindName()}`);
      break;
  }
};

/**
 * Replaces any references to strong types in a property assignments with
 * corresponding type names.
 */
export const replacePropertyTypesWithTypeNames = (
  nodes: ObjectLiteralElementLike[],
  replaceSearchValue: string | RegExp
) => {
  nodes.map((node) => {
    const kind = node.getKind();
    switch (kind) {
      case SyntaxKind.PropertyAssignment:
        const propertyAssignment = node as PropertyAssignment;
        const initializer = propertyAssignment.getInitializer();
        if (!initializer) break;
        replaceExpressionTypesWithTypeNames(initializer, replaceSearchValue);
        break;

      default:
        logger.warn(`Unsupported Property Kind: ${node.getKindName()}`);
        break;
    }
  });
};

