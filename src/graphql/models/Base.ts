import knex from "knex";
import { DocumentNode } from "graphql";

import { ILooseObject } from "custom";
import { IUserAccessTokenValues } from "../../services";

export type ResolverContext = {
    dbConnection: knex;
    user: IUserAccessTokenValues;
    spotifyWebApiToken: string;
};

export type Resolver = (parent: ILooseObject, args: ILooseObject, context: ResolverContext) => any;

export interface IResolvers {
    [key: string]: {
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
