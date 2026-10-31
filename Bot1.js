
// =====================================
// NEONFLIX - MOVIE / TV SHOW EXPLORER
// =====================================


// 1. API CONFIGURATION

const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2YWJmZDI2MzUzMjIwZThkOTlmYzUzMDZlOWZlMjhlYSIsIm5iZiI6MTc5MjI0NDI5Ni40MTkwMDAxLCJzdWIiOiI2YWQzN2E0OGRiNGJmMTJiNjJiNDA0ZTUiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.YrKXwmE1WKYhIyfugdFFfxZHayVOcLs-lAVAqdDo1pg";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

const OMDB_KEY = "d785318e";
const OMDB_API = "https://www.omdbapi.com/";

const REST_COUNTRIES_API = "/api/countries";

const NO_POSTER =
    "https://placehold.co/300x450/15101f/ff1744?text=No+Poster";

const NO_ACTOR =
    "https://placehold.co/200x300/15101f/a855f7?text=No+Photo";


// 2. HTML ELEMENTS

const type = document.getElementById("type");
const genre = document.getElementById("genre");
const search = document.getElementById("search");

const movies = document.getElementById("movies");
const top10 = document.getElementById("top10");
const status = document.getElementById("status");

const modal = document.getElementById("modal");
const details = document.getElementById("details");

let currentPage = 1;
let totalPages = 1;
let requestId = 0;


// 3. TMDB API

async function get(path) {

    const separator = path.includes("?") ? "&" : "?";

    const response = await fetch(
        `${API}${path}${separator}language=en-US`,
        {
            headers: {
                Authorization: `Bearer ${TMDB_TOKEN}`,
                Accept: "application/json"
            }
        }
    );

    if (!response.ok) {
        throw new Error(`TMDB Error: ${response.status}`);
    }

    return response.json();
}


// 4. OMDb API

async function getOMDb(title, year = "") {

    const params = new URLSearchParams({
        apikey: OMDB_KEY,
        t: title
    });

    if (year) {
        params.set("y", year);
    }

    const response = await fetch(
        `${OMDB_API}?${params}`
    );

    const data = await response.json();

    if (!response.ok || data.Response === "False") {
        throw new Error(data.Error || "OMDb unavailable");
    }

    return data;
}


// 5. REST COUNTRIES API

async function getCountry(name) {

    const aliases = {
        "United Kingdom": [
            "United Kingdom",
            "UK",
            "Great Britain"
        ],

        "United States of America": [
            "United States of America",
            "United States",
            "USA"
        ]
    };

    const names = aliases[name] || [name];

    for (const countryName of names) {

        const params = new URLSearchParams({
            q: countryName
        });

        try {

            const response = await fetch(
                `${REST_COUNTRIES_API}?${params}`
            );

            if (!response.ok) {
                throw new Error(
                    `Country API Error: ${response.status}`
                );
            }

            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                return data;
            }

        } catch (error) {
            console.error(
                "Country search error:",
                countryName,
                error
            );
        }
    }

    return [];
}


async function loadCountryInfo(countries) {

    const container = document.getElementById("countryInfo");

    if (!container) return;

    if (!countries || countries.length === 0) {

        container.innerHTML = `
            <p>Production country information unavailable.</p>
        `;

        return;
    }

    container.innerHTML = `
        <p>Loading country details...</p>
    `;

    const normalize = value =>
        String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

    const aliases = {
        unitedkingdom: [
            "unitedkingdom",
            "uk",
            "greatbritain"
        ],

        unitedstatesofamerica: [
            "unitedstatesofamerica",
            "unitedstates",
            "usa"
        ]
    };

    const results = await Promise.all(

        countries.map(async country => {

            try {

                const records = await getCountry(country.name);

                if (!records.length) {

                    return `
                        <li>
                            <b>${escapeHTML(country.name)}</b><br>
                            Details unavailable.
                        </li>
                    `;
                }

                const target = normalize(country.name);

                const possibleNames =
                    aliases[target] || [target];

                const record = records.find(item =>
                    possibleNames.includes(normalize(item.name))
                ) || records[0];

                return `
                    <li>
                        <b>${escapeHTML(record.name || country.name)}</b><br>

                        Region:
                        ${escapeHTML(record.region || "N/A")}<br>

                        Subregion:
                        ${escapeHTML(record.subregion || "N/A")}<br>

                        Capital:
                        ${escapeHTML(record.capital || "N/A")}
                    </li>
                `;

            } catch (error) {

                console.error(
                    "Country details error:",
                    country.name,
                    error
                );

                return `
                    <li>
                        <b>${escapeHTML(country.name)}</b><br>
                        Details unavailable.
                    </li>
                `;
            }
        })
    );

    container.innerHTML = `
        <div class="country-details">
            <h3>🌍 Production Country Details</h3>
            <ul>${results.join("")}</ul>
        </div>
    `;
}


