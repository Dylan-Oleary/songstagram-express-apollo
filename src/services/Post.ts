import extend from "extend";
import knex from "knex";

import {
    BaseService,
    FilterCondition,
    IColumnDefinition,
    IError,
    IListQueryOptions,
    IPagination
} from "./Base";
import { UserService } from "./User";
import { IFormValidation, validateSubmission } from "../lib/validateSubmission";

export interface IPostRecord {
    postNo: number;
    userNo: number;
    body: string;
    spotifyId: string;
    isEdited: boolean;
    isDeleted: boolean;
    createdDate: Date;
    lastUpdated: Date;
}

export interface IPostListRecord {
    data: IPostRecord[];
    pagination: IPagination;
}

export interface ICreatePostValues {
    userNo: number;
    body?: string;
    spotifyId: string;
}

export interface IUpdatePostValues {
    body?: string;
}

export enum IPostColumnKeys {
    PostNo = "postNo",
    UserNo = "userNo",
    Body = "body",
    SpotifyID = "spotifyId",
    IsEdited = "isEdited",
    IsDeleted = "isDeleted",
    CreatedDate = "createdDate",
    LastUpdated = "lastUpdated"
}

export enum IPostColumnLabels {
    PostNo = "Post Number",
    UserNo = "User Number",
    Body = "Body",
    SpotifyID = "Spotify ID",
    IsEdited = "Is Edited",
    IsDeleted = "Is Deleted",
    CreatedDate = "Created Date",
    LastUpdated = "Last Updated"
}

export interface IPostColumnDefinition extends IColumnDefinition {
    key: IPostColumnKeys;
    label: IPostColumnLabels;
}

/**
 * Service used to manage posts
 *
 * @param dbConnection Knex connection used to read/write to the database
 */
