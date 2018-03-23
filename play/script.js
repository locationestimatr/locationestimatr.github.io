// Todo:
// Map editor maken
// Style return home button
// Photosphere gamemode toevoegen
// Load size van voorpagina verminderen
// Keuze voor distributed of niet
// High score data stijlen
// Database access veilig maken
// Round 1/5 update niet naar echte round limiet
// Show highscores in game summary laten zien
// Eerst round overview dan gamee overview geven aan het eind van de game

distribution = {weighted: 0, uniform: 1};

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