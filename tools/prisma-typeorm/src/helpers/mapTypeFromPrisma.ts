export const mapTypeFromPrisma = (prismaType: string) => {
  switch (prismaType) {
    case 'DateTime':  return 'Date';
    case 'Decimal':   return 'number';
    case 'Float':     return 'number';
    case 'Int':       return 'number';
    case 'Json':      return 'any';
    case 'String':    return 'string';

    default:
      return prismaType;
  }
}
