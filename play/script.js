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