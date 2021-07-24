import axios from "axios";

/**
 * General Definitions
 */
export interface SpotifyWebApiHeaders {
    Authorization: string;
    "Content-Type": string;
    [key: string]: string;
}

export interface ISpotifyImage {
    height: number;
    width: number;
    url: string;
}

export interface ICopyright {
    text: string;
    type: string;
}

export interface IPagingObject<T> {
    href: string;
    items: T[];
    limit: number;
    next: string;
    offset: number;
    previous: string;
    total: number;
}

export interface IRequestParams {
    market?: string;
    limit?: number;
    offset?: number;
    include_groups?: string;
}

/**
 * Album Definitions
 */
export enum AlbumType {
    Album = "album",
    Compilation = "compilation",
    Single = "single"
}

export enum AlbumGroup {
    AppearsOn = "appears_on",
    Album = "album",
    Compilation = "compilation",
    Single = "single"
}

export interface IAlbum {
    album_group?: AlbumGroup;
    album_type: AlbumType;
    artists: IArtist[];
    available_markets: string[];
    external_urls: { [key: string]: string };
    href: string;
    id: string;
    images: ISpotifyImage[];
    name: string;
    release_date: string;
    release_date_precision: string;
    type: AlbumType;
    uri: string;
}

export interface IAlbumExtended extends IAlbum {
    copyrights: ICopyright[];
    external_ids: { [key: string]: string };
    genres: string[];
    label: string;
    popularity: number;
    total_tracks: number;
    tracks: IPagingObject<ITrack>;
}

export interface IAlbumTracksRequestOptions {
    limit: number;
    offset: number;
}

/**
 * Artist Definitions
 */
export enum ArtistType {
    Artist = "artist"
}

export interface IFollowers {
    href: null;
    total: number;
}
export interface IArtist {
    external_urls: { [key: string]: string };
    href: string;
    id: string;
    name: string;
    type: ArtistType;
    uri: string;
}

export interface IArtistExtended extends IArtist {
    followers: IFollowers;
    genres: string[];
    images: ISpotifyImage[];
    popularity: number;
}

export interface IArtistAlbumsRequestOptions {
    limit: number;
    offset: number;
    include_groups: string[];
}

/**
 * Track Definitions
 */

export enum TrackType {
    Track = "track"
}
export interface ITrack {
    artists: IArtist[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_urls: { [key: string]: string };
    href: string;
    id: string;
    is_playable: boolean;
    name: string;
    preview_url: string;
    track_number: number;
    type: TrackType;
    uri: string;
}

export interface ITrackExtended extends ITrack {
    album: IAlbum;
    external_ids: { [key: string]: string };
    popularity: number;
}

export type SpotifyRecordType = "album" | "track";

/**
 * Service used to fetch data from the Spotify API
 * @param webApiToken Spotify Web API token
 * @see https://developer.spotify.com/documentation/
 * @see https://developer.spotify.com/documentation/general/guides/authorization-guide/
 */
class SpotifyService {
    private webApiUrl: string;
    private webApiToken: string;
    private webApiHeaders: SpotifyWebApiHeaders;
    private market: string;

    constructor(webApiToken: string) {
        this.webApiUrl = "https://api.spotify.com/v1";
        this.webApiToken = webApiToken;
        this.webApiHeaders = {
            Authorization: `Bearer ${webApiToken}`,
            "Content-Type": "application/x-www-form-urlencoded"
        };
        this.market = "US";
    }

    /**
     * Get an artist by their Spotify ID
     * @param artistID Spotify ID for the artist
     * @see https://developer.spotify.com/documentation/web-api/reference/artists/get-artist/
     */
    getArtist(artistID: string): Promise<IArtistExtended> {
        return axios
            .get(`${this.webApiUrl}/artists/${artistID}`, { headers: this.webApiHeaders })
            .then(({ data: artist }) => artist);
    }

    /**
     * Get a list of artists by their Spotify ID's
     * @param artistsIDs Array of Spotify artist ID's
     * @see https://developer.spotify.com/console/get-several-artists/
     */
    getArtists(artistsIDs: string[]): Promise<IArtistExtended[]> {
        const params = { ids: artistsIDs.join(",") };

        return axios
            .get(`${this.webApiUrl}/artists`, { headers: this.webApiHeaders, params })
            .then(({ data }) => data.artists);
    }