// 6. SAFE HTML

function escapeHTML(value = "") {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// 7. MOVIE CARD

function card(movie, kind = type.value) {

    const title =
        movie.title || movie.name || "Unknown Title";

    const mediaType =
        movie.media_type === "movie" ||
        movie.media_type === "tv"
            ? movie.media_type
            : kind;

    const poster = movie.poster_path
        ? IMG + movie.poster_path
        : NO_POSTER;

    const year = (
        movie.release_date ||
        movie.first_air_date ||
        ""
    ).slice(0, 4);

    const score = Number(movie.vote_average || 0).toFixed(1);

    return `
        <article class="movie">

            <img
                class="poster"
                src="${poster}"
                alt="${escapeHTML(title)}"
                loading="lazy"
                onerror="this.onerror=null;this.src='${NO_POSTER}'"
            >

            <div class="movie-info">

                <h3>${escapeHTML(title)}</h3>

                <p class="rating">
                    ⭐ ${score} / 10
                </p>

                <p class="year">
                    ${escapeHTML(year || "Year unavailable")}
                </p>

                <button
                    class="details-btn"
                    data-id="${Number(movie.id)}"
                    data-kind="${mediaType}"
                >
                    VIEW DETAILS ↗
                </button>

                <a
                    href="https://www.themoviedb.org/${mediaType}/${Number(movie.id)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="movie-link"
                >
                    OPEN TMDB ↗
                </a>

            </div>
        </article>
    `;
}


// 8. LOAD GENRES

async function loadGenres() {

    genre.innerHTML =
        '<option value="">All Genres</option>';

    try {

        const data = await get(
            `/genre/${type.value}/list`
        );

        genre.innerHTML += data.genres.map(item => `
            <option value="${item.id}">
                ${escapeHTML(item.name)}
            </option>
        `).join("");

    } catch (error) {

        console.error("Genre error:", error);
    }
}


// 9. LOAD TOP 10

async function loadTop10() {

    top10.innerHTML =
        "<p>Loading Top 10...</p>";

    try {

        const kind = type.value;

        const data = await get(
            `/${kind}/popular?page=1`
        );

        top10.innerHTML = (data.results || [])
            .slice(0, 10)
            .map(movie => card(movie, kind))
            .join("");

    } catch (error) {

        top10.innerHTML =
            "<p>Top 10 failed to load.</p>";

        console.error(error);
    }
}


// 10. SEARCH AND FILTER

async function loadMovies() {

    const id = ++requestId;

    const kind = type.value;
    const term = search.value.trim();
    const selectedGenre = genre.value;

    status.textContent = "Loading movies...";
    movies.innerHTML = "";

    try {

        let path;

        if (term) {

            path =
                `/search/${kind}?query=${encodeURIComponent(term)}&page=${currentPage}`;

        } else {

            path =
                `/discover/${kind}?sort_by=popularity.desc&page=${currentPage}`;

            if (selectedGenre) {
                path += `&with_genres=${selectedGenre}`;
            }
        }

        const data = await get(path);

        if (id !== requestId) return;

        let list = data.results || [];

        if (term && selectedGenre) {

            list = list.filter(item =>
                item.genre_ids?.includes(
                    Number(selectedGenre)
                )
            );
        }

        totalPages = Math.min(
            data.total_pages || 1,
            500
        );

        movies.innerHTML = list.length
            ? list.map(item => card(item, kind)).join("")
            : "<p>No movies found.</p>";

        status.textContent = list.length
            ? `${list.length} results found`
            : "No results. Try another search.";

        document.getElementById("pageNumber").textContent =
            `PAGE ${currentPage} / ${totalPages}`;

        document.getElementById("prevBtn").disabled =
            currentPage <= 1;

        document.getElementById("nextBtn").disabled =
            currentPage >= totalPages;

    } catch (error) {

        if (id !== requestId) return;

        status.textContent =
            "Connection failed. Check your TMDB API.";

        console.error(error);
    }
}


// 11. MOVIE DETAILS

async function showDetails(id, kind) {

    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    details.innerHTML =
        "<p>Loading movie details...</p>";

    try {

        const [movie, credits, videos] =
            await Promise.all([
                get(`/${kind}/${id}`),
                get(`/${kind}/${id}/credits`),
                get(`/${kind}/${id}/videos`)
            ]);

        const title =
            movie.title || movie.name || "Unknown Title";

        const year = (
            movie.release_date ||
            movie.first_air_date ||
            ""
        ).slice(0, 4);

        const trailer = (videos.results || []).find(video =>
            video.site === "YouTube" &&
            video.type === "Trailer" &&
            video.key
        );

        const cast = (credits.cast || []).slice(0, 5);

        const poster = movie.poster_path
            ? IMG + movie.poster_path
            : NO_POSTER;

        details.innerHTML = `
            <div class="detail-layout">

                <img
                    class="detail-poster"
                    src="${poster}"
                    alt="${escapeHTML(title)}"
                    onerror="this.onerror=null;this.src='${NO_POSTER}'"
                >

                <div class="detail-text">

                    <h2>${escapeHTML(title)}</h2>

                    <p>
                        📅 Year: ${escapeHTML(year || "N/A")}
                    </p>

                    <p>
                        ⭐ TMDB Rating:
                        ${Number(movie.vote_average || 0).toFixed(1)} / 10
                    </p>

                    <p>
                        <b>Overview</b><br>
                        ${escapeHTML(movie.overview || "No description available.")}
                    </p>

                    <div id="countryInfo">
                        <p>Loading country details...</p>
                    </div>

                    <p><b>Cast</b></p>

                    <div class="cast-list">

                        ${cast.map(actor => `
                            <div class="cast-card">

                                <img
                                    src="${actor.profile_path
                                        ? IMG + actor.profile_path
                                        : NO_ACTOR}"
                                    alt="${escapeHTML(actor.name)}"
                                    loading="lazy"
                                    onerror="this.onerror=null;this.src='${NO_ACTOR}'"
                                >

                                <p>${escapeHTML(actor.name)}</p>
                            </div>
                        `).join("")}

                    </div>

                    <div id="imdbRating">
                        <p>IMDb Rating: Loading...</p>
                    </div>

                    <a
                        href="https://www.themoviedb.org/${kind}/${Number(movie.id)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        VIEW ON TMDB ↗
                    </a>

                    ${trailer ? `
                        <a
                            href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ▶ WATCH TRAILER
                        </a>
                    ` : ""}

                </div>
            </div>
        `;

        // LOAD COUNTRY INFORMATION
        loadCountryInfo(
            movie.production_countries || []
        );

        // LOAD IMDb INFORMATION
        try {

            const imdb = await getOMDb(title, year);

            const imdbContainer =
                document.getElementById("imdbRating");

            if (imdbContainer) {

                imdbContainer.innerHTML = `
                    <p>
                        ⭐ IMDb Rating:
                        ${escapeHTML(imdb.imdbRating || "N/A")} / 10
                    </p>

                    <p>
                        🎭 Actors:
                        ${escapeHTML(imdb.Actors || "N/A")}
                    </p>
                `;
            }

        } catch (error) {

            const imdbContainer =
                document.getElementById("imdbRating");

            if (imdbContainer) {
                imdbContainer.innerHTML =
                    "<p>IMDb Rating unavailable.</p>";
            }

            console.error("OMDb error:", error);
        }

    } catch (error) {

        details.innerHTML =
            "<p>Details could not be loaded. Please try again.</p>";

        console.error("Details error:", error);
    }
}


