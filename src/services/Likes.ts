import extend from "extend";
import knex from "knex";

import { BaseService, IColumnDefinition, IListQueryOptions, IPagination } from "./Base";
import { CommentsService, ICommentColumnKeys, ICommentRecord } from "./Comments";
import { IPostColumnKeys, IPostRecord, PostService } from "./Post";
import { IUserRecord, UserService } from "./User";
import { IFormValidation, validateSubmission } from "../lib/validateSubmission";

export interface ILikeRecord {
    likeNo: number;
    userNo: number;
    referenceTable: LikeReferenceTable;
    referenceNo: number;
    isActive: boolean;
    createdDate: Date;
    lastUpdated: Date;
}

export interface ILikeListRecord {
    data: ILikeRecord[];
    pagination: IPagination;
}

export interface ICreateLikeValues {
    userNo: number;
    referenceTable: LikeReferenceTable;
    referenceNo: number;
}

export enum LikeReferenceTable {
    Comments = "comments",
    Posts = "posts"
}

export enum ILikeColumnKeys {
    LikeNo = "likeNo",
    UserNo = "userNo",
    ReferenceTable = "referenceTable",
    ReferenceNo = "referenceNo",
    IsActive = "isActive",
    CreatedDate = "createdDate",
    LastUpdated = "lastUpdated"
}

export enum ILikeColumnLabels {
    LikeNo = "Like Number",
    UserNo = "User Number",
    ReferenceTable = "Reference Table",
    ReferenceNo = "Reference Number",
    IsActive = "Is Active",
    CreatedDate = "Created Date",
    LastUpdated = "Last Updated"
}

export interface ILikeColumnDefinition extends IColumnDefinition {
    key: ILikeColumnKeys;
    label: ILikeColumnLabels;
}

/**
 * Service used to manage likes
 *
 * @param dbConnection Knex connection used to read/write to the database
 */
class LikesService extends BaseService {
    private readonly pk = ILikeColumnKeys.LikeNo;
    private readonly table = "likes";
    private readonly tableColumns: ILikeColumnDefinition[] = [
        {
            key: ILikeColumnKeys.LikeNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: ILikeColumnLabels.LikeNo
        },
        {
            key: ILikeColumnKeys.UserNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: true,
            canEdit: false,
            label: ILikeColumnLabels.UserNo
        },
        {
            key: ILikeColumnKeys.ReferenceTable,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: true,
            canEdit: false,
            label: ILikeColumnLabels.ReferenceTable,
            check: (value) => {
                if (!Object.values(LikeReferenceTable).includes(value as LikeReferenceTable)) {
                    return new Error(
                        `${ILikeColumnLabels.ReferenceTable} must be one of [${Object.values(
                            LikeReferenceTable
                        ).join(",")}]`
                    );
                }

                return undefined;
            }
        },
        {
            key: ILikeColumnKeys.ReferenceNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: true,
            canEdit: false,
            label: ILikeColumnLabels.ReferenceNo,
            check: (value) => {
                if (Number(value) <= 0) {
                    return new Error(`${ILikeColumnLabels.ReferenceNo} must be greater than 0`);
                }

                return undefined;
            }
        },
        {
            key: ILikeColumnKeys.IsActive,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: true,
            canEdit: true,
            label: ILikeColumnLabels.IsActive
        },
        {
            key: ILikeColumnKeys.CreatedDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: ILikeColumnLabels.CreatedDate
        },
        {
            key: ILikeColumnKeys.LastUpdated,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: ILikeColumnLabels.LastUpdated
        }
    ];

    constructor(dbConnection: knex) {
        super(dbConnection);
    }

    /**
     * Creates a new like record
     *
     * @param submission Like information used to create a new like
     */
    createLike(submission: ICreateLikeValues): Promise<ILikeRecord> {
        const createLikeValidation: IFormValidation = this.tableColumns
            .filter((column) => column.isRequiredOnCreate)
            .map((column) => ({ ...column, isRequired: true }));
        const submissionErrors = validateSubmission(createLikeValidation, submission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        const newLike: ICreateLikeValues = {
            userNo: Number(submission.userNo),
            referenceNo: Number(submission.referenceNo),
            referenceTable: submission.referenceTable
        };

        return this.dbConnection(this.table)
            .insert({ ...newLike, isActive: true })
            .then((record) => {
                return this.getLike(record[0]);
            });
    }

    /**
     * Edits an existing like record
     *
     * @param likeNo The `likeNo` of the record to update
     * @param isActive Determines whether or not the like record is being 'liked' or 'unliked'
     */
    updateLike(likeNo: number, isActive: boolean): Promise<ILikeRecord> {
        return super.validateRecordNo(likeNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .update({
                    isActive,
                    lastUpdated: this.dbConnection.fn.now()
                })
                .where(this.pk, likeNo)
                .then(() => {
                    return this.getLike(likeNo);
                });
        });
    }

