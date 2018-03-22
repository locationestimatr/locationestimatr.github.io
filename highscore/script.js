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

async function init() {
    let map = decodeURI(location.hash.substring(1));
    window.addEventListener('hashchange', () => {
        location.reload();
    });
    if (map === '')
        map = 'world';

    scores = new Scores();

    let localScoreElement = document.querySelector('.local-high-score');
    let localScores = scores.getLocalHighScores(map, rules.default);
    if (localScores.length === 0) {
        localScoreElement.innerText = `You don't have any scores on "${map}" yet`;
    } else {
        displayScores(localScoreElement, localScores);
    }

    let globalScoreElement = document.querySelector('.global-high-score');
    let globalHighScores = await scores.getGlobalHighScores(map, rules.default);
    displayScores(globalScoreElement, globalHighScores);

    allScores = [...globalHighScores, ...localScores];

    document.body.addEventListener('click', deselectScore);
}

function deselectScore() {
    let scoreElements = document.querySelectorAll('.score');
    for (let scoreElement of scoreElements) {
        scoreElement.querySelector('.rules').style.display = 'none';
    }
}

function showScore(e) {
    e.stopPropagation();
    deselectScore();
    e.target.querySelector('.rules').style.display = 'block';
}

function displayScores(element, scores) {
    let html = '';
    for (let score of scores) {
        html += `
            <li class="score" onclick="showScore(event)">
                <div class="user">${score.user}</div>
                <div class="total-score">${score.totalScore}</div>
                <div class="rules">${JSON.stringify(score.rules)}</div>
            </li>
        `;
    }
    element.innerHTML = html;
}