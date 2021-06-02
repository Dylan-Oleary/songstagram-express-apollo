import knex from "knex";
import { DocumentNode } from "graphql";

export type IResolverParent = {
    [key: string]: any;
};

export type IResolverArgs = {
    [key: string]: any;
};

export type IResolverContext = {
    dbConnection: knex;
    user: {
        userNo: number;
    };
};

export interface IResolvers {
    Query: {
        [key: string]: (
            parent: IResolverParent,
            args: IResolverArgs,
            context: IResolverContext
        ) => any;
    };
}

abstract class BaseModel {
    protected dbConnection: knex;

    constructor(dbConnection: knex) {
        this.dbConnection = dbConnection;
    }

    abstract getResolvers(): IResolvers;

    abstract getTypeDefinitions(): DocumentNode;
}

export default BaseModel;
export { BaseModel };
