class MapManager {
    async initialize() {
        let response = await fetch('../data/countries.json');
        this.countries = await response.json();
        response = await fetch('../data/maps.json');
        this.maps = await response.json();
    }

    async getMap(key) {
        let poly;
        if (this.maps[key] === undefined) {
            poly = this.kmlsToPolygon(this.countries[key]);
        } else {
            let map = this.maps[key];
            if (map.type === 'collection') {
                console.log("Map collection:", map.countries);
                poly = this.kmlsToPolygon(...map.countries.map(country => this.countries[country]));
            } else if (map.type === 'kml') {
                let response = await fetch('../data/kml/' + map.file);
                let kml = await response.text();
                poly = this.kmlsToPolygon(kml);
            }
        }

        console.log({ poly });

        let area = 0;
        poly.getPaths().forEach(path => {
            area += google.maps.geometry.spherical.computeArea(path);
        });

        let minimumDistanceForPoints = Math.sqrt(area) * 2;

        return new GeoMap(poly, minimumDistanceForPoints)
    }

    kmlsToPolygon(...kmls) {
        let paths = [];
        for (let kml of kmls) {
            paths = paths.concat(this.kmlToPaths(kml));
        }

        return new google.maps.Polygon({
            paths: paths,
            strokeColor: '#FFC107',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FFC107',
            fillOpacity: 0.35
        });
    }

    kmlToPaths(kml) {
        let paths = [];

        let addPolygonToPaths = (polygon, paths) => {
            let poly = [];
            let coordString = polygon.textContent.trim();
            for (let coordinate of coordString.split(' ')) {
                let [lng, lat, _] = coordinate.split(',').map(n => +n);
                poly.push({
                    lat, lng
                });
            }
            paths.push(poly);
        }

        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(kml, "text/xml").firstChild;

        if (xmlDoc.nodeName === 'MultiGeometry')
            for (let polygon of xmlDoc.children)
                addPolygonToPaths(polygon, paths);
        else if (xmlDoc.nodeName === 'Polygon')
            addPolygonToPaths(xmlDoc, paths);

        return paths;
    }
}