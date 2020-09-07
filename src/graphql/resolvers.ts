import { GraphQLDateTime } from "graphql-iso-date";
import { IResolvers } from "graphql-tools";

import { SpotifyService } from "../services";

// TODO: Fix DateTime issue
// TODO: Import Artist/Album/Track Type

const resolvers: IResolvers = {
    Album: {
        artists: ({ artists }, args, { spotifyWebApiToken }) => {
            const artistIDs = artists.map((artist: { id: string }) => artist.id);

            return new SpotifyService(spotifyWebApiToken).getArtists(artistIDs);
        },
        tracks: ({ tracks }) => {
            const { items } = tracks;

            return items;
        }
    },
    Artist: {
        albums: ({ id: artistID }, args, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getAlbumsByArtist(artistID);
        }
    },
    DateTime: GraphQLDateTime,
    Query: {
        album: (parent, { albumID }, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getAlbum(albumID);
        },
        albums: (parent, { albumIDs }, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getAlbums(albumIDs);
        },
        artist: (parent, { artistID }, { spotifyWebApiToken }) => {
            return new SpotifyService(spotifyWebApiToken).getArtist(artistID);
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
