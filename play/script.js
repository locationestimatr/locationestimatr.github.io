// Todo:
// Custom games (hoeveelheid rondes, tijdlimiet per ronde, gelimiteerde moves, gelimiteerde panning en zoom)
// Homepage met game rules
// Map editor maken
// Style return home button
// Photosphere gamemode toevoegen
// Bug in punten telling
// Detect wanneer land geen street view heeft
// Load size van voorpagina verminderen

distribution = { weighted: 0, uniform: 1 }

async function init() {
    let map = decodeURI(location.hash.substring(1));
    window.addEventListener('hashchange', () => {
        location.reload();
    });
    if (map === '')
        map = 'world';

    console.log("Map: ", map);

    mapManager = new MapManager();
    await mapManager.initialize();
    map = await mapManager.getMap(map);

    game = new Game(map, document.querySelector('.estimator'));

    // let svElement = new StreetviewElement(document.querySelector('.streetview'));

    // streetview = new Streetview(maps.world);
    // let location = await streetview.randomValidLocation();

    // svElement.setLocation(...location);
    // console.log({ location });
}

function goHome() {
    location.href = '../';
}