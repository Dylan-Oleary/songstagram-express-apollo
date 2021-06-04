import knex from "knex";
import { DocumentNode } from "graphql";

import { ILooseObject } from "custom";

export type ResolverContext = {
    dbConnection: knex;
    user: {
        userNo: number;
    };
};

export type Resolver = (parent: ILooseObject, args: ILooseObject, context: ResolverContext) => any;

export interface IResolvers {
    Mutation?: {
        [key: string]: Resolver;
    };
    Query?: {
        [key: string]: Resolver;
    };
}

abstract class BaseModel<Service> {
    protected service: Service;
    protected dbConnection: knex;

    constructor(dbConnection: knex, service: Service) {
        this.dbConnection = dbConnection;
        this.service = service;
    }

    abstract readonly modelName: string;
    abstract getResolvers(): IResolvers;
    abstract getTypeDefinitions(): DocumentNode;
}

export default BaseModel;
export { BaseModel };
