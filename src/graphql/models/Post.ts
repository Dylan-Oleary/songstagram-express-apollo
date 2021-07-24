import { gql } from "apollo-server-express";
import knex from "knex";
import { DocumentNode } from "graphql";

import { BaseModel, IResolvers } from "./Base";
import { authenticateUserSubmission } from "../../lib";
import { FilterCondition, IPostColumnKeys, PostService, SpotifyService } from "../../services";

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
                    },
                    { spotifyWebApiToken }
                ) => {
                    return this.service
                        .getPostList({ where, itemsPerPage, orderBy, pageNo })
                        .then(({ data = [], pagination }) => {
                            if (data.length > 0) {
                                const spotify = new SpotifyService(spotifyWebApiToken);
                                const albumIds = data
                                    .filter(
                                        ({ spotifyRecordType }) => spotifyRecordType === "album"
                                    )
                                    .map(({ spotifyId }) => spotifyId);
                                const trackIds = data
                                    .filter(
                                        ({ spotifyRecordType }) => spotifyRecordType === "track"
                                    )
                                    .map(({ spotifyId }) => spotifyId);

                                return Promise.all([
                                    albumIds.length > 0
                                        ? spotify.getAlbums(albumIds)
                                        : Promise.resolve([]),
                                    trackIds.length > 0
                                        ? spotify.getTracks(trackIds)
                                        : Promise.resolve([])
                                ]).then(([albums, tracks]) => {
                                    const postData = [];

                                    for (const post of data) {
                                        if (post.spotifyRecordType === "album") {
                                            const album = albums.find(
                                                ({ id }) => id === post.spotifyId
                                            );

                                            postData.push({
                                                ...post,
                                                album: {
                                                    id: album?.id,
                                                    album_type: album?.album_type,
                                                    copyrights: album?.copyrights,
                                                    external_ids: album?.external_ids,
                                                    external_urls: album?.external_urls,
                                                    genres: album?.genres,
                                                    href: album?.href,
                                                    images: album?.images,
                                                    label: album?.label,
                                                    name: album?.name,
                                                    popularity: album?.popularity,
                                                    release_date: album?.release_date,
                                                    release_date_precision:
                                                        album?.release_date_precision,
                                                    total_tracks: album?.total_tracks,
                                                    type: album?.type,
                                                    uri: album?.uri
                                                },
                                                artists: album?.artists,
                                                tracks: album?.tracks.items
                                            });
                                        } else {
                                            const track = tracks.find(
                                                ({ id }) => id === post.spotifyId
                                            );

                                            postData.push({
                                                ...post,
                                                album: track?.album,
                                                artists: track?.artists || [],
                                                tracks: [
                                                    {
                                                        id: track?.id,
                                                        disc_number: track?.disc_number,
                                                        duration_ms: track?.duration_ms,
                                                        explicit: track?.explicit || false,
                                                        external_ids: track?.external_ids,
                                                        external_urls: track?.external_urls,
                                                        href: track?.href,
                                                        is_playable: track?.is_playable,
                                                        name: track?.name,
                                                        popularity: track?.popularity,
                                                        preview_url: track?.preview_url,
                                                        track_number: track?.track_number,
                                                        type: track?.type,
                                                        uri: track?.uri
                                                    }
                                                ]
                                            });
                                        }
                                    }

                                    return {
                                        pagination,
                                        posts: postData
                                    };
                                });
                            } else {
                                return {
                                    pagination,
                                    posts: data
                                };
                            }
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
                spotifyRecordType: SpotifyRecordType!
                body: String
                artists: [Artist]
                album: Album
                tracks: [Track]
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
                spotifyRecordType: SpotifyRecordType!
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
