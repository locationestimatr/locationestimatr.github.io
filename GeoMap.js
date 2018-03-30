class GeoMap {
    constructor(polygon, minimumDistanceForPoints, name) {
        console.log(minimumDistanceForPoints);
        this.minimumDistanceForPoints = minimumDistanceForPoints;
        this.maxScore = 5000;
        this.name = name;

        this.polygon = polygon;
    }

    getBounds() {
        const bounds = new google.maps.LatLngBounds();
        this.polygon.getPaths().forEach(path => {
            path.forEach(pos => {
                bounds.extend(pos);
            });
        });
        return bounds;
    }

    isInMap(lat, lon) {
        return google.maps.geometry.poly.containsLocation({lat: () => lat, lng: () => lon}, this.polygon);
    }

    scoreCalculation(distance) {
        if(distance < 7.5)
            return 5000;

        let score = (this.minimumDistanceForPoints - distance) / (this.minimumDistanceForPoints / this.maxScore);
        let scoreDifficulty = 2;

        console.log("1", score);

        if (score < 0)
            return 0;

        score = score ** scoreDifficulty / this.maxScore ** (scoreDifficulty - 1);

        console.log("2", score);

        score = Math.max(0, score);
        score = Math.min(this.maxScore, score);
        console.log("3", score);
        return Math.round(score);
    }
}