    /**
     * Fetches a like record using `likeNo` as a lookup parameter
     *
     * @param likeNo The like number used to look for the correct like record
     */
    getLike(likeNo: number): Promise<ILikeRecord> {
        return super.validateRecordNo(likeNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .first("*")
                .where(this.pk, likeNo)
                .then((record) => {
                    if (!record)
                        throw {
                            statusCode: 404,
                            message: "Not Found",
                            details: [`Like with a ${this.pk} of ${likeNo} could not be found`]
                        };

                    return record;
                });
        });
    }

    /**
     * Fetches a list of like records
     *
     * @param queryOptions Additional filters to query by
     */
    getLikeList(queryOptions: IListQueryOptions): Promise<ILikeListRecord> {
        const defaultOptions = {
            where: {
                isActive: {
                    value: 1
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
        ]).then(([recordSet, count]) => {
            const pagination = super.buildPagination(count, options.pageNo, options.itemsPerPage);

            return {
                data: recordSet || [],
                pagination
            };
        });
    }

    /**
     * Creates or updated a like record
     *
     * @param userNo The user number of the user requesting the like
     * @param referenceNo The primary key value of the record being liked
     * @param referenceTable The reference table tied to the record being liked
     * @param isLike Is the record being liked or unliked?
     */
    likeRequest(
        userNo: number,
        referenceNo: number,
        referenceTable: LikeReferenceTable,
        isLike: boolean
    ): Promise<ILikeRecord> {
        const commentsService = new CommentsService(this.dbConnection);
        const postService = new PostService(this.dbConnection);
        const userService = new UserService(this.dbConnection);
        const referencePromise =
            referenceTable === LikeReferenceTable.Comments
                ? () => commentsService.getComment(referenceNo)
                : () => postService.getPost(referenceNo);
        const referencePk =
            referenceTable === LikeReferenceTable.Comments
                ? ICommentColumnKeys.CommentNo
                : IPostColumnKeys.PostNo;

        return Promise.all<IUserRecord, ICommentRecord | IPostRecord>([
            userService.getUser(userNo),
            referencePromise()
        ]).then(async ([requestUser, referenceRecord]) => {
            if (Boolean(requestUser.isDeleted)) {
                return Promise.reject({
                    statusCode: 403,
                    message: "Forbidden",
                    details: [`User (userNo: ${requestUser.userNo}) has been deleted`]
                });
            } else if (Boolean(requestUser.isBanned)) {
                return Promise.reject({
                    statusCode: 403,
                    message: "Forbidden",
                    details: [`User (userNo: ${requestUser.userNo}) has been banned`]
                });
            }

            const likeRecord = await this.getLikeList({
                where: {
                    userNo: {
                        value: requestUser.userNo
                    },
                    referenceNo: {
                        //@ts-ignore
                        value: referenceRecord[referencePk]
                    },
                    referenceTable: {
                        value: referenceTable
                    }
                }
            }).then(({ data = [] }) => {
                if (data.length > 0) return data[0];

                return undefined;
            });

            if (likeRecord) {
                return this.updateLike(likeRecord[this.pk], isLike);
            } else {
                return this.createLike({
                    userNo: Number(requestUser.userNo),
                    referenceTable,
                    referenceNo
                });
            }
        });
    }

    /**
     * Fetches the amount of likes a record currently has
     *
     * @param referenceNo The primary key value of the record being liked
     * @param referenceTable The reference table tied to the record being liked
     */
    getLikeCount(referenceNo: number, referenceTable: LikeReferenceTable): Promise<number> {
        return this.getLikeList({
            where: {
                referenceNo: {
                    value: referenceNo
                },
                referenceTable: {
                    value: referenceTable
                }
            }
        }).then(({ pagination }) => {
            return pagination.totalRecords;
        });
    }

    /**
     * Performs a hard delete on a like record
     *
     * @param likeNo The like number used to delete the correct record
     */
    deleteLike(likeNo: number): Promise<boolean> {
        return super.validateRecordNo(likeNo, this.pk).then(() => {
            return this.getLike(likeNo).then((likeRecord: ILikeRecord) => {
                return this.dbConnection(this.table)
                    .del()
                    .where(this.pk, likeRecord[this.pk])
                    .then(() => true);
            });
        });
    }
}

export default LikesService;
export { LikesService };
