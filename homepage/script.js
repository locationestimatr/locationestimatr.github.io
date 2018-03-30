document.addEventListener("DOMContentLoaded", init);

async function init() {
    let response = await fetch("./data/countries.json");
    let countries = await response.json();

    response = await fetch("./data/flag-names.json");
    let flagNames = await response.json();

    response = await fetch("./data/streetview-countries.json");
    let streetviewCountries = await response.json();

    console.log(streetviewCountries);

    let html = "";
    for (let country in countries) {
        let flagCode = flagNames[country];
        if (!flagCode || !streetviewCountries.includes(country))
            continue;

        html += `
            <div class="map">
                <div class="map-background" style="background-image:url(data/thumbnails/flags/${flagCode.toLowerCase()}.svg)"></div>
                <div class="map-text">
                    <div class="map-title">${country}</div>
                    <div class="map-actions">
                        <a href=./play#${encodeURI(country)} class="map-play">Play</a>
                        <a href=./highscore#${encodeURI(country)} class="map-score">Scores</a>
                    </div>
                </div>
            </div>
        `;
    }
    document.querySelector(".country-maps").innerHTML = html;
}

function playMyArea(e) {
    navigator.geolocation.getCurrentPosition(position => {
        let radius = document.querySelector(".radius-input").value;
        location.href = `./play/#area#${position.coords.latitude}#${position.coords.longitude}#${radius}`;
    });
}