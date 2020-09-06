import { gql } from "apollo-server-express";

const typeDefs = gql`
    scalar DateTime

    type Album {
        id: ID!
        name: String!
        artists: [Artist]!
        tracks: [Track]!
        release_date: DateTime
        genres: [String]
        label: String
        album_type: String
        type: String
        popularity: Int
        uri: String!
    }

    type Artist {
        id: ID!
        name: String!
        albums: [Album]
        genres: [String]
        popularity: Int
    }

    type SpotifySearch {
        query: String!
        tracks: [Track]
        total: Int
    }

    type Track {
        id: ID!
        name: String!
        artists: [Artist]!
        album: Album!
        duration_ms: Int!
        popularity: Int
        uri: String!
        type: String
    }

    type Query {
        album(albumID: ID!): Album
        albums(albumIDs: [ID]!): [Album]
        artist(artistID: ID!): Artist
        artists(artistIDs: [ID]!): [Artist]
    }
`;

export default typeDefs;
export { typeDefs };
