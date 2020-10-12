import knex from "knex";

export type SelectableColumn = string;

export enum OrderDirection {
    ASC = "asc",
    DESC = "desc"
}

export interface IListQueryOptions {
    where?: {
        [key: string]: any;
    };
    itemsPerPage?: number;
    pageNo?: number;
    orderBy?: {
        direction: OrderDirection;
        column: SelectableColumn;
    };
}

export interface IGetListRecord {
    data: any[];
    pagination: IPagination;
}

export interface IPagination {
    currentPage: number;
    itemsPerPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalPages: number;
    totalRecords: number;
}

/**
 * Base service
 *
 * @param dbConnection Knex connection used to read/write to the database
 */
class BaseService {
    protected dbConnection: knex;

    constructor(dbConnection: knex) {
        this.dbConnection = dbConnection;
    }

    /**
     * Builds a pagination object
     *
     * @param totalRecords The total amount of records available from any given query
     * @param currentPage The current page
     * @param itemsPerPage The amount of items per page
     */
    private buildPagination(totalRecords: number, currentPage: number, itemsPerPage: number) {
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        const nextPage =
            currentPage === totalPages || totalPages === 0 || currentPage > totalPages
                ? null
                : currentPage + 1;
        const prevPage =
            currentPage === 1 || totalPages === 0 || currentPage > totalPages
                ? null
                : currentPage - 1;

        return {
            currentPage,
            itemsPerPage,
            nextPage,
            prevPage,
            totalPages,
            totalRecords
        };
    }

    /**
     * Gets a list of records
     *
     * @param tableName The table to query
     * @param pk The primary key for the table
     * @param selectableColumns A list of columns to select from the table
     * @param queryOptions Additional filters to query by
     */
    protected getList(
        tableName: string,
        pk: string,
        selectableColumns: SelectableColumn[],
        queryOptions: IListQueryOptions = {}
    ): Promise<IGetListRecord> {
        const options = {
            where: queryOptions.where || {},
            itemsPerPage: queryOptions.itemsPerPage || 10,
            pageNo: queryOptions.pageNo || 1,
            orderBy: {
                direction: queryOptions.orderBy
                    ? queryOptions.orderBy.direction
                    : OrderDirection.DESC,
                column: queryOptions.orderBy ? queryOptions.orderBy.column : pk
            }
        };

        return Promise.all([
            this.dbConnection(tableName)
                .select(selectableColumns)
                .where(options.where)
                .offset((options.pageNo - 1) * options.itemsPerPage)
                .limit(options.itemsPerPage)
                .orderBy(options.orderBy.column, options.orderBy.direction),
            this.getCount(tableName, pk, options.where)
        ]).then(([recordSet, count]) => {
            const pagination = this.buildPagination(count, options.pageNo, options.itemsPerPage);

            return {
                data: recordSet || [],
                pagination
            };
        });
    }

    /**
     * Count the total number of records that meet the query criteria
     *
     * @param tableName The table to query
     * @param pk The primary key for the table
     * @param where Additional filters to query by
     */
    protected getCount(
        tableName: string,
        pk: string,
        where: { [key: string]: any }
    ): Promise<number> {
        return this.dbConnection(tableName)
            .count(pk)
            .where(where)
            .then(([count]) => {
                return Number(count[Object.keys(count)[0]]);
            });
    }
}

export default BaseService;
export { BaseService };
