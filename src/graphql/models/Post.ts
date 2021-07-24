import { gql } from "apollo-server-express";
import knex from "knex";
import { DocumentNode } from "graphql";

import { BaseModel, IResolvers } from "./Base";
import { authenticateUserSubmission } from "../../lib";
import { FilterCondition, IPostColumnKeys, PostService } from "../../services";

class PostModel extends BaseModel<PostService> {
    readonly modelName = "Post";

    constructor(dbConnection: knex) {
        super(dbConnection, new PostService(dbConnection));
    }

    public getResolvers(): IResolvers {
        return {
            Mutation: {
                createPost: (parent, { submission, userNo }, { user }) => {
                    return authenticateUserSubmission(user, userNo).then(() => {
                        return this.service.createPost({ ...submission, userNo });
                    });
                },
                deletePost: (parent, { postNo = 0, userNo }, { user }) => {
                    return authenticateUserSubmission(user, userNo).then(() => {
                        return this.service.deletePost(postNo);
                    });
                },
                updatePost: (parent, { postNo = 0, submission, userNo }, { user }) => {
                    return authenticateUserSubmission(user, userNo).then(() => {
                        return this.service.updatePost(postNo, submission);
                    });
                }
            },
            Query: {
                post: (parent, { pk = 0 }) => {
                    return this.service.getPost(Number(pk));
                },
                postCount: (
                    parent,
                    {
                        where = {},
                        itemsPerPage = 10,
                        orderBy = {
                            orderBy: {
                                direction: "desc",
                                column: IPostColumnKeys.PostNo
                            }
                        },
                        pageNo = 1
                    }
                ) => {
                    return this.service.getPostCount({ where, itemsPerPage, orderBy, pageNo });
                },
                posts: (
                    parent,
                    {
                        where = {},
                        itemsPerPage = 10,
                        orderBy = {
                            orderBy: {
                                direction: "desc",
                                column: IPostColumnKeys.PostNo
                            }
                        },
                        pageNo = 1
                    }
                ) => {
                    return this.service
                        .getPostList({ where, itemsPerPage, orderBy, pageNo })
                        .then(({ data = [], pagination }) => {
                            return {
                                pagination,
                                posts: data
                            };
                        });
                }
            }
        };
    }

    public getTypeDefinitions(): DocumentNode {
        return gql`
            type Post {
                postNo: Int!
                userNo: Int!
                spotifyId: String!
                body: String
                isEdited: Boolean!
                isDeleted: Boolean!
                createdDate: DateTime!
                lastUpdated: DateTime!
            }

            type PostList {
                posts: [Post]
                pagination: NativePagination
            }

            enum PostOrderByColumn {
                ${this.service.getSortableColumns().join("\n")}
            }

            enum PostNoFilter {
                ${(this.service.getColumnFilters(IPostColumnKeys.PostNo) as FilterCondition[]).join(
                    "\n"
                )}
            }

            input PostNoWhere {
                value: Int!
                condition: PostNoFilter
            }

            input PostsWhere {
                postNo: PostNoWhere
                userNo: UserNoWhere
            }

            input PostOrderBy {
                column: PostOrderByColumn
                direction: OrderByDirection
            }

            input CreatePostSubmission {
                spotifyId: String!
                body: String
            }

            input UpdatePostSubmission {
                body: String
            }

            extend type Mutation {
                createPost(
                    submission: CreatePostSubmission!
                    userNo: Int!
                ): Post
                deletePost(
                    postNo: Int!
                    userNo: Int!
                ): Boolean
                updatePost(
                    postNo: Int!
                    submission: UpdatePostSubmission!
                    userNo: Int!
                ): Post
            }

            extend type Query {
                post(pk: Int!): Post
                postCount(where: PostsWhere): Int
                posts(
                    itemsPerPage: Int
                    pageNo: Int
                    orderBy: PostOrderBy
                    where: PostsWhere
                ): PostList
            }
        `;
    }
}

export default PostModel;
export { PostModel };
