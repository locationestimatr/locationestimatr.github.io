class Scores {
    constructor(key = "scores") {
        this.key = key;
        this.localScores = [];

        if (localStorage.getItem(key) === null) {
            this.saveLocal(this.localScores);
        }
        else {
            this.localScores = this.updateLocal();
        }

        this.db = firebase.firestore();
    }

    async getGlobalHighScores(map, rules, n = 20) {
        let records = await this.db
            .collection("scores")
            .where("map", "==", map)
            // .where("rules", "==", rules)
            .orderBy("totalScore", "desc")
            // .orderBy("time")
            .limit(n)
            .get();

        let results = [];
        records.forEach(record => {
            results.push(record.data());
        });
        return results;
    }

    getLocalHighScores(map, rules, n = 10) {
        return this.localScores
        // .filter(score => this.equals(score, rules))
            .filter(score => score.map === map)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, n);
    }

    equals(objectA, objectB) {
        for (let key in objectA) {
            if (objectB.hasOwnProperty(key) && objectA[key] !== objectB[key])
                return false
        }
        return true;
    }

    saveLocal(object = this.localScores) {
        localStorage[this.key] = JSON.stringify(object);
    }

    addLocal(score) {
        this.localScores.push(score);
        this.saveLocal();
    }

    addGlobal(score) {
        return this.db.collection("scores").add(score);
    }

    getLocalScores() {
        return this.localScores;
    }

    updateLocal() {
        return JSON.parse(localStorage[this.key]);
    }
}