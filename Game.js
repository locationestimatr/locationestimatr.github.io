class Game {
    constructor(map, element, rules = {
        roundCount: 5,
        moveLimit: -1,
        panAllowed: true,
        timeLimit: -1,
        zoomAllowed: true
    }) {
        if (localStorage.user !== undefined)
            element.querySelector(".username-input").value = localStorage.user;

        if (map.name === "my_area")
            element.querySelector(".high-score-form").style.display = "none";

        this.ezMode = false;

        this.distribution = distribution.weighted;
        this.element = element;
        this.svElement = new StreetviewElement(element.querySelector(".streetview"), element.querySelector(".return-home"));

        this.scoreElement = element.querySelector(".total-score");
        this.timeElement = element.querySelector(".time-left");
        this.movesElement = element.querySelector(".moves-left");
        this.roundElement = element.querySelector(".round");

        this.scores = new Scores();

        this.googleMap = new google.maps.Map(element.querySelector(".map-element"), {
            zoom: 0,
            center: {lat: 0, lng: 0},
            disableDefaultUI: true,
            clickableIcons: false,
            backgroundColor: "#aadaff",
            fullscreenControl: false,
        });
        this.attachMap(".embed-map");
        google.maps.event.addListener(this.googleMap, "click", e => {
            if (this.googleMap.getDiv().parentElement.attributes.class.value === "embed-map")
                this.placeGuessMarker(e.latLng);
        });

        // this.googleMap = new google.maps.Map(element.querySelector(".overview-map"), {
        //     zoom: 2,
        //     center: { lat: 0, lng: 0 },
        //     disableDefaultUI: true,
        //     clickableIcons: false,
        //     backgroundColor: "#aadaff",
        //     fullscreenControl: false,
        // });

        this.setResizeEventListeners();

        this.newGame(map, rules);

        this.ready = false;
        this.once("nextRound", () => {
            this.ready = true;
        });
    }

    async uploadScore(e) {
        if (e) e.preventDefault();

        console.log(this);

        let username = this.element.querySelector(".username-input").value;
        if (this.latestScore) {
            this.latestScore.user = username;
            console.log("settings locastorage user to ", username);
            localStorage.user = username;
            this.scores.addLocal(this.latestScore);
            await this.scores.addGlobal(this.latestScore);
        }

        // console.log("redirect now");
        location.href = "../highscore/#" + this.map.name;
    }

    async logHighScores() {
        let scores = await this.scores.getGlobalHighScores(this.map.name, this.rules);
        console.log(scores);
    }

    setRules(e) {
        console.log("set rules called", this.ready);
        if (e) e.preventDefault();
        if (!this.ready) {
            this.once("nextRound", () => setTimeout(() => this.setRules(), 5));
            return;
        }

        this.hideGameRuleSelection();
        this.startTime = performance.now();

        let form = game.element.querySelector("form");
        let [roundCount, timeLimit, moveLimit, ...restrictions] = [...new FormData(form)].map(n => n[1]);
        let rules = {roundCount: +roundCount, timeLimit: +timeLimit, moveLimit: +moveLimit};
        rules.panAllowed = restrictions.includes("pan");
        rules.zoomAllowed = restrictions.includes("zoom");
        console.log(rules);
        this.rules = rules;

        setTimeout(() => this.applyRules(), 300);
    }

    resetRestrictions() {
        this.svElement.resetRestrictions();
        this.timeElement.style.display = "none";
        this.movesElement.style.display = "none";
    }

    applyRules() {
        this.roundElement.innerHTML = `Round: <b>${this.currentRound}/${this.rules.roundCount}</b>`;

        if (!this.rules.panAllowed)
            this.svElement.restrictPan();

        if (!this.rules.zoomAllowed)
            this.svElement.restrictZoom();

        if (this.rules.moveLimit !== -1)
            this.svElement.setMoveLimit(this.rules.moveLimit, this.movesElement);

        if (this.rules.timeLimit !== -1)
            this.startTimer(+this.rules.timeLimit);
    }

    startTimer(seconds) {
        if (this.timerRunning)
            return;
        this.timeElement.style.display = "inline-block";
        this.timerRunning = true;
        this.timeElement.innerHTML = `Time: <b>${seconds}</b>`;
        this.timeInterval = setInterval(() => {
            seconds -= 0.1;
            this.timeElement.innerHTML = `Time: <b>${seconds < 10 ? (Math.round(seconds * 10) / 10).toFixed(1) : Math.round(seconds)}</b>`;
        }, 100);
        this.timeTimeout = setTimeout(() => {
            this.makeGuess({lat: 0, lng: 0});
            clearInterval(this.timeInterval);
            this.timerRunning = false;
        }, seconds * 1000);
    }

    endTimer() {
        clearTimeout(this.timeTimeout);
        clearInterval(this.timeInterval);
        this.timerRunning = false;
    }

    hideGameRuleSelection() {
        let element = document.querySelector(".gamerule-selector");
        element.style.transform = `translateY(-${element.offsetHeight}px)`;
    }

    attachMap(selector) {
        let mapElement = this.googleMap.getDiv();
        mapElement.remove();
        this.element.querySelector(selector).appendChild(mapElement);
    }

    toggleMapOverlay() {
        if (this.map.polygon.getMap())
            this.map.polygon.setMap(null);
        else
            this.map.polygon.setMap(this.googleMap);
    }

    setResizeEventListeners() {
        let resizeElement = this.element.querySelector(".guess-map-resizer");
        let resizerDown = false;
        let guessMap = this.element.querySelector(".guess-map");

        let onMove = (x, y) => {
            if (resizerDown) {
                let height = window.innerHeight - y - this.element.offsetTop;
                let width = x - this.element.offsetLeft;
                guessMap.style.height = height + "px";
                guessMap.style.width = width + "px";
            }
        };
        let onDown = () => {
            resizerDown = true;
        };
        let onUp = () => {
            resizerDown = false;
        };

        resizeElement.addEventListener("mousedown", () => onDown());
        document.addEventListener("mousemove", e => onMove(e.pageX, e.pageY));
        document.addEventListener("mouseup", () => onUp());

        resizeElement.addEventListener("touchstart", () => onDown());
        document.addEventListener("touchmove", e => onMove(e.touches[0].pageX, e.touches[0].pageY));
        document.addEventListener("touchend", () => onUp());
    }

    newGame(map = false, rules = false) {
        if (this.overviewLines)
            this.removeOverviewLines();

        if (rules !== false) {
            this.rules = rules;
        }

        if (map !== false) {
            this.map = map;
            this.streetview = new Streetview(map, this.distribution);
        }

        this.zoom = map.minimumDistanceForPoints < 3000 ? 18 : 14;
        this.currentRound = 0;
        this.events = {};
        this.overviewLines = [];
        this.previousGuesses = [];

        this.preloadNextMap();
        this.nextRound();
    }

    playAgain() {
        let button = this.element.querySelector(".play-again-button");
        button.innerText = "Loading...";
        this.newGame();
        this.once("nextRound", () => {
            let overviewElement = this.element.querySelector(".guess-overview");
            overviewElement.style.transform = "translateY(-100%)";
            setTimeout(() => {
                button.innerText = "Play Again";
                this.applyRules();
            }, 300);
        });
    }

    showOverview(guess, actual) {
        this.attachMap(".overview-map");

        let distance = this.measureDistance(guess, actual);
        let niceDistance = this.formatDistance(distance);
        let score = this.map.scoreCalculation(distance);

        this.previousGuesses.push({
            guess, actual, score
        });

        let totalScore = this.previousGuesses.map(result => result.score).reduce((a, b) => a + b);

        this.scoreElement.innerHTML = `Score: <b>${totalScore}</b>`;

        return [score, niceDistance, totalScore];
    }

    showRoundOverview(guess, actual) {
        let [score, niceDistance] = this.showOverview(guess, actual);

        let overviewElement = this.element.querySelector(".guess-overview");
        overviewElement.style.transform = "translateY(0%)";
        overviewElement.querySelector(".next-round-button").style.display = "inline-block";
        overviewElement.querySelector(".game-end-buttons").style.display = "none";

        let [meterElement, scoreElement] = overviewElement.querySelectorAll(".score-text p");
        meterElement.innerText = `Your guess is ${niceDistance} removed from your start location`;
        if (score === 1)
            scoreElement.innerText = `You scored a point`;
        else
            scoreElement.innerText = `You scored ${score} points`;

        this.fitMap([guess, actual]);
        setTimeout(() => {
            overviewElement.querySelector(".score-progress").style.width = (score / this.map.maxScore * 100) + "%";
            this.addOverviewLine(guess, actual, 600);
        }, 300);
    }

    showGameOverview(guess, actual) {
        let [score, niceDistance, totalScore] = this.showOverview(guess, actual);

        let overviewElement = this.element.querySelector(".guess-overview");
        overviewElement.style.transform = "translateY(0%)";
        overviewElement.querySelector(".next-round-button").style.display = "none";
        overviewElement.querySelector(".game-end-buttons").style.display = "block";

        let maxScore = this.map.maxScore * this.rules.roundCount;

        let [meterElement, scoreElement] = overviewElement.querySelectorAll(".score-text p");
        meterElement.innerText = `Your latest guess is ${niceDistance} removed from your start location`;
        if (score === 1)
            scoreElement.innerText = `You scored a point, which brings your total score to ${totalScore} points`;
        else
            scoreElement.innerText = `You scored ${score} points, which brings your total score to ${totalScore} points`;

        let locations = this.previousGuesses.map(result => result.guess).concat(this.previousGuesses.map(result => result.actual));
        this.fitMap(locations);

        this.latestScore = {
            totalScore,
            map: this.map.name,
            rules: this.rules,
            individualScores: this.previousGuesses.map(guess => guess.score),
            date: new Date(),
            time: performance.now() - this.startTime
        };

        setTimeout(() => {
            overviewElement.querySelector(".score-progress").style.width = (totalScore / maxScore * 100) + "%";
            for (let result of this.previousGuesses)
                this.addOverviewLine(result.guess, result.actual, 600);
        }, 300);
    }

    fitMapToGeoMap() {
        this.googleMap.fitBounds(this.map.getBounds());
    }

    fitMap(positions) {
        let bounds = new google.maps.LatLngBounds();
        for (let location of positions) {
            bounds.extend({
                lat: location[0],
                lng: location[1]
            });
        }
        this.googleMap.fitBounds(bounds);
    }

    nextRoundButton() {
        let button = this.element.querySelector(".next-round-button");
        button.innerText = "Loading...";

        this.once("nextRound", () => {
            let overviewElement = this.element.querySelector(".guess-overview");
            overviewElement.style.transform = "translateY(-100%)";

            setTimeout(() => {
                button.innerText = "Next Round";
                if (this.svElement.panorama) {
                    this.svElement.panorama.setZoom(0);
                    this.applyRules();
                }
            }, 300);
        })
        this.nextRound();
    }

    nextRound() {
        // Check if next destination is loaded
        if (!this.mapLoaded) {
            this.once("preload", () => this.nextRound());
            return;
        }

        if (this.svElement.panorama)
            this.resetRestrictions();
        this.currentDestination = this.nextDestination;
        this.disableGuessButton();
        // this.fitMapToGeoMap();

        if (++this.currentRound < this.rules.roundCount)
            this.preloadNextMap();

        this.roundElement.innerHTML = `Round: <b>${this.currentRound}/${this.rules.roundCount}</b>`;


        setTimeout(() => {
            this.timeElement.style.display = "none";
            this.movesElement.style.display = "none";
            this.currentDestination = this.svElement.getLocation();
            this.fire("nextRound");
            this.removeOverviewLines();
            this.attachMap(".embed-map");
            this.fitMapToGeoMap();
        }, 500);
        this.svElement.setLocation(...this.currentDestination);
    }

    removeOverviewLines() {
        for (let lineData of this.overviewLines) {
            lineData.line.setMap(null);
            lineData.guess.setMap(null);
            lineData.actual.setMap(null);
        }
    }

    addOverviewLine(guess, actual, animationTime = 1500) {
        guess = {lat: guess[0], lng: guess[1]};
        actual = {lat: actual[0], lng: actual[1]};

        let lineData = {};
        this.overviewLines.push(lineData);

        lineData.line = new google.maps.Polyline({
            path: [guess, guess],
            geodesic: true,
            strokeColor: "red",
            strokeOpacity: 0.8,
            strokeWeight: 3,
            map: this.googleMap
        });

        let dropTime = 250;
        let fps = 30;
        let steps = fps * (animationTime / 1000);
        let step = 0;
        let deltaLat = guess.lat - actual.lat;
        let deltaLng = guess.lng - actual.lng;

        lineData.guess = new google.maps.Marker({
            position: guess,
            map: this.googleMap,
            animation: google.maps.Animation.DROP,
            title: "Your guess",
        });

        setTimeout(() => {
            let interval = self.setInterval(() => {
                if (step++ >= steps) {
                    clearInterval(interval);
                    lineData.line.setPath([guess, actual]);
                    return;
                }

                lineData.line.setPath([
                    guess,
                    {
                        lat: guess.lat - deltaLat * (step / steps),
                        lng: guess.lng - deltaLng * (step / steps),
                    }
                ]);
            }, 1000 / fps);
        }, dropTime);

        setTimeout(() => {
            lineData.actual = new google.maps.Marker({
                position: actual,
                animation: google.maps.Animation.DROP,
                icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                title: "Actual location",
            });
            lineData.actual.setMap(this.googleMap);
        }, animationTime);
    }

    disableGuessButton() {
        let button = this.element.querySelector(".guess-button");
        button.style.pointerEvents = "none";
        button.style.filter = "grayscale(90%)";
    }

    enableGuessButton() {
        let button = this.element.querySelector(".guess-button");
        button.style.pointerEvents = "all";
        button.style.filter = "grayscale(0%)";
    }

    measureDistance(from, to) {
        return google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(...from), new google.maps.LatLng(...to));
    }

    makeGuess() {
        if (this.marker === undefined || this.marker.getMap() === null)
            this.placeGuessMarker({lat: 0, lng: 0});
        this.marker.setMap(null);
        this.endTimer();

        let guessLocation = [this.marker.position.lat(), this.marker.position.lng()];

        let locationToGuess = this.ezMode ? this.svElement.getLocation() : this.currentDestination;
        if (this.currentRound === this.rules.roundCount) {
            this.showGameOverview(guessLocation, locationToGuess);
        } else {
            this.showRoundOverview(guessLocation, locationToGuess);
        }
    }

    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.floor(meters * 10) / 10} m`;
        }
        if (meters < 20000) {
            return `${Math.floor(meters / 100) / 10} km`;
        }
        return `${Math.floor(meters / 1000)} km`;
    }

    placeGuessMarker(location) {
        if (this.marker !== undefined) {
            this.marker.setMap(null);
        }

        this.marker = new google.maps.Marker({
            position: location,
            map: this.googleMap
        });
        this.enableGuessButton();
    }

    returnHome() {
        this.svElement.setLocation(...this.currentDestination);
    }

    preloadNextMap() {
        this.mapLoaded = false;
        this.streetview.randomValidLocation(this.zoom).then(next => {
            this.nextDestination = next;
            this.mapLoaded = true;
            this.fire("preload");
        });
    }

    fire(event) {
        if (this.events[event]) {
            for (let i = this.events[event].length - 1; i >= 0; i--) {
                this.events[event][i]();
            }
        }
    }

    once(event, callback) {
        let onceCallback = () => {
            callback();
            this.off(event, onceCallback);
        }
        this.on(event, onceCallback);
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (event in this.events) {
            this.events[event].splice(this.events[event].indexOf(callback), 1);
        } else {
            console.warn(`Trying to remove ${event} event, but it does not exist`);
        }
    }
}