class PostService extends BaseService {
    readonly pk = "postNo";
    readonly table = "posts";
    private readonly tableColumns: IPostColumnDefinition[] = [
        {
            key: IPostColumnKeys.PostNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [
                    FilterCondition.Equal,
                    FilterCondition.GreaterThan,
                    FilterCondition.GreaterThanOrEqual,
                    FilterCondition.LessThan,
                    FilterCondition.LessThanOrEqual
                ]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IPostColumnLabels.PostNo
        },
        {
            key: IPostColumnKeys.UserNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [
                    FilterCondition.Equal,
                    FilterCondition.GreaterThan,
                    FilterCondition.GreaterThanOrEqual,
                    FilterCondition.LessThan,
                    FilterCondition.LessThanOrEqual
                ]
            },
            isRequiredOnCreate: true,
            canEdit: false,
            label: IPostColumnLabels.UserNo
        },
        {
            key: IPostColumnKeys.Body,
            isSelectable: true,
            isSearchable: true,
            isSortable: false,
            isRequiredOnCreate: false,
            canEdit: true,
            label: IPostColumnLabels.Body,
            check: (value) => {
                if (value.length > 2500)
                    return new Error(
                        `${IPostColumnLabels.Body} cannot be more than 2500 characters`
                    );

                return undefined;
            }
        },
        {
            key: IPostColumnKeys.SpotifyID,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: false,
            label: IPostColumnLabels.SpotifyID
        },
        {
            key: IPostColumnKeys.IsEdited,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IPostColumnLabels.IsEdited
        },
        {
            key: IPostColumnKeys.IsDeleted,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IPostColumnLabels.IsDeleted
        },
        {
            key: IPostColumnKeys.CreatedDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IPostColumnLabels.CreatedDate
        },
        {
            key: IPostColumnKeys.LastUpdated,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IPostColumnLabels.LastUpdated
        }
    ];

    constructor(dbConnection: knex) {
        super(dbConnection);
    }

    /**
     * Creates a new post
     *
     * @param submission Post information used to create a new post
     */
    async createPost(submission: ICreatePostValues): Promise<IPostRecord> {
        const createPostValidation: IFormValidation = this.tableColumns
            .filter((column) => column.isRequiredOnCreate)
            .map((column) => ({ ...column, isRequired: true }));
        const submissionErrors = validateSubmission(createPostValidation, submission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        const user = await new UserService(this.dbConnection).getUser(submission.userNo || 0);

        if (user.isDeleted || user.isBanned) {
            return Promise.reject({
                statusCode: 403,
                message: "Forbidden",
                details: [`User (userNo: ${user.userNo}) does not have access to create a post`]
            });
        }

        const newPost: ICreatePostValues = {
            userNo: user.userNo,
            body: submission.body ? submission.body.trim() : "",
            spotifyId: submission.spotifyId.trim()
        };

        return this.dbConnection(this.table)
            .insert(newPost)
            .then((record) => this.getPost(record[0]))
            .catch((error) => {
                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Updates a post record
     *
     * @param postNo The post number used to look for the correct post
     * @param submission Post information used to update a post record
     */
    updatePost(postNo: number, submission: IUpdatePostValues): Promise<IPostRecord> {
        let cleanSubmission: IUpdatePostValues = {};
        const updatePostValidation: IFormValidation = this.tableColumns.filter(
            (column) => column.canEdit
        );
        const submissionErrors = validateSubmission(updatePostValidation, submission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        Object.keys(submission).forEach((key) => {
            //@ts-ignore
            if (submission[key]) {
                //@ts-ignore
                cleanSubmission[key] = submission[key].trim();
            }
        });

        return super.validateRecordNo(postNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .update({ ...cleanSubmission, lastUpdated: this.dbConnection.fn.now() })
                .where(this.pk, postNo)
                .then(() => {
                    return this.getPost(postNo);
                })
                .catch((error) => {
                    return Promise.reject({
                        statusCode: error.statusCode || 500,
                        message: error.message || "Internal Server Error",
                        details: error.details || []
                    });
                });
        });
    }

    /**
     * Performs a soft delete on a post record
     *
     * @param postNo The post number used to look for the correct post
     */
    deletePost(postNo: number): Promise<boolean> {
        return super.validateRecordNo(postNo, this.pk).then(() => {
            return this.getPost(postNo).then((postRecord) => {
                return this.dbConnection(this.table)
                    .update({ isDeleted: true, lastUpdated: this.dbConnection.fn.now() })
                    .where(this.pk, postRecord[this.pk])
                    .then(() => true);
            });
        });
    }

    /**
     * Fetches a post record by using `postNo`as a lookup parameter
     *
     * @param postNo The post number used to look for the correct post
     */
    getPost(postNo: number): Promise<IPostRecord> {
        return super.validateRecordNo(postNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .first("*")
                .where(this.pk, postNo)
                .then((record) => {
                    if (!record)
                        throw {
                            statusCode: 404,
                            message: "Not Found",
                            details: [`Post with a ${this.pk} of ${postNo} could not be found`]
                        };

                    return super.cleanRecord<IPostRecord>(record);
                });
        });
    }

    /**
     * Fetches a list of post records
     *
     * @param queryOptions Additional filters to query by
     */
    getPostList(queryOptions: IListQueryOptions = {}): Promise<IPostListRecord> {
        const defaultOptions = {
            where: {
                isDeleted: {
                    value: false
                }
            },
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
        ])
            .then(([recordSet, count]) => {
                const pagination = super.buildPagination(
                    count,
                    options.pageNo,
                    options.itemsPerPage
                );
                const cleanedRecordSet = (recordSet || []).map((record) =>
                    super.cleanRecord<IPostRecord>(record)
                );

                return {
                    data: cleanedRecordSet || [],
                    pagination
                };
            })
            .catch((error) => {
                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Returns the number of found posts based on the query options
     *
     * @param queryOptions Additional filters to query by
     */
    getPostCount(queryOptions: IListQueryOptions = {}): Promise<number> {
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
     * Returns valid filter conditions for the passed column
     *
     * @param key The column name
     */
    public getColumnFilters(key: IPostColumnKeys): FilterCondition[] | Promise<IError> {
        return super.getColumnFilters(key, this.tableColumns);
    }

    /**
     * Returns an array of column names whose columns are sortable
     */
    public getSortableColumns(): IPostColumnKeys[] {
        return this.tableColumns.filter((column) => column.isSortable).map((column) => column.key);
    }
}

export default PostService;
export { PostService };
