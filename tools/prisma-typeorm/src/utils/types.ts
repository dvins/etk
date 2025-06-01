import fs from 'fs';

export const log = function (...args: any[]) {
  console.log(...args);

  fs.appendFileSync(
    '/tmp/debug.log',
    args.map((x) => JSON.stringify(x, null, 2)).join(' ') + '\n'
  );
};

export type Column = {
  name: string;
  colType: string;
  colModifier: string;
  colOptions?: any;
};

export type Relationship = {
  entity: string;
  field: string;
  targetField: string;
  extraDecorator?: string[];
};

// TypeORM API
export type FieldMap = {
  name: string;
  referencedColumnName: string;
};

export type MappedRelationship = Relationship & {
  fieldMap?: FieldMap[];
};

export type ViewDef = {
  view: string;
  viewName: string;
  schema?: string;
  columns: Column[];
  primary: Column[];
  oneToOne: Relationship[];
  oneToMany: Relationship[];
  manyToOne: MappedRelationship[];
  manyToMany: Relationship[];
  imports: {
    name: string;
    path: string;
  }[];
};

export type EntityDef = {
  entity: string;
  entityName: string;
  schema?: string;
  columns: Column[];
  updatedAt: Column[];
  createdAt: Column[];
  primary: Column[];
  oneToOne: Relationship[];
  oneToMany: Relationship[];
  manyToOne: MappedRelationship[];
  manyToMany: Relationship[];
  imports: {
    name: string;
    path: string;
  }[];
};


export type ServiceDef = {
  entity: string
}

export type EntityDef2 = {
  entity: string
  entityName: string
  columns: Column[]
}
