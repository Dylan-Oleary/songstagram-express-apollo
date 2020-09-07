import { gql } from "apollo-server-express";

const typeDefs = gql`
    scalar DateTime

    type Album {
        id: ID!
        name: String!
        artists: [Artist]!
        tracks: [Track]!
        uri: String!
        release_date: DateTime
        genres: [String]
        label: String
        album_type: String
        type: String
        popularity: Int
        images: [Image]
        copyrights: [Copyright]
        external_urls: ExternalURLs
        total_tracks: Int
    }

    type Artist {
        id: ID!
        name: String!
        albums: [Album]
        tracks: [Track]
        genres: [String]
        popularity: Int
        images: [Image]
        type: String
        external_urls: ExternalURLs
    }

    type Copyright {
        text: String
        type: String
    }

    type ExternalURLs {
        spotify: String
    }

    type Image {
        height: Int!
        width: Int!
        url: String!
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
        explicit: Boolean!
        uri: String!
        disc_number: Int
        external_urls: ExternalURLs
        popularity: Int
        track_number: Int
        type: String
    }

    type Query {
        album(albumID: ID!): Album
        albums(albumIDs: [ID]!): [Album]
        artist(artistID: ID!): Artist
        artists(artistIDs: [ID]!): [Artist]
        spotifySearch(query: String!): SpotifySearch
        track(trackID: ID!): Track
        tracks(trackIDs: [ID]!): [Track]
    }
`;

export default typeDefs;
export { typeDefs };
