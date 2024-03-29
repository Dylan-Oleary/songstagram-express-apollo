import extend from "extend";
import knex from "knex";
import marked from "marked";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";

import {
    BaseService,
    FilterCondition,
    IColumnDefinition,
    IError,
    IListQueryOptions,
    IPagination
} from "./Base";
import { PostService } from "./Post";
import { IFormValidation, validateSubmission } from "../lib/validateSubmission";

export interface ICommentRecord {
    commentNo: number;
    parentCommentNo: number | null;
    userNo: number;
    postNo: number;
    body: string;
    isDeleted: boolean;
    createdDate: Date;
}

export interface ICommentListRecord {
    data: ICommentRecord[];
    pagination: IPagination;
}

export interface ICreateCommentValues {
    userNo: number;
    postNo: number;
    body: string;
    parentCommentNo?: number;
}

export enum ICommentColumnKeys {
    CommentNo = "commentNo",
    ParentCommentNo = "parentCommentNo",
    UserNo = "userNo",
    PostNo = "postNo",
    Body = "body",
    IsDeleted = "isDeleted",
    CreatedDate = "createdDate"
}

export enum ICommentColumnLabels {
    CommentNo = "Comment Number",
    ParentCommentNo = "Parent Comment Number",
    UserNo = "User Number",
    PostNo = "Post Number",
    Body = "Body",
    IsDeleted = "Is Deleted",
    CreatedDate = "Created Date"
}

export interface ICommentColumnDefinition extends IColumnDefinition {
    key: ICommentColumnKeys;
    label: ICommentColumnLabels;
}

class CommentsService extends BaseService {
    readonly pk = ICommentColumnKeys.CommentNo;
    readonly table = "comments";
    private readonly tableColumns: ICommentColumnDefinition[] = [
        {
            key: ICommentColumnKeys.CommentNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: ICommentColumnLabels.CommentNo
        },
        {
            key: ICommentColumnKeys.ParentCommentNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: ICommentColumnLabels.ParentCommentNo
        },
        {
            key: ICommentColumnKeys.UserNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: false,
            label: ICommentColumnLabels.UserNo
        },
        {
            key: ICommentColumnKeys.PostNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: false,
            label: ICommentColumnLabels.PostNo
        },
        {
            key: ICommentColumnKeys.Body,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: true,
            canEdit: false,
            label: ICommentColumnLabels.Body,
            check: (value) => {
                if (value.length > 500) {
                    return new Error(
                        `${ICommentColumnLabels.Body} cannot be more than 500 characters`
                    );
                }

                return undefined;
            }
        },
        {
            key: ICommentColumnKeys.IsDeleted,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            canEdit: false,
            label: ICommentColumnLabels.IsDeleted
        },
        {
            key: ICommentColumnKeys.CreatedDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: ICommentColumnLabels.CreatedDate
        }
    ];

    constructor(dbConnection: knex) {
        super(dbConnection);
    }

    /**
     * Creates a new comment record
     *
     * @param commentSubmission Comment information used to create a comment record
     */
    public createComment(commentSubmission: ICreateCommentValues): Promise<ICommentRecord> {
        const createCommentValidation: IFormValidation = this.tableColumns
            .filter((column) => column.isRequiredOnCreate)
            .map((column) => ({ ...column, isRequired: true }));
        const submissionErrors = validateSubmission(createCommentValidation, commentSubmission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        const newComment: ICreateCommentValues = {
            userNo: Number(commentSubmission.userNo),
            postNo: Number(commentSubmission.postNo),
            body: this.formatCommentBody(String(commentSubmission.body).trim())
        };

        if (commentSubmission.parentCommentNo)
            newComment.parentCommentNo = Number(commentSubmission.parentCommentNo);

        return Promise.all([
            new PostService(this.dbConnection).getPost(newComment.postNo),
            newComment.parentCommentNo
                ? this.getComment(newComment.parentCommentNo)
                : Promise.resolve(null)
        ]).then(([postRecord]) => {
            if (postRecord.isDeleted) {
                throw {
                    statusCode: 403,
                    message: "Forbidden",
                    details: [`Post with a postNo of ${postRecord.postNo} has been deleted`]
                };
            }

            return this.dbConnection(this.table)
                .insert(newComment)
                .then((record) => {
                    return this.getComment(record[0]);
                });
        });
    }

    /**
     * Fetches a comment record using `commentNo` as a lookup parameter
     *
     * @param commentNo The comment number used to look for the correct record
     */
    public getComment(commentNo: number): Promise<ICommentRecord> {
        return super.validateRecordNo(commentNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .first("*")
                .where(this.pk, commentNo)
                .then((record) => {
                    if (!record)
                        throw {
                            statusCode: 404,
                            message: "Not Found",
                            details: [
                                `Comment with a ${this.pk} of ${commentNo} could not be found`
                            ]
                        };

                    return super.cleanRecord<ICommentRecord>(record);
                });
        });
    }

