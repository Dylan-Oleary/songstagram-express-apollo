import { Express } from "express";
import { gql } from "apollo-server-express";
import { GraphQLSchema } from "graphql";
import { makeExecutableSchema } from "graphql-tools";
import { GraphQLDateTime } from "graphql-iso-date";

import { DB_CONNECTION } from "../config/constants";

import { UserModel } from "./models";

const buildSchema: (app: Express) => GraphQLSchema = (app) => {
    const dbConnection = app.get(DB_CONNECTION);

    const userModel = new UserModel(dbConnection);

    return makeExecutableSchema({
        typeDefs: gql`
            scalar DateTime

            union PagingItem = Track | Album | Artist

            enum AlbumGroup {
                appears_on
                album
                compilation
                single
            }

            enum AlbumType {
                album
                compilation
                single
            }

            enum ArtistType {
                artist
            }

            enum OrderByDirection {
                asc
                desc
            }

            enum TrackType {
                track
            }

            enum ReleaseDatePrecision {
                year
                month
                day
            }

            type Album {
                album_group: AlbumGroup
                album_type: AlbumType!
                artists: [Artist]!
                available_markets: [String]
                copyrights: [Copyright]
                external_ids: ExternalIDs
                external_urls: ExternalURLs
                genres: [String]
                href: String!
                id: ID!
                images: [Image]
                label: String
                name: String!
                popularity: Int
                release_date: String
                release_date_precision: ReleaseDatePrecision
                tracks: Pagination
                uri: String!
                type: AlbumType!
                total_tracks: Int
            }

            type Artist {
                albums: Pagination
                external_urls: ExternalURLs
                followers: Followers
                genres: [String]
                href: String!
                id: ID!
                images: [Image]
                name: String!
                popularity: Int
                related_artists: [Artist]
                top_tracks: [Track]
                type: ArtistType
                uri: String!
            }

            type Copyright {
                text: String
                type: String
            }

            type ExternalIDs {
                isrc: String
                ean: String
                upc: String
            }

            type ExternalURLs {
                spotify: String
            }

            type Followers {
                total: Int
            }

            type Image {
                height: Int!
                width: Int!
                url: String!
            }

            type NativePagination {
                currentPage: Int
                itemsPerPage: Int
                nextPage: Int
                prevPage: Int
                totalPages: Int
                totalRecords: Int
            }

            type Pagination {
                href: String
                items: [PagingItem]
                limit: Int
                next: String
                offset: Int
                previous: String
                total: Int
            }

            type SpotifySearch {
                query: String!
                tracks: [Track]
                total: Int
            }

            type Track {
                artists: [Artist]!
                album: Album
                available_markets: [String]
                disc_number: Int
                duration_ms: Int
                explicit: Boolean!
                external_ids: ExternalIDs
                external_urls: ExternalURLs
                href: String!
                id: ID!
                is_playable: Boolean!
                name: String!
                popularity: Int
                preview_url: String
                track_number: Int
                type: TrackType
                uri: String!
            }

            type Mutation {
                _: Boolean
            }

            type Query {
                album(albumID: ID!, tracksOffset: Int, tracksLimit: Int): Album
                albums(albumIDs: [ID]!): [Album]
                artist(
                    artistID: ID!
                    albumsOffset: Int
                    albumsLimit: Int
                    include_groups: [String]
                ): Artist
                artists(artistIDs: [ID]!): [Artist]
                spotifySearch(query: String!): SpotifySearch
                track(trackID: ID!): Track
                tracks(trackIDs: [ID]!): [Track]
            }
            ${userModel.getTypeDefinitions()}
        `,
        resolvers: { DateTime: GraphQLDateTime, ...userModel.getResolvers() }
    });
};

export default buildSchema;
export { buildSchema };
