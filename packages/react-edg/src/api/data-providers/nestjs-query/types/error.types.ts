import type { GraphQLFormattedError } from 'graphql';

type NestjsGraphQLError = { errors: GraphQLFormattedError[] };

export type NestjsQueryDataError = NestjsGraphQLError | Error;
