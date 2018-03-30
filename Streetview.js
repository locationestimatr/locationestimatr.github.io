class Streetview {
    constructor(map, distribution) {
        this.map = map;
        this.distribution = distribution;
    }

    async randomValidLocation(endZoom = 14) {
        let tile = await this.randomValidTile(endZoom);
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        let img = tile.img;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        let data = context.getImageData(0, 0, img.width, img.height).data;
        let bluePixelCount = 0;

        for (let i = 0; i < data.length; i += 4)
            if (data[i + 2] > 0)
                bluePixelCount++;

        let randomPixel = Math.floor(Math.random() * bluePixelCount);
        for (let i = 0; i < data.length; i += 4) {

            if (data[i + 2] > 0 && --randomPixel === 0) {
                let x = (i / 4) % img.width;
                let y = Math.floor((i / 4) / img.width);

                return this.tilePixelToLatLon(tile.x, tile.y, tile.zoom, x, y);
            }
        }

        console.error("No blue pixel found");
        return this.randomValidLocation(endZoom);
    }

    async randomValidTile(endZoom) {
        let chosenTile = { x: 0, y: 0, zoom: 0 };
        let previousTiles = [chosenTile];
        let failedTiles = [];
        while (chosenTile.zoom < endZoom) {
            let subTiles = await this.getSubTiles(chosenTile.x, chosenTile.y, chosenTile.zoom);

            let validTiles = subTiles
                .filter(tile => tile.hasSv)
                .filter(tile => this.tileIntersectsMap(tile.x, tile.y, tile.zoom))
                .filter(tile => {
                    for (let fail of failedTiles)
                        if (fail.x === tile.x && fail.y === tile.y && fail.zoom === tile.zoom)
                            return false;
                    return true;
                });

            if (validTiles.length === 0) {
                failedTiles.push(chosenTile);
                if (previousTiles.length > 0)
                    chosenTile = previousTiles.splice(-2)[0];
                else
                    chosenTile = { x: 0, y: 0, zoom: 0 };
                console.log("Took a wrong turn when getting a random position, going back to zoom " + chosenTile.zoom, chosenTile);
            } else {
                chosenTile = this.pickRandomSubTile(validTiles);
                previousTiles.push(chosenTile);
            }
        }

        return chosenTile;
    }

    pickRandomSubTile(tiles) {
        if (this.distribution === distribution.uniform) {
            return tiles[Math.floor(tiles.length * Math.random())];
        }

        let totalCoverage = tiles.map(tile => tile.coverage).reduce((a, b) => a + b);
        let random = Math.random() * totalCoverage;

        for (let tile of tiles) {
            random -= tile.coverage;
            if (random <= 0)
                return tile;
        }

        console.error("Count not find tile");
    }

    tileIntersectsMap(tileX, tileY, zoom) {
        let bounds = [];
        bounds.push(this.tilePixelToLatLon(tileX, tileY, zoom, 0, 0));
        bounds.push(this.tilePixelToLatLon(tileX, tileY, zoom, 256, 256));
        bounds.push(this.tilePixelToLatLon(tileX, tileY, zoom, 0, 256));
        bounds.push(this.tilePixelToLatLon(tileX, tileY, zoom, 256, 0));
        for (let bound of bounds)
            if (this.map.isInMap(...bound))
                return true;

        let mapsBounds = new google.maps.LatLngBounds({ lat: bounds[2][0], lng: bounds[2][1] }, { lat: bounds[3][0], lng: bounds[3][1] });

        let intersect = false;
        this.map.polygon.getPaths().forEach(path => {
            path.forEach(point => {
                if (mapsBounds.contains(point))
                    intersect = true;
            });
        });

        // Check if map coordinates are in within tile bounds
        return intersect;
    }

    async getSubTiles(x, y, zoom) {
        let startX = x * 2;
        let startY = y * 2;
        let endX = startX + 2;
        let endY = startY + 2;
        zoom++;

        return this.getTilesAtCoordinate(startX, endX, startY, endY, zoom);
    }

    async getTilesAtCoordinate(startX, endX, startY, endY, zoom) {
        return new Promise(resolve => {

            let maxIterations = (endX - startX) * (endY - startY);
            let iteration = 0;
            let results = [];

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    this.getTile(x, y, zoom).then(result => {

                        results.push(result);
                        if (++iteration >= maxIterations) {
                            resolve(results);
                        }

                    });
                }
            }

        });
    }

    tilePixelToLatLon(tileX, tileY, zoom, pixelX, pixelY) {
        tileX += pixelX / 256;
        tileY += pixelY / 256;

        tileX *= 2 ** (8 - zoom);
        tileY *= 2 ** (8 - zoom);

        let lon = tileX / 256 * 360 - 180;
        let n = Math.PI - 2 * Math.PI * tileY / 256;
        let lat = (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));

        return [lat, lon];
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    latLonToTile(latDeg, lonDeg, zoom) {
        let latRad = this.toRadians(latDeg);
        let n = 2.0 ** zoom;
        let xTile = Math.floor((lonDeg + 180.0) / 360.0 * n);
        let yTile = Math.floor((1.0 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2.0 * n);
        return [xTile, yTile];
    }

    async getTile(x, y, zoom) {
        return new Promise(async resolve => {
            let response = await fetch(`https://mts1.googleapis.com/vt?hl=en-US&lyrs=svv|cb_client:apiv3&style=40,18&x=${x}&y=${y}&z=${zoom}`);
            let blob = await response.blob();
            var reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = e => {
                var img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    let hasSv = img.width !== 1;
                    let coverage = this.distribution === distribution.weighted ? this.getTileCoverage(img) : 0;

                    resolve({
                        coverage, hasSv, img, x, y, zoom
                    });
                }
            }
        });
    }

    getTileCoverage(img) {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        let data = context.getImageData(0, 0, img.width, img.height).data;
        let coverage = 0;
        for (let i = 0; i < data.length; i += 4)
            coverage += data[i + 2];
        return coverage;
    }
}

Array.prototype.shuffle = function () {
    var input = this;

    for (var i = input.length - 1; i >= 0; i--) {

        var randomIndex = Math.floor(Math.random() * (i + 1));
        var itemAtIndex = input[randomIndex];

        input[randomIndex] = input[i];
        input[i] = itemAtIndex;
    }
    return input;
}