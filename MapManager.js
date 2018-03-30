class MapManager {
    async initialize() {
        let response = await fetch("../data/countries.json");
        this.countries = await response.json();
        response = await fetch("../data/maps.json");
        this.maps = await response.json();
    }

    getAreaMap(lat, lon, radius, numSides = 20) {
        radius *= 1000;
        let center = new google.maps.LatLng(lat, lon);
        const paths = [], degreeStep = 360 / numSides;

        for (let i = 0; i < numSides; i++) {
            const gpos = google.maps.geometry.spherical.computeOffset(center, radius, degreeStep * i);
            paths.push({lat: gpos.lat(), lng: gpos.lng()});
        }

        paths.push(paths[0]);
        console.log(paths);

        let poly = new google.maps.Polygon({
            paths: paths,
            strokeColor: "#FFC107",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FFC107",
            fillOpacity: 0.35
        });

        return this.getMapByPoly(poly, "my_area");
    }

    async getMapByName(key) {
        let poly;
        if (this.maps[key] === undefined) {
            poly = this.kmlsToPolygon(this.countries[key]);
        } else {
            let map = this.maps[key];
            if (map.type === "collection") {
                console.log("Map collection:", map.countries);
                poly = this.kmlsToPolygon(...map.countries.map(country => this.countries[country]));
            } else if (map.type === "kml") {
                let response = await fetch("../data/kml/" + map.file);
                let kml = await response.text();
                poly = this.kmlsToPolygon(kml);
            }
        }

        return this.getMapByPoly(poly, key);
    }

    getMapByPoly(poly, mapName) {
        let area = 0;
        poly.getPaths().forEach(path => {
            area += google.maps.geometry.spherical.computeArea(path);
        });

        let minimumDistanceForPoints = Math.sqrt(area) * 2;

        return new GeoMap(poly, minimumDistanceForPoints, mapName);
    }

    kmlsToPolygon(...kmls) {
        let paths = [];
        for (let kml of kmls) {
            paths = paths.concat(this.kmlToPaths(kml));
        }

        return new google.maps.Polygon({
            paths: paths,
            strokeColor: "#FFC107",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FFC107",
            fillOpacity: 0.35
        });
    }

    kmlToPaths(kml) {
        let paths = [];

        let addPolygonToPaths = (polygon, paths) => {
            let poly = [];
            let coordString = polygon.textContent.trim();
            for (let coordinate of coordString.split(" ")) {
                let [lng, lat, _] = coordinate.split(",").map(n => +n);
                poly.push({
                    lat, lng
                });
            }
            paths.push(poly);
        }

        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(kml, "text/xml").firstChild;

        if (xmlDoc.nodeName === "MultiGeometry")
            for (let polygon of xmlDoc.children)
                addPolygonToPaths(polygon, paths);
        else if (xmlDoc.nodeName === "Polygon")
            addPolygonToPaths(xmlDoc, paths);

        return paths;
    }
}