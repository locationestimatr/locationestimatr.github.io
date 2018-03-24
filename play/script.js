// Todo:
// Map editor maken
// Style return home button
// Photosphere gamemode toevoegen
// Load size van voorpagina verminderen
// Keuze voor distributed of niet
// Database access veilig maken
// Eerst round overview dan gamee overview geven aan het eind van de game
// My region map maken die je locatie pakt en daar in een radius laat spelen

distribution = {weighted: 0, uniform: 1};

async function init() {
    let map = decodeURI(location.hash.substring(1));
    window.addEventListener('hashchange', () => {
        location.reload();
    });
    if (map === '')
        map = 'world';

    let geoMap, mapManager = new MapManager();
    await mapManager.initialize();
    if (map.startsWith('area#')) {
        let [, lat, lon, radius] = map.split('#').map(n => +n);
        console.log(lat, lon, radius);

        geoMap = mapManager.getAreaMap(lat, lon, radius);
    } else {
        geoMap = await mapManager.getMapByName(map);
    }

    console.log("Map: ", map);
    game = new Game(geoMap, document.querySelector('.estimator'));
}

function goHome() {
    location.href = '../';
}