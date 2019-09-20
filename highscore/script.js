document.addEventListener("DOMContentLoaded", init, false);

rules = {
    default: {
        roundCount: 5,
        moveLimit: -1,
        panAllowed: true,
        timeLimit: -1,
        zoomAllowed: true
    }
};

async function setBackground(map) {
    let response = await fetch("../data/maps.json");
    let maps = await response.json();
    if (map in maps) {
        document.querySelector(".background").style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("../data/thumbnails/${map}.jpg")`;
    } else {
        response = await fetch("../data/flag-names.json");
        let flagNames = await response.json();
        let flagCode = flagNames[map];

        console.log(flagNames, map, flagCode);

        document.querySelector(".background").style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("../data/thumbnails/flags/${flagCode.toLowerCase()}.svg")`;
    }
}

function nicify(name) {
    return name.split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
}

async function init() {
    let map = decodeURI(location.hash.substring(1));
    window.addEventListener("hashchange", () => {
        location.reload();
    });
    if (map === "")
        map = "world";

    let niceMap = nicify(map);

    document.querySelector(".map-name").innerText = niceMap;
    document.querySelector(".play-map").href = "../play/#" + map;

    scores = new Scores();
    setBackground(map);

    let localScoreElement = document.querySelector(".local-high-score");
    let localScores = scores.getLocalHighScores(map, rules.default);
    if (localScores.length === 0) {
        localScoreElement.innerText = `You don"t have any scores on "${niceMap}" yet`;
    } else {
        displayScores(localScoreElement, localScores);
    }

    let globalScoreElement = document.querySelector(".global-high-score");
    let globalHighScores = await scores.getGlobalHighScores(map, rules.default);
    if (globalHighScores.length === 0) {
        globalScoreElement.innerText = `There are no scores on "${niceMap}" yet`;
    } else {
        displayScores(globalScoreElement, globalHighScores);
    }

    allScores = [...globalHighScores, ...localScores];

    document.body.addEventListener("click", deselectScore);
}

function deselectScore() {
    let scoreElements = document.querySelectorAll(".score");
    for (let scoreElement of scoreElements) {
        scoreElement.removeAttribute("active");
    }
}

function showScore(e) {
    e.stopPropagation();
    deselectScore();
    e.target.setAttribute("active", "");
}

let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function msToTime(s) {
    // Pad to 2 or 3 digits, default is 2
    const pad = (n, z = 2) => ('00' + n).slice(-z);
    return pad(s / 3.6e6 | 0) + ':' + pad((s % 3.6e6) / 6e4 | 0) + ':' + pad((s % 6e4) / 1000 | 0) + '.' + pad(s % 1000, 3);
}

function displayScores(element, scores) {
    let html = "";
    for (let score of scores) {
        // New date has to be called because some records are in number format instead of date format, localStorage records are stored as string
        let date = new Date(score.date);
        html += `
            <li class="score" onclick="showScore(event)">
                <div class="user">${score.user}</div>
                <div class="total-score">${score.totalScore}</div>
                <div class="score-date">${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}</div>
                <div class="hidden">
                    ${score.hasOwnProperty('time') ? `<p class="score-date">Time taken: ${msToTime(score.time)}<p>` : ''}
                    <h4>Round scores</h4>
                    <ol class="individual-scores">
                        ${score.individualScores.map(s => `<li>${s}</li>`).join("")}
                    </ol>
                    <div class="rules">
                        <h4>Game rules</h4>
                        <p>Rounds: ${score.rules.roundCount}</p>
                        <p>Time limit: ${score.rules.timeLimit === -1 ? "∞" : score.rules.timeLimit}<p>
                        <p>Move limit: ${score.rules.moveLimit === -1 ? "∞" : score.rules.moveLimit}<p>
                        <p>Zoom: ${score.rules.zoomAllowed ? "allowed" : "restricted"}<p>
                        <p>Panning: ${score.rules.panAllowed ? "allowed" : "restricted"}<p>
                    </div>
                </div>
            </li>
        `;
    }
    element.innerHTML = html;
}