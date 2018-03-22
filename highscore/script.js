document.addEventListener('DOMContentLoaded', init, false);

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
    let response = await fetch('../data/maps.json');
    let maps = await response.json();
    if (map in maps) {
        document.querySelector('.background').style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('../data/thumbnails/${map}.jpg')`;
    } else {
        response = await fetch('../data/flag-names.json');
        let flagNames = await response.json();
        let flagCode = flagNames[map];

        console.log(flagNames, map, flagCode);

        document.querySelector('.background').style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('../data/thumbnails/flags/${flagCode.toLowerCase()}.svg')`;
    }
}

function nicify(name) {
    return name.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

async function init() {
    let map = decodeURI(location.hash.substring(1));
    window.addEventListener('hashchange', () => {
        location.reload();
    });
    if (map === '')
        map = 'world';

    let niceMap = nicify(map);

    document.querySelector('.map-name').innerText = niceMap;
    document.querySelector('.play-map').href = '../play/#' + map;

    scores = new Scores();
    setBackground(map);

    let localScoreElement = document.querySelector('.local-high-score');
    let localScores = scores.getLocalHighScores(map, rules.default);
    if (localScores.length === 0) {
        localScoreElement.innerText = `You don't have any scores on "${niceMap}" yet`;
    } else {
        displayScores(localScoreElement, localScores);
    }

    let globalScoreElement = document.querySelector('.global-high-score');
    let globalHighScores = await scores.getGlobalHighScores(map, rules.default);
    if (globalHighScores.length === 0) {
        globalScoreElement.innerText = `There are no scores on "${niceMap}" yet`;
    } else {
        displayScores(globalScoreElement, globalHighScores);
    }

    allScores = [...globalHighScores, ...localScores];

    document.body.addEventListener('click', deselectScore);
}

function deselectScore() {
    let scoreElements = document.querySelectorAll('.score');
    for (let scoreElement of scoreElements) {
        scoreElement.querySelector('.hidden').style.display = 'none';
    }
}

function showScore(e) {
    e.stopPropagation();
    deselectScore();
    e.target.querySelector('.hidden').style.display = 'block';
}

function displayScores(element, scores) {
    let html = '';
    for (let score of scores) {
        html += `
            <li class="score" onclick="showScore(event)">
                <div class="user">${score.user}</div>
                <div class="total-score">${score.totalScore}</div>
                <div class="hidden">
                    <div class="individual-scores">${JSON.stringify(score.individualScores)}</div>
                    <div class="rules">${JSON.stringify(score.rules)}</div>
                </div>
            </li>
        `;
    }
    element.innerHTML = html;
}