    /**
     * Get a list of albums by an artist
     * @param artistID Spotify ID for the artist
     * @see https://developer.spotify.com/console/get-artist/
     */
    getAlbumsByArtist(
        artistID: string,
        options: IArtistAlbumsRequestOptions
    ): Promise<IPagingObject<IAlbum>> {
        const params: IRequestParams = {
            market: this.market,
            limit: options.limit || 750,
            offset: options.offset || 0
        };

        if (options.include_groups.length > 0)
            params.include_groups = options.include_groups.join(",");

        return axios
            .get(`${this.webApiUrl}/artists/${artistID}/albums`, {
                headers: this.webApiHeaders,
                params
            })
            .then(({ data }) => data);
    }

    /**
     * Get a list of top tracks by an artist
     * @param artistID Spotify ID for the artist
     * @see https://developer.spotify.com/documentation/web-api/reference/artists/get-artists-top-tracks/
     */
    getTopTracksByArtist(artistID: string): Promise<ITrackExtended[]> {
        return axios
            .get(`${this.webApiUrl}/artists/${artistID}/top-tracks`, {
                headers: this.webApiHeaders,
                params: { country: this.market }
            })
            .then(({ data }) => data.tracks);
    }

    /**
     * Get a list of artists related to an artist
     * @param artistID Spotify ID for the artist
     * @see https://developer.spotify.com/documentation/web-api/reference/artists/get-related-artists/
     */
    getRelatedArtists(artistID: string): Promise<IArtistExtended[]> {
        return axios
            .get(`${this.webApiUrl}/artists/${artistID}/related-artists`, {
                headers: this.webApiHeaders
            })
            .then(({ data }) => data.artists);
    }

    /**
     * Get an album by its Spotify ID
     * @param albumID Spotify ID for the album
     * @see https://developer.spotify.com/console/get-album/
     */
    getAlbum(albumID: string): Promise<IAlbumExtended> {
        return axios
            .get(`${this.webApiUrl}/albums/${albumID}`, { headers: this.webApiHeaders })
            .then(({ data }) => data);
    }

    /**
     * Get a list of albums by their Spotify ID's
     * @param albumIDs Array of Spotify album ID's
     * @see https://developer.spotify.com/console/get-several-albums/
     */
    getAlbums(albumIDs: string[]): Promise<IAlbumExtended[]> {
        const params = { ids: albumIDs.join(","), market: this.market };

        return axios
            .get(`${this.webApiUrl}/albums`, { headers: this.webApiHeaders, params })
            .then(({ data }) => data.albums);
    }

    /**
     * Get a list of tracks that appear on an album
     * @param albumID Spotify ID for the album
     * @see https://developer.spotify.com/console/get-album-tracks/
     */
    getTracksByAlbum(
        albumID: string,
        options: IAlbumTracksRequestOptions
    ): Promise<IPagingObject<ITrack>> {
        const params: IRequestParams = {
            market: this.market,
            limit: options.limit || 50,
            offset: options.offset || 0
        };

        return axios
            .get(`${this.webApiUrl}/albums/${albumID}/tracks`, {
                headers: this.webApiHeaders,
                params
            })
            .then(({ data }) => data);
    }

    /**
     * Get a track by its Spotify ID
     * @param trackID Spotify ID for the track
     * @see https://developer.spotify.com/console/get-track/
     */
    getTrack(trackID: string): Promise<ITrackExtended> {
        return axios
            .get(`${this.webApiUrl}/tracks/${trackID}`, { headers: this.webApiHeaders })
            .then(({ data }) => data);
    }

    /**
     * Get a list of tracks by their Spotify ID's
     * @param trackIDs Array of Spotify track ID's
     * @see https://developer.spotify.com/console/get-several-tracks/
     */
    getTracks(trackIDs: string[]): Promise<ITrackExtended[]> {
        const params = { ids: trackIDs.join(","), market: this.market };

        return axios
            .get(`${this.webApiUrl}/tracks`, { headers: this.webApiHeaders, params })
            .then(({ data }) => data.tracks);
    }

    /**
     * Search for tracks on Spotify
     * @param query Search term used to search on Spotify
     * @see https://developer.spotify.com/console/search/
     */
    search(query: string, limit: number = 10) {
        const params = {
            q: query,
            type: "track,artist,album",
            limit,
            market: this.market
        };

        return axios
            .get(`${this.webApiUrl}/search`, { headers: this.webApiHeaders, params })
            .then(({ data }) => {
                const { albums, artists, tracks } = data;

                return {
                    albums: albums.items || [],
                    artists: artists.items || [],
                    tracks: tracks.items || [],
                    query,
                    total: tracks.total + albums.total + artists.total
                };
            });
    }
}

export default SpotifyService;
export { SpotifyService };
