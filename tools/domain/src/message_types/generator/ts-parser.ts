import { default as color } from "colors-cli/safe";
import fs from 'fs';
import path from 'path';
import {
  InterfaceDeclaration,
  TypeAliasDeclaration,
  Node,
  Project,
  VariableDeclaration,
} from "ts-morph";

import { logger } from "../../utils/logger";


type InterfaceFilter = (i: InterfaceDeclaration) => boolean;
type TypeAliasFilter = (i: TypeAliasDeclaration) => boolean;
type VariableFilter = (i: VariableDeclaration) => boolean;

export class TypeScriptCodeParser {
  protected project: Project;
  protected files: string[];

  constructor(files: string[]) {
    this.files = files;
    this.project = new Project();

    logger.info(`Parsing ${files.length} TypeScript source code files`);

    this.loadSourceFiles(files);
    this.updateNonRelativeImportPaths(files);
  }

  private loadSourceFiles(files: string[]) {
    logger.debug(`  - Loading source code files`);
    files.map((f) => this.project.addSourceFileAtPath(f));
  }

  /**
   * We need to explicitly rewrite the paths for any node module
   * packages that are referenced in the source code we loaded
   * as ts-morph will not be able to resolve them otherwise.
   *
   * Node module imports are relative to this tool, so any downstream
   * packages that make use of this tool and its generators must
   * also ensure any dependent package imports are brought in
   * accordingly. Also, node module imports in those imports must
   * also be brought in or parsing of TypeScript source may fail.
   *
   * @param files
   */
  private updateNonRelativeImportPaths(files: string[]) {
    logger.debug(`  - Updating non-relative import paths in source code files`);

    const nodeModulesPath = path.join(__dirname, '../node_modules');

    files.map((f) =>
      this.project
        ?.getSourceFile(f)
        ?.getImportDeclarations()
        .map((id) => {
          if (id.isModuleSpecifierRelative()) return;

          const module = id.getModuleSpecifierValue();
          const newModulePath = `${nodeModulesPath}/${module}`;

          if (fs.existsSync(newModulePath) == false)
            logger.error(
              `    - NPM Package: ${color.magenta(module)} ${color.red(
                "**MISSING**"
              )} ${newModulePath}`
            );

          id.setModuleSpecifier(newModulePath);
        })
    );
  }

  static doesNotEndWith = (str: string, endings: string[]): boolean => {
    return !endings.some(ending => str.endsWith(ending));
  }

  static messageDefinitions = [
    "MessageDefinition",
    "CommandDefinition",
    "EventDefinition",
    "QueryDefinition",
    "TaskDefinition",
  ];

  static Find = {
    Definitions: {
      Any: (v: VariableDeclaration) =>
        v.getType().getText().endsWith("Definition") ? true : false,
      Consumers: (v: VariableDeclaration) =>
        v.getType().getText().endsWith("ConsumerDefinition") ? true : false,
      Messages: (v: VariableDeclaration) =>
        this.messageDefinitions.some((match) =>
          v.getType().getText().endsWith(match)
        )
          ? true
          : false,
      Gateways: (v: VariableDeclaration) =>
        v.getType().getText().endsWith("GatewayDefinition") ? true : false,
    },
    Interfaces: {
      Messages: (i: InterfaceDeclaration) =>
        i.getName().endsWith("Message") ? true : false,
      Commands: (i: InterfaceDeclaration) =>
        i.getName().endsWith("Command") ? true : false,
      Events: (i: InterfaceDeclaration) =>
        i.getName().endsWith("Event") ? true : false,
      Queries: (i: InterfaceDeclaration) =>
        i.getName().endsWith("Query") ? true : false,
      Tasks: (i: InterfaceDeclaration) =>
        i.getName().endsWith("Task") ? true : false,
      Models: (i: InterfaceDeclaration) =>
        TypeScriptCodeParser.doesNotEndWith(i.getName(), ['Message', 'Command', 'Event', 'Query', 'Task']) ? true : false,
    },
    TypeAliases: {
      Models: (i: TypeAliasDeclaration) =>
        TypeScriptCodeParser.doesNotEndWith(i.getName(), ['Message', 'Command', 'Event', 'Query', 'Task']) ? true : false,
    },
  };

  findInterfaces(
    filter: InterfaceFilter = TypeScriptCodeParser.Find.Interfaces.Events
  ): InterfaceDeclaration[] {
    const interfaces: InterfaceDeclaration[] = [];

    this.files
      .map((f) => this.project.getSourceFile(f))
      .map(
        (f) =>
          f &&
          f
            .getInterfaces()
            .filter(filter)
            .map((i) => {
              logger.debug(
                `  - ${color.bold(i.getName())} interface discovered`
              );
              interfaces.push(i);
            })
      );

    return interfaces;
  }

  findTypeAliases(
    filter: TypeAliasFilter = TypeScriptCodeParser.Find.TypeAliases.Models
  ): TypeAliasDeclaration[] {
    const typeAliases: TypeAliasDeclaration[] = [];

    this.files
      .map((f) => this.project.getSourceFile(f))
      .map(
        (f) =>
          f &&
          f
            .getTypeAliases()
            .filter(filter)
            .map((i) => {
              logger.debug(
                `  - ${color.bold(i.getName())} interface discovered`
              );
              typeAliases.push(i);
            })
      );

    return typeAliases;
  }

  findVariables(
    filter: VariableFilter = TypeScriptCodeParser.Find.Definitions.Any
  ): VariableDeclaration[] {
    const identifiers: VariableDeclaration[] = [];

    this.files
      .map((f) => this.project.getSourceFile(f))
      .map(
        (f) =>
          f &&
          f
            .getVariableDeclarations()
            .filter(filter)
            .map((i) => {
              logger.debug(`  - ${color.bold(i.getName())} variable discovered`);
              identifiers.push(i);
            })
      );

    return identifiers;
  }

  printAst() {
    const text = this.files
      .map((f) => this.project.getSourceFile(f))
      .map((f) => f && { name: f.getFilePath(), ast: printAst(f, 0) })
      .map((p) => p && `${p.name}: ${p.ast}`)
      .join("")
      .trim();

    return { text };

    function printAst(n: Node, level: number) {
      let s = printNode(n, level) + "\n";
      n.forEachChild((c) => (s += printAst(c, level + 1)));
      return s;
    }

    function indent(i: number = 0, tabSize = 2): string {
      return new Array(i * tabSize).fill(" ").join("");
    }

    function printNode(n: Node, level: number) {
      const name = Node.isNameable(n) ? n.getName() : "";
      const kind = n.getKindName();
      const text = n
        .getText()
        .substring(0, Math.min(30, n.getText().length))
        .trim()
        .replace(/\n/g, "");
      return `${indent(level)} ${name} ${kind} ${text}`;
    }
  }
}
