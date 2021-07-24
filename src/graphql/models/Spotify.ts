import { gql } from "apollo-server-express";
import { DocumentNode } from "graphql";

import { ILooseObject } from "custom";
import { AlbumGroup, SpotifyService } from "../../services";

export type SpotifyResolverContext = {
    spotifyWebApiToken: string;
};

export type SpotifyResolver = (
    parent: ILooseObject,
    args: ILooseObject,
    context: SpotifyResolverContext
) => any;

export interface ISpotifyResolvers {
    [key: string]: {
        [key: string]: SpotifyResolver;
    };
}

class SpotifyModel {
    constructor() {}

    /**
     * Returns the spotify model resolvers
     */
    public getResolvers(): ISpotifyResolvers {
        return {
            Album: {
                artists: ({ artists }, args, { spotifyWebApiToken }) => {
                    const artistIDs = artists.map((artist: { id: string }) => artist.id);

                    return new SpotifyService(spotifyWebApiToken).getArtists(artistIDs);
                },
                tracks: (
                    { id: albumID, options = { limit: 50, offset: 0 } },
                    args,
                    { spotifyWebApiToken }
                ) => {
                    return new SpotifyService(spotifyWebApiToken).getTracksByAlbum(
                        albumID,
                        options
                    );
                }
            },
            Artist: {
                albums: (
                    {
                        id: artistID,
                        options = {
                            limit: 750,
                            offset: 0,
                            include_groups: [
                                AlbumGroup.Album,
                                AlbumGroup.Single,
                                AlbumGroup.Compilation
                            ]
                        }
                    },
                    args,
                    { spotifyWebApiToken }
                ) => {
                    return new SpotifyService(spotifyWebApiToken).getAlbumsByArtist(
                        artistID,
                        options
                    );
                },
                related_artists: ({ id: artistID }, args, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).getRelatedArtists(artistID);
                },
                top_tracks: ({ id: artistID }, args, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).getTopTracksByArtist(artistID);
                }
            },
            SpotifyPagingItem: {
                __resolveType(obj: { [key: string]: any }) {
                    let type = null;

                    switch (obj.type) {
                        case "album":
                            type = "Album";
                            break;
                        case "track":
                            type = "Track";
                            break;
                        case "artist":
                            type = "Artist";
                        default:
                            break;
                    }

                    return type;
                }
            },
            Track: {
                album: ({ album }, args, { spotifyWebApiToken }) => {
                    const { id: albumID } = album;

                    return new SpotifyService(spotifyWebApiToken).getAlbum(albumID);
                },
                artists: ({ artists }, args, { spotifyWebApiToken }) => {
                    const artistIDs = artists.map((artist: { id: string }) => artist.id);

                    return new SpotifyService(spotifyWebApiToken).getArtists(artistIDs);
                }
            },
            Query: {
                album: (
                    parent,
                    { albumID, tracksOffset = 0, tracksLimit = 50 },
                    { spotifyWebApiToken }
                ) => {
                    return new SpotifyService(spotifyWebApiToken)
                        .getAlbum(albumID)
                        .then((album) => {
                            return {
                                ...album,
                                options: {
                                    limit: tracksLimit,
                                    offset: tracksOffset
                                }
                            };
                        });
                },
                albums: (parent, { albumIDs }, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).getAlbums(albumIDs);
                },
                artist: (
                    parent,
                    {
                        artistID,
                        albumsOffset = 0,
                        albumsLimit = 50,
                        include_groups = [
                            AlbumGroup.Album,
                            AlbumGroup.Single,
                            AlbumGroup.Compilation
                        ]
                    },
                    { spotifyWebApiToken }
                ) => {
                    return new SpotifyService(spotifyWebApiToken)
                        .getArtist(artistID)
                        .then((artist) => {
                            return {
                                ...artist,
                                options: {
                                    limit: albumsLimit,
                                    offset: albumsOffset,
                                    include_groups
                                }
                            };
                        });
                },
                artists: (parent, { artistIDs }, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).getArtists(artistIDs);
                },
                spotifySearch: (parent, { limit = 10, query }, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).search(query, limit);
                },
                track: (parent, { trackID }, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).getTrack(trackID);
                },
                tracks: (parent, { trackIDs }, { spotifyWebApiToken }) => {
                    return new SpotifyService(spotifyWebApiToken).getTracks(trackIDs);
                }
            }
        };
    }

    /**
     * Type Definitions for the GraphQL Server
     * ### Spotify Types
     * @see https://developer.spotify.com/documentation/web-api/reference/object-model/
     */
    public getTypeDefinitions(): DocumentNode {
        return gql`
            union SpotifyPagingItem = Track | Album | Artist

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

            enum ReleaseDatePrecision {
                year
                month
                day
            }

            enum TrackType {
                track
            }

            enum SpotifyRecordType {
                album
                track
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
                images: [SpotifyImage]
                label: String
                name: String!
                popularity: Int
                release_date: String
                release_date_precision: ReleaseDatePrecision
                tracks: SpotifyPagination
                uri: String!
                type: AlbumType!
                total_tracks: Int
            }

            type Artist {
                albums: SpotifyPagination
                external_urls: ExternalURLs
                followers: Followers
                genres: [String]
                href: String!
                id: ID!
                images: [SpotifyImage]
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

            type SpotifyImage {
                height: Int!
                width: Int!
                url: String!
            }

            type SpotifyPagination {
                href: String
                items: [SpotifyPagingItem]
                limit: Int
                next: String
                offset: Int
                previous: String
                total: Int
            }

            type SpotifySearch {
                query: String!
                artists: [Artist]
                albums: [Album]
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

            extend type Query {
                album(albumID: ID!, tracksOffset: Int, tracksLimit: Int): Album
                albums(albumIDs: [ID]!): [Album]
                artist(
                    artistID: ID!
                    albumsOffset: Int
                    albumsLimit: Int
                    include_groups: [String]
                ): Artist
                artists(artistIDs: [ID]!): [Artist]
                spotifySearch(query: String!, limit: Int): SpotifySearch
                track(trackID: ID!): Track
                tracks(trackIDs: [ID]!): [Track]
            }
        `;
    }
}

export default SpotifyModel;
export { SpotifyModel };
