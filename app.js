import express from 'express';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';
import chalk from 'chalk';

const app = express();
const port = process.env.PORT || 3000;
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 2000 });

const steam_API = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
const steam_API_details = 'https://store.steampowered.com/api/appdetails?appids=';

const log = console.log;

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(compression());

let gameAppId = [];
let actualGames = [];
let dlcGames = [];
let ignoreID = [];

async function loadGameIDs() {
    try {
        const cachedIDs = myCache.get(`all_game_ids`);
        if (cachedIDs) {
            gameAppId = cachedIDs;
            log(`Loaded (Cached): ${gameAppId.length} Game IDs`);
            return;
        }

        const response = await axios.get(steam_API);
        gameAppId = response.data.applist.apps.map(game => game.appid);
        myCache.set(`all_game_ids`, gameAppId, 86400);
        // log(`Loaded ${gameAppId.length} Game IDs`);
    } catch (error) {
        log('Failed to load game IDs', error.message); 
    }
};

async function idFilter(page, perPage) {
    const startIdx = (page - 1) * perPage;
    let currentIdx = startIdx;
    const validIDs = [];
    let attempts = 0;
    const maxAttempts = perPage * 5;

    while (validIDs.length < perPage && attempts < maxAttempts && currentIdx < gameAppId.length) {
        attempts++;
        const appID = gameAppId[currentIdx];
        currentIdx++;

        try {
            const gameCached = myCache.get(`game_${appID}`);
            const dlcCached = myCache.get(`dlc_${appID}`);
            const ignoreIdCached = myCache.get(`ignore_${appID}`);
            if (gameCached) {
                validIDs.push(gameCached.data);
                continue;
            }

            if (dlcCached) {
                validIDs.push(dlcCached.data);
                continue;
            }

            if (ignoreIdCached) {
                ignoreID.push(ignoreIdCached); 
                continue;
            }

            const response = await axios.get(steam_API_details + appID);
            const result = response.data[appID];
            const gameData = result.data;

            if (!result.success) {
                myCache.set(`ignore_${appID}`, 3600);
                ignoreID.push(appID);
                log(chalk.bgRed(`Ignore ID: ${appID}`));

            } else if (result.data.type === 'dlc') {
                myCache.set(`dlc${gameAppId}`, {data: gameData} , 3600);
                validIDs.push(gameData);
                dlcGames.push(appID);
                log(chalk.bgBlue(`DLC: ${dlcGames.length}`));
                continue;
            } else {
                myCache.set(`game_${appID}`, {data: gameData}, 3600);
                validIDs.push(gameData);
                actualGames.push(appID);
                log(chalk.bgGreen(`Games: ${actualGames.length}`));
            }

        } catch (error) {
            log(`Error processing ${appID}:`, error.message);
            myCache.set(`game_${appID}`, {valid: false}, 3600);
        }

    }

    return validIDs.slice(0, perPage);
};

app.get('/', async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 20;
        const games = await idFilter(page, perPage);
        const totalPages = Math.ceil(gameAppId.length / perPage);

        const hasPrevious = page > 1;
        const hasNext = page < totalPages;

        // log(chalk.green('Current Game Ids: ') + chalk.yellow(actualGames));

        res.render('home', {
            games: games,
            currentPage: page,
            totalPages: totalPages,
            hasPrevious: hasPrevious,
            hasNext: hasNext
        });

    } catch (error) {
        log(chalk.bgRed('Page error', error.message));
        res.render('error', {
            message: 'Sorry, something went wrong',
            error: error.message
        });
    }
});

app.get('/detail', (req, res) => {
    res.render('detail')
});

app.get('/dev-tool-cache', (req, res) => {
    const stats = myCache.getStats();
    res.json({
        keys: myCache.keys(),
        // hits: stats.hits,
        // misses: stats.misses,
        // ksize: stats.ksize,
        // vsize: stats.vsize
        noInfo: ignoreID,
        DLC: dlcGames,
        Games: actualGames,
    });
});


async function serverStartup() {
    try {
        log(chalk.bgYellow.bold('\n Please wait while server is loading... '));
        
        await loadGameIDs();

        app.listen(port, () => {
            log(chalk.green.bold("\n===============================\n"));

            log(chalk.green('Server is running on PORT:'), port);

            log(chalk.green.bold("\n===============================\n"));

            log(chalk.green('Total Game Ids: ') + chalk.yellow.bold(gameAppId.length));

            // log(chalk.green('Current Game Ids: ') + chalk.yellow(actualGames.length));

            // log(chalk.green('Current DLC Ids: ')+ chalk.yellow(dlcGames.length));

            log(chalk.green.bold("\n============== ") + chalk.red.bold('x') + chalk.green.bold(" ==============\n"));
        })

    } catch (error) {
        console.error("Failed to load game IDs:", error);
    }
}

serverStartup();