// 12. CLOSE MODAL

function closeModal() {

    modal.style.display = "none";
    document.body.style.overflow = "";
}

document.getElementById("closeBtn").addEventListener(
    "click",
    closeModal
);

modal.addEventListener("click", event => {

    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeModal();
    }
});


// 13. BUTTON EVENTS

document.getElementById("searchBtn").addEventListener(
    "click",
    () => {

        currentPage = 1;
        loadMovies();
    }
);

search.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        currentPage = 1;
        loadMovies();
    }
});

type.addEventListener("change", async () => {

    currentPage = 1;

    await loadGenres();

    await Promise.all([
        loadTop10(),
        loadMovies()
    ]);
});

genre.addEventListener("change", () => {

    currentPage = 1;
    loadMovies();
});

document.getElementById("prevBtn").addEventListener(
    "click",
    () => {

        if (currentPage > 1) {

            currentPage--;
            loadMovies();

            window.scrollTo({
                top: 500,
                behavior: "smooth"
            });
        }
    }
);

document.getElementById("nextBtn").addEventListener(
    "click",
    () => {

        if (currentPage < totalPages) {

            currentPage++;
            loadMovies();

            window.scrollTo({
                top: 500,
                behavior: "smooth"
            });
        }
    }
);


// 14. DETAILS BUTTON EVENT

document.addEventListener("click", event => {

    const button = event.target.closest(".details-btn");

    if (button) {

        showDetails(
            Number(button.dataset.id),
            button.dataset.kind
        );
    }
});


// 15. START WEBSITE

async function init() {

    if (
        !TMDB_TOKEN ||
        TMDB_TOKEN === "PASTE_NEW_TMDB_TOKEN_HERE"
    ) {

        status.textContent =
            "Please add your TMDB Bearer Token.";

        top10.innerHTML = "";
        return;
    }

    await loadGenres();

    await Promise.all([
        loadTop10(),
        loadMovies()
    ]);
}

init();
