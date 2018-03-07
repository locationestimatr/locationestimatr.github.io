document.addEventListener('DOMContentLoaded',init);

async function init(){
    let response = await fetch('./data/countries.json');
    let countries = await response.json();

    response = await fetch('./data/flag-names.json');
    let flagNames = await response.json();
    
    response = await fetch('./data/streetview-countries.json');
    let streetviewCountries = await response.json();

    console.log(streetviewCountries);

    let html = '';
    for(let country in countries){
        let flagCode = flagNames[country];
        if(!flagCode || !streetviewCountries.includes(country))
            continue;

        html +=`
        <a class="map" href=./play#${encodeURI(country)}>
            <div class="map-background" style="background-image:url(data/thumbnails/flags/${flagCode.toLowerCase()}.svg)"></div>
            <div class="map-title">${country}</div>
        </a>
        `;
    }
    document.querySelector('.country-maps').innerHTML = html;
}