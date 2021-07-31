import { gql } from "apollo-server-express";
import knex from "knex";
import { DocumentNode } from "graphql";

import { BaseModel, IResolvers } from "./Base";
import { authenticateGraphQLRequest } from "../../lib";
import {
    FilterCondition,
    FollowService,
    IUserColumnKeys,
    UserService,
    UserPreferenceService,
    PostService
} from "../../services";

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
                followerCount: (parent, {}, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return new FollowService(this.dbConnection).getFollowerCount(user.userNo);
                    });
                },
                followingCount: (parent, {}, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return new FollowService(this.dbConnection).getFollowingCount(user.userNo);
                    });
                },
                postCount: (parent, {}, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return new PostService(this.dbConnection).getPostCount({
                            where: {
                                userNo: {
                                    value: user.userNo
                                }
                            }
                        });
                    });
                },
                preferences: (parent, {}, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return new UserPreferenceService(this.dbConnection).getUserPreference(
                            user.userNo
                        );
                    });
                }
            },
            Mutation: {
                updateUserPreferences: (parent, { data }, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return new UserPreferenceService(this.dbConnection).updateUserPreference(
                            user.userNo,
                            data
                        );
                    });
                }
            },
            Query: {
                me: (parent, {}, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return this.service.getUser(Number(user.userNo));
                    });
                },
                searchUser: (parent, { searchTerm = "" }, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return this.service.searchUser(searchTerm);
                    });
                },
                user: (parent, { pk = 0, username = "" }, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        if (pk > 0) {
                            return this.service.getUser(Number(pk));
                        } else {
                            return this.service.getUserByUsername(username.trim());
                        }
                    });
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
                    },
                    { user }
                ) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return this.service
                            .getUserList({ where, itemsPerPage, orderBy, pageNo })
                            .then(({ data = [], pagination }) => {
                                return {
                                    users: data,
                                    pagination
                                };
                            });
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
                userNo: Int!
                username: String!
                email: String!

                firstName: String
                lastName: String
                bio: String
                profilePicture: String

                preferences: UserPreference
                postCount: Int
                followerCount: Int
                followingCount: Int

                isDeleted: Boolean!
                isBanned: Boolean!

                createdDate: DateTime!
                lastUpdated: DateTime!
                lastLoginDate: DateTime
            }

            type UserPreference {
                userPreferenceNo: Int!
                userNo: Int!
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
                value: Int!
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
                user(pk: Int, username: String): User
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
