import { gql } from "apollo-server-express";
import knex from "knex";
import { DocumentNode } from "graphql";

import { BaseModel, IResolvers } from "./Base";
import { authenticateGraphQLRequest, authenticateUserSubmission } from "../../lib";
import { CommentsService, FilterCondition, ICommentColumnKeys } from "../../services";

class CommentModel extends BaseModel<CommentsService> {
    readonly modelName = "Comment";

    constructor(dbConnection: knex) {
        super(dbConnection, new CommentsService(dbConnection));
    }

    public getResolvers(): IResolvers {
        return {
            Mutation: {
                createComment: (parent, { submission, userNo }, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return authenticateUserSubmission(user, userNo).then(() => {
                            return this.service.createComment({ ...submission, userNo });
                        });
                    });
                }
            },
            Query: {
                comment: (parent, { pk = 0 }, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return this.service
                            .getComment(Number(pk))
                            .then((comment) => this.service.formatCommentToHtml(comment));
                    });
                },
                commentCount: (parent, { where = {} }, { user }) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return this.service.getCommentCount({ where });
                    });
                },
                comments: (
                    parent,
                    {
                        where = {},
                        itemsPerPage = 10,
                        orderBy = {
                            orderBy: {
                                direction: "desc",
                                column: ICommentColumnKeys.CommentNo
                            }
                        },
                        pageNo = 1
                    },
                    { user }
                ) => {
                    return authenticateGraphQLRequest(user).then(() => {
                        return this.service
                            .getCommentList({ where, itemsPerPage, orderBy, pageNo })
                            .then(({ data = [], pagination }) => {
                                return {
                                    comments: data.map((comment) =>
                                        this.service.formatCommentToHtml(comment)
                                    ),
                                    pagination
                                };
                            });
                    });
                }
            }
        };
    }

    public getTypeDefinitions(): DocumentNode {
        return gql`
            type Comment {
                commentNo: Int!
                parentCommentNo: Int
                userNo: Int!
                postNo: Int!
                body: String!
                isDeleted: Boolean!
                createdDate: DateTime!
            }

            type CommentList {
                comments: [Comment]
                pagination: NativePagination
            }

            enum CommentOrderByColumn {
                ${this.service.getSortableColumns().join("\n")}
            }

            enum CommentNoFilter {
                ${(this.service.getColumnFilters(
                    ICommentColumnKeys.CommentNo
                ) as FilterCondition[]).join("\n")}
            }

            enum ParentCommentNoFilter {
            ${(this.service.getColumnFilters(
                ICommentColumnKeys.ParentCommentNo
            ) as FilterCondition[]).join("\n")}
            }

            input CommentNoWhere {
                value: Int!
                condition: CommentNoFilter
            }

            input ParentCommentNoWhere {
                value: Int!
                condition: ParentCommentNoFilter
            }

            input CommentsWhere {
                parentCommentNo: ParentCommentNoWhere
                postNo: PostNoWhere
            }

            input CommentOrderBy {
                column: CommentOrderByColumn
                direction: OrderByDirection
            }

            input CreateCommentSubmission {
                parentCommentNo: Int
                body: String!
                postNo: Int!
            }

            extend type Mutation {
                createComment(submission: CreateCommentSubmission!, userNo: Int!): Comment
            }

            extend type Query {
                comment(pk: Int!): Comment
                commentCount(where: CommentsWhere): Int
                comments(
                    itemsPerPage: Int
                    pageNo: Int
                    orderBy: CommentOrderBy
                    where: CommentsWhere
                ): CommentList
            }
        `;
    }
}

export default CommentModel;
export { CommentModel };
