import { gql } from "apollo-server-express";
import knex from "knex";
import { DocumentNode } from "graphql";

import { BaseModel, IResolvers } from "./Base";
import { FilterCondition, IPostColumnKeys, PostService } from "../../services";

class PostModel extends BaseModel<PostService> {
    readonly modelName = "Post";

    constructor(dbConnection: knex) {
        super(dbConnection, new PostService(dbConnection));
    }

    public getResolvers(): IResolvers {
        return {
            Mutation: {
                createPost: (parent, { data }) => {
                    return this.service.createPost(data);
                }
            },
            Query: {
                post: (parent, { pk = 0 }) => {
                    return this.service.getPost(Number(pk));
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
                postNo: ID!
                userNo: ID!
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
                value: ID!
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

            input CreatePostData {
                userNo: ID!
                spotifyId: String!
                body: String
            }

            extend type Mutation {
                createPost(data: CreatePostData!): Post
            }

            extend type Query {
                post(pk: ID!): Post
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