    /**
     * Returns the number of comments based on the query options Fetches the amount of comments a record has
     *
     * @param queryOptions Additional filters to query by
     */
    public getCommentCount(queryOptions: IListQueryOptions = {}): Promise<number> {
        const defaultOptions = {
            where: {
                isDeleted: {
                    value: false
                }
            }
        };
        const options = extend(true, defaultOptions, queryOptions);

        return super.getCount(this.table, this.pk, this.tableColumns, options.where);
    }

    /**
     * Fetches a list of comment records
     *
     * @param queryOptions Additional filters to query by
     */
    public getCommentList(queryOptions: IListQueryOptions = {}): Promise<ICommentListRecord> {
        const defaultOptions = {
            where: {},
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                direction: "desc",
                column: this.pk
            }
        };
        const options = extend(true, defaultOptions, queryOptions);

        return Promise.all([
            super.getList(this.table, this.pk, this.tableColumns, options),
            super.getCount(this.table, this.pk, this.tableColumns, options.where)
        ]).then(([recordSet, count]) => {
            const pagination = super.buildPagination(count, options.pageNo, options.itemsPerPage);
            const cleanedRecordSet = (recordSet || []).map((record) =>
                super.cleanRecord<ICommentRecord>(record)
            );

            return {
                data: cleanedRecordSet || [],
                pagination
            };
        });
    }

    /**
     * Soft deletes a comment record
     *
     * @param commentNo The comment number used to delete the correct record
     */
    public deleteComment(commentNo: number): Promise<boolean> {
        return super.validateRecordNo(commentNo, this.pk).then(() => {
            return this.getComment(commentNo).then((commentRecord) => {
                return this.dbConnection(this.table)
                    .update({ isDeleted: true })
                    .where(this.pk, commentRecord.commentNo)
                    .then(() => true);
            });
        });
    }

    /**
     * Returns valid filter conditions for the passed column
     *
     * @param key The column name
     */
    public getColumnFilters(key: ICommentColumnKeys): FilterCondition[] | Promise<IError> {
        return super.getColumnFilters(key, this.tableColumns);
    }

    /**
     * Returns an array of column names whose columns are sortable
     */
    public getSortableColumns(): ICommentColumnKeys[] {
        return this.tableColumns.filter((column) => column.isSortable).map((column) => column.key);
    }

    /**
     * Sanitizes and converts a comment body into markdown
     *
     * @param body The comment body to sanitize and convert
     * @returns A clean comment body in markdown
     */
    public formatCommentBody(body: string): string {
        if (typeof body !== "string" || body.trim() === "") {
            throw {
                statusCode: 400,
                message: "Bad Request",
                details: ["Unable to sanitize an invalid comment body"]
            };
        } else {
            const turndownService = new TurndownService();
            const cleanBody = sanitizeHtml(body, {
                allowedAttributes: {},
                allowedTags: ["p"]
            });

            return turndownService.turndown(cleanBody);
        }
    }

    /**
     * Converts a comment record's body from markdown to HTML
     *
     * @param comment A comment record
     * @returns A comment record in which the body has been converted to HTML
     */
    public formatCommentToHtml(comment: ICommentRecord): ICommentRecord {
        return {
            ...comment,
            body: marked(comment?.body || "")
        };
    }
}

export default CommentsService;
export { CommentsService };
