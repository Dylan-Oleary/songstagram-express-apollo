import { Express } from "express";
import extend from "extend";
import { gql } from "apollo-server-express";
import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "graphql-tools";
import { GraphQLDateTime } from "graphql-iso-date";

import { DB_CONNECTION } from "../config/constants";
import { SpotifyModel, UserModel } from "./models";

const buildSchema: (app: Express) => GraphQLSchema = (app) => {
    const dbConnection = app.get(DB_CONNECTION);

    const spotifyModel = new SpotifyModel();
    const userModel = new UserModel(dbConnection);

    return makeExecutableSchema({
        typeDefs: gql`
            scalar DateTime

            enum OrderByDirection {
                asc
                desc
            }

            type NativePagination {
                currentPage: Int
                itemsPerPage: Int
                nextPage: Int
                prevPage: Int
                totalPages: Int
                totalRecords: Int
            }

            type Query {
                _: Boolean
            }

            type Mutation {
                _: Boolean
            }

            ${userModel.getTypeDefinitions()}
            ${spotifyModel.getTypeDefinitions()}
        `,
        resolvers: extend(
            true,
            {
                DateTime: GraphQLDateTime
            },
            userModel.getResolvers(),
            spotifyModel.getResolvers()
        )
    });
};

export default buildSchema;
export { buildSchema };
