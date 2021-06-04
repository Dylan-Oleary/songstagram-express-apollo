import { gql } from "apollo-server-express";
import knex from "knex";
import { DocumentNode } from "graphql";

import { BaseModel, IResolvers } from "./Base";
import {
    FilterCondition,
    IUserColumnKeys,
    UserService,
    UserPreferenceService
} from "../../services";

/**
 * GraphQL User Model
 */
class UserModel extends BaseModel<UserService> {
    readonly modelName = "User";

    constructor(dbConnection: knex) {
        super(dbConnection, new UserService(dbConnection));
    }

    /**
     * Returns the user model resolvers
     */
    public getResolvers(): IResolvers {
        return {
            User: {
                preferences: (parent, {}, { user }) => {
                    return new UserPreferenceService(this.dbConnection).getUserPreference(
                        user.userNo
                    );
                }
            },
            Mutation: {
                updateUserPreferences: (parent, { data }, { user }) => {
                    return new UserPreferenceService(this.dbConnection).updateUserPreference(
                        user.userNo,
                        data
                    );
                }
            },
            Query: {
                me: (parent, {}, { user }) => {
                    return this.service.getUser(Number(user.userNo));
                },
                searchUser: (parent, { searchTerm = "" }) => {
                    return this.service.searchUser(searchTerm);
                },
                user: (parent, { pk = 0 }) => {
                    return this.service.getUser(Number(pk));
                },
                users: (
                    parent,
                    {
                        where = {},
                        itemsPerPage = 10,
                        orderBy = {
                            orderBy: {
                                direction: "desc",
                                column: IUserColumnKeys.UserNo
                            }
                        },
                        pageNo = 1
                    }
                ) => {
                    return this.service
                        .getUserList({ where, itemsPerPage, orderBy, pageNo })
                        .then(({ data = [], pagination }) => {
                            return {
                                users: data,
                                pagination
                            };
                        });
                }
            }
        };
    }

    /**
     * Returns the user model type defintions
     */
    public getTypeDefinitions(): DocumentNode {
        return gql`
            type User {
                userNo: ID!
                username: String!
                email: String!

                firstName: String
                lastName: String
                bio: String
                profilePicture: String

                preferences: UserPreference

                isDeleted: Boolean!
                isBanned: Boolean!

                createdDate: DateTime!
                lastUpdated: DateTime!
                lastLoginDate: DateTime
            }

            type UserPreference {
                userPreferenceNo: ID!
                userNo: ID!
                prefersDarkMode: Boolean
                lastUpdated: DateTime!
            }

            type UserList {
                users: [User]
                pagination: NativePagination
            }

            enum UserOrderByColumn {
                ${this.service.getSortableColumns().join("\n")}
            }

            enum UserNoFilter {
                ${(this.service.getColumnFilters(IUserColumnKeys.UserNo) as FilterCondition[]).join(
                    "\n"
                )}
            }

            input UserNoWhere {
                value: ID!
                condition: UserNoFilter
            }

            input UsersWhere {
                userNo: UserNoWhere
            }

            input UserOrderBy {
                column: UserOrderByColumn
                direction: OrderByDirection
            }

            input UpdateUserPreferencesData {
                prefersDarkMode: Boolean
            }

            extend type Mutation {
                updateUserPreferences(data: UpdateUserPreferencesData): UserPreference
            }

            extend type Query {
                me: User
                searchUser(searchTerm: String!): [User]
                user(pk: ID!): User
                users(
                    itemsPerPage: Int
                    pageNo: Int
                    orderBy: UserOrderBy
                    where: UsersWhere
                ): UserList
            }
        `;
    }
}

export default UserModel;
export { UserModel };
