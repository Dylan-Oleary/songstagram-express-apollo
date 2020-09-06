import { GraphQLDateTime } from "graphql-iso-date";
import { IResolvers } from "graphql-tools";

import { SpotifyService } from "../services";

const resolvers: IResolvers = {
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
        }
    }
};

export default resolvers;
export { resolvers };
