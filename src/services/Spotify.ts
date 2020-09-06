import axios from "axios";

interface SpotifyWebApiHeaders {
    Authorization: string;
    "Content-Type": string;
    [key: string]: string;
}

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

    constructor(webApiToken: string) {
        this.webApiUrl = "https://api.spotify.com/v1";
        this.webApiToken = webApiToken;
        this.webApiHeaders = {
            Authorization: `Bearer ${webApiToken}`,
            "Content-Type": "application/x-www-form-urlencoded"
        };
    }

    /**
     * Get an artist by their Spotify ID
     * @param artistID Spotify ID for the artist
     * @see https://developer.spotify.com/documentation/web-api/reference/artists/get-artist/
     */
    getArtist(artistID: string) {
        return axios
            .get(`${this.webApiUrl}/artists/${artistID}`, { headers: this.webApiHeaders })
            .then(({ data: artist }) => artist);
    }

    /**
     * Get a list of artists by their Spotify ID's
     * @param artistsIDs Array of Spotify artist ID's
     * @see https://developer.spotify.com/console/get-several-artists/
     */
    getArtists(artistsIDs: string[]) {
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
    getAlbumsByArtist(artistID: string) {
        return axios
            .get(`${this.webApiUrl}/artists/${artistID}/albums`, { headers: this.webApiHeaders })
            .then(({ data }) => data.items);
    }

    /**
     * Get an album by its Spotify ID
     * @param albumID Spotify ID for the album
     * @see https://developer.spotify.com/console/get-album/
     */
    getAlbum(albumID: string) {
        return axios
            .get(`${this.webApiUrl}/albums/${albumID}`, { headers: this.webApiHeaders })
            .then(({ data }) => data);
    }

    /**
     * Get a list of albums by their Spotify ID's
     * @param albumIDs Array of Spotify album ID's
     * @see https://developer.spotify.com/console/get-several-albums/
     */
    getAlbums(albumIDs: string[]) {
        const params = { ids: albumIDs.join(",") };

        return axios
            .get(`${this.webApiUrl}/albums`, { headers: this.webApiHeaders, params })
            .then(({ data }) => data.albums);
    }

    /**
     * Get a list of tracks that appear on an album
     * @param albumID Spotify ID for the album
     * @see https://developer.spotify.com/console/get-album-tracks/
     */
    getTracksByAlbum(albumID: string) {
        return axios
            .get(`${this.webApiUrl}/albums/${albumID}/tracks`, { headers: this.webApiHeaders })
            .then(({ data }) => data);
    }

    /**
     * Get a track by its Spotify ID
     * @param trackID Spotify ID for the track
     * @see https://developer.spotify.com/console/get-track/
     */
    getTrack(trackID: string) {
        return axios
            .get(`${this.webApiUrl}/tracks/${trackID}`, { headers: this.webApiHeaders })
            .then(({ data }) => data);
    }

    /**
     * Get a list of tracks by their Spotify ID's
     * @param trackIDs Array of Spotify track ID's
     * @see https://developer.spotify.com/console/get-several-tracks/
     */
    getTracks(trackIDs: string[]) {
        const params = { ids: trackIDs.join(",") };

        return axios
            .get(`${this.webApiUrl}/tracks`, { headers: this.webApiHeaders, params })
            .then(({ data }) => data.tracks);
    }

    /**
     * Search for tracks on Spotify
     * @param query Search term used to search on Spotify
     * @see https://developer.spotify.com/console/search/
     */
    search(query: string) {
        const params = {
            q: query,
            type: "track",
            limit: 10
        };

        return axios
            .get(`${this.webApiUrl}/search`, { headers: this.webApiHeaders, params })
            .then(({ data }) => {
                const { tracks } = data;

                return {
                    tracks: tracks.items || [],
                    query,
                    total: tracks.total
                };
            });
    }
}

export default SpotifyService;
export { SpotifyService, SpotifyWebApiHeaders };
