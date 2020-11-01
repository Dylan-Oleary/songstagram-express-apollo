import knex from "knex";

import { BaseService, FilterCondition, IColumnDefinition, IPagination } from "./Base";
import { UserService } from "./User";
import { IFormValidation, validateSubmission } from "../lib/validateSubmission";

export interface IPostRecord {
    postNo: number;
    userNo: number;
    body: string;
    spotifyTrackId: string;
    likeCount: number;
    commentCount: number;
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
    spotifyTrackId: string;
}

export interface IUpdatePostValues {
    body?: string;
}

export enum IPostColumnKeys {
    PostNo = "postNo",
    UserNo = "userNo",
    Body = "body",
    SpotifyTrackID = "spotifyTrackId",
    LikeCount = "likeCount",
    CommentCount = "commentCount",
    IsEdited = "isEdited",
    IsDeleted = "isDeleted",
    CreatedDate = "createdDate",
    LastUpdated = "lastUpdated"
}

export enum IPostColumnLabels {
    PostNo = "Post Number",
    UserNo = "User Number",
    Body = "Body",
    SpotifyTrackID = "Spotify Track ID",
    LikeCount = "Like Count",
    CommentCount = "Comment Count",
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
    private readonly pk = "postNo";
    private readonly table = "posts";
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
            label: IPostColumnLabels.Body
        },
        {
            key: IPostColumnKeys.SpotifyTrackID,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: false,
            label: IPostColumnLabels.SpotifyTrackID
        },
        {
            key: IPostColumnKeys.LikeCount,
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
            label: IPostColumnLabels.LikeCount
        },
        {
            key: IPostColumnKeys.CommentCount,
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
            label: IPostColumnLabels.CommentCount
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

        if (Boolean(user.isDeleted) || Boolean(user.isBanned)) {
            return Promise.reject({
                statusCode: 403,
                message: "Forbidden",
                details: [`User (userNo: ${user.userNo}) does not have access to create a post`]
            });
        }

        const newPost: ICreatePostValues = {
            userNo: user.userNo,
            body: submission.body ? submission.body.trim() : "",
            spotifyTrackId: submission.spotifyTrackId.trim()
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

                    return record;
                });
        });
    }
}

export default PostService;
export { PostService };
