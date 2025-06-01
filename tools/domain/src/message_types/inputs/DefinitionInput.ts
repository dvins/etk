import { Expression, SyntaxKind, VariableDeclaration } from 'ts-morph';
import { Isolate } from 'isolated-vm';

import { AbstractInput, IInput, replaceExpressionTypesWithTypeNames } from './Input';

export interface IDefinitionInput<T> extends IInput{
  name: string;
  definition: T;
  definitionName: string;
  definitionType: string;
  interface: string;
}
export class DefinitionInput<T> extends AbstractInput<VariableDeclaration>
  implements IDefinitionInput<T>
{
  override _metadataType = 'definition';

  get definition(): T { return DefinitionInput.getDefinitionFromVariableDeclaration(this._node) }
  get definitionName(): string { return this._node.getName() }
  get definitionType(): string { return this._node.getTypeNode()?.getText()! }
  get interface(): string { return 'I' + this.name }
  override get name(): string { return this.definitionName.replace('Definition', '') }
  override get type(): string { return this.definitionType.replace('Definition', '') }

  override toPlainObject(): IDefinitionInput<T> {
    return {
      definition: this.definition,
      definitionName: this.definitionName,
      definitionType: this.definitionType,
      interface: this.interface,
      inputType: this.inputType,
      name: this.name,
      type: this.type,
    };
  }

  /**
   * Instantiate and return a typed definition object using a variable declaration
   * from an external source code file.
   *
   * This is accomplished by:
   *   1. Fetching the variable declaration string literal from the source code file
   *   2. Safely parsing the string literal, converting external types to strings
   *   3. Instantiating the parsed string literal into an object in the current process.
   *
   */
  static getDefinitionFromVariableDeclaration = <T>(node: VariableDeclaration): T => {
    const initializer = node.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

    if (!initializer)
      throw new Error(`Unable to get definition from ${node.getName()}`);

    replaceExpressionTypesWithTypeNames(initializer as Expression, 'Definition');
    const definitionLiteral = initializer.getFullText();
    // logger.warn(definitionLiteral);

    const vmInstance = new Isolate();;
    const context = vmInstance.createContextSync();
    const script = vmInstance.compileScriptSync(`(${definitionLiteral})`);
    const definition: T = script.runSync(context, { copy: true });

    return definition;
  }
}
