import { IResolvers } from "graphql-tools";

import { AlbumGroup, SpotifyService } from "../services/Spotify";

const resolvers: IResolvers = {
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
            return new SpotifyService(spotifyWebApiToken).getTracksByAlbum(albumID, options);
        }
    },
    Artist: {
        albums: (
            {
                id: artistID,
                options = {
                    limit: 50,
                    offset: 0,
                    include_groups: [AlbumGroup.Album, AlbumGroup.Single]
                }
            },
            args,
            { spotifyWebApiToken }
        ) => {
            return new SpotifyService(spotifyWebApiToken).getAlbumsByArtist(artistID, options);
        },
        related_artists: ({ id: artistID }, args, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getRelatedArtists(artistID);
        },
        top_tracks: ({ id: artistID }, args, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getTopTracksByArtist(artistID);
        }
    },
    PagingItem: {
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
            return new SpotifyService(spotifyWebApiToken).getAlbum(albumID).then((album) => {
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
                include_groups = [AlbumGroup.Album, AlbumGroup.Single]
            },
            { spotifyWebApiToken }
        ) => {
            return new SpotifyService(spotifyWebApiToken).getArtist(artistID).then((artist) => {
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
        spotifySearch: (parent, { query }, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).search(query);
        },
        track: (parent, { trackID }, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getTrack(trackID);
        },
        tracks: (parent, { trackIDs }, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getTracks(trackIDs);
        }
    }
};

export default resolvers;
export { resolvers };
