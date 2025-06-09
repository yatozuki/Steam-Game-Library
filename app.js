import express from 'express';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import {
    fileURLToPath
} from 'url';

const app = express();
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const myCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 2000
});

const Delay_MS = 200;
const perPage = 20;

const steam_API = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
const steam_API_details = 'https://store.steampowered.com/api/appdetails?appids=';

const log = console.log;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

let gameAppId = [];
let actualGames = [];
let dlcGames = [];
let ignoreID = [];

let actualSet = new Set();
let dlcSet = new Set();
let ignoreSet = new Set();

function loadData() {
    try {
        if (fs.existsSync('./data/Game_IDs.json')) {
            actualGames = JSON.parse(fs.readFileSync('./data/Game_IDs.json', 'utf-8'));
            actualGames.forEach(id => actualSet.add(id));

        }

        if (fs.existsSync('./data/DLC_IDs.json')) {
            dlcGames = JSON.parse(fs.readFileSync('./data/DLC_IDs.json', 'utf-8'));
            dlcGames.forEach(id => dlcSet.add(id));
        }

        if (fs.existsSync('./data/ignore_IDs.json')) {
            ignoreID = JSON.parse(fs.readFileSync('./data/ignore_IDs.json', 'utf-8'));
            ignoreID.forEach(id => ignoreSet.add(id));
        }

    } catch (error) {
        log(chalk.red('Error loading progress:', error.message));
    }
}

function saveData() {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data');
        }

        actualGames = [...new Set(actualGames)];
        dlcGames = [...new Set(dlcGames)];
        ignoreID = [...new Set(ignoreID)];

        fs.writeFileSync('./data/Game_IDs.json', JSON.stringify(actualGames, null, 2));

        fs.writeFileSync('./data/DLC_IDs.json', JSON.stringify(dlcGames, null, 2));

        fs.writeFileSync('./data/ignore_IDs.json', JSON.stringify(ignoreID, null, 2));

        log(`Total: ${actualGames.length + dlcGames.length + ignoreID.length}`)

    } catch (error) {
        log(chalk.red('Error saving progress:', error.message));
    }
}

async function initialize() {
    try {
        const cachedIDs = myCache.get(`all_game_ids`);
        if (cachedIDs) {
            gameAppId = cachedIDs;
            log(`Loaded (Cached): ${gameAppId.length} Game IDs`);
            return;
        }

        if (gameAppId.length === 0) {
            const response = await axios.get(steam_API);
            gameAppId = response.data.applist.apps.map(game => game.appid);
            myCache.set(`all_game_ids`, gameAppId, 86400);
            // log(`Loaded ${gameAppId.length} Game IDs`);
        }

        loadData();

    } catch (error) {
        log('Failed to load game IDs', error.message);
    }
};

async function gameFilter(page, perPage) {
    let startIdx = (page - 1) * perPage;
    log(startIdx)
    let validIDs = [];


    while (validIDs.length < perPage) {
        if (startIdx < actualGames.length) {
            const appID = actualGames[startIdx];
            startIdx++;

            await new Promise(resolve => setTimeout(resolve, Delay_MS));

            if (ignoreSet.has(appID) || dlcSet.has(appID)) {
                continue;
            }

            const gameCached = myCache.get(`game_${appID}`);

            if (gameCached) {
                validIDs.push(gameCached.data);
                continue;
            }

            try {
                const response = await axios.get(steam_API_details + appID);
                const result = response.data[appID];
                const gameData = result.data;

                if (actualSet.has(appID)) {
                    myCache.set(`game_${appID}`, {
                        data: gameData
                    }, 3600);
                    validIDs.push(gameData);
                    log(chalk.green(`Game AH: ${appID}`));
                    continue;
                }

                if (dlcGames.includes(appID)) {
                    myCache.set(`dlc_${appID}`, {
                        data: gameData
                    }, 3600);
                    // validIDs.push(gameData);
                    log(chalk.blue(`DLC AH: ${appID}`));
                    continue;
                }

            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
            }

        } else if (startIdx < gameAppId.length) {
            const appID = gameAppId[startIdx];
            startIdx++;

            await new Promise(resolve => setTimeout(resolve, Delay_MS));

            if (ignoreSet.has(appID) || dlcSet.has(appID)) {
                continue;
            }

            const gameCached = myCache.get(`game_${appID}`);

            if (gameCached) {
                validIDs.push(gameCached.data);
                continue;
            }

            try {
                const response = await axios.get(steam_API_details + appID);
                const result = response.data[appID];
                const gameData = result.data;

                if (!result.success) {
                    myCache.set(`ignore_${appID}`, 3600);
                    ignoreID.push(appID);
                    ignoreSet.add(appID);
                    log(chalk.bgRed(`Ignore ID: ${appID}`));
                    continue;
                }
                if (gameData.type === 'dlc') {
                    myCache.set(`dlc_${appID}`, {
                        data: gameData
                    }, 3600);
                    // validIDs.push(gameData);
                    dlcGames.push(appID);
                    dlcSet.add(appID);
                    log(chalk.bgBlue(`DLC: ${dlcGames.length}`));
                    continue;
                }

                if (gameData.type === 'game') {
                    myCache.set(`game_${appID}`, {
                        data: gameData
                    }, 3600);
                    validIDs.push(gameData);
                    actualGames.push(appID);
                    actualSet.add(appID);
                    log(chalk.bgGreen(`Games: ${actualGames.length}`));
                    continue;
                }
            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
            }
        }
    }
    log(`Valid ID: ${validIDs.length}`)
    return validIDs.slice(0, perPage);
};

app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const games = await gameFilter(page, perPage);
        const totalPages = Math.ceil(gameAppId.length / perPage);

        const hasPrevious = page > 1;
        const hasNext = page < totalPages;

        // log(chalk.green('Current Game Ids: ') + chalk.yellow(actualGames));

        const searchQuery = req.query.q?.trim().toLowerCase() || '';

        res.render('home', {
            query: searchQuery,
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

async function searchFilter(query) {
    const results = [];
    let count = 0;
    const maxSearch = 3;
    
    for (const appID of gameAppId) {
        if (count >= maxSearch) break;
        
        try {
            const cached = myCache.get(`game_${appID}`);
            if (cached) continue;
            
            const response = await axios.get(steam_API_details + appID);
            const result = response.data[appID];
            
            if (result?.success && result.data?.type === 'game') {
                const gameData = result.data;
                if (gameData.name.toLowerCase().includes(query)) {
                    results.push(gameData);
                }
                myCache.set(`game_${appID}`, { data: gameData }, 3600);
            }
            count++;
        } catch (error) {
            log(chalk.yellow(`Search error for ${appID}:`, error.message));
        }
    }
    
    return results;
}

app.get('/search', async (req, res) => {
    try {
        const cachedResults = [];

        const page = parseInt(req.query.page) || 1;
        const totalPages = Math.ceil(cachedResults.length / perPage);

        const hasPrevious = page > 1;
        const hasNext = page < totalPages;

        const searchQuery = req.query.q?.trim().toLowerCase() || '';

        if (!searchQuery || searchQuery.length < 3) {
            return res.render('search', {
                results: [],
                query: searchQuery,
                message: 'Please enter at least 3 characters'
            });
        }

        for (const appID of gameAppId) {
            const cached = myCache.get(`game_${appID}`);
            if (cached) {
                if (cached.data.name.toLowerCase().includes(searchQuery)) {
                    cachedResults.push(cached.data);
                }
            }
        }

        if (cachedResults.length < 10) {
            const searchResults = await searchFilter(searchQuery);
            cachedResults.push(...searchResults);
        }

        res.render('search', {
            results: cachedResults.slice(0, perPage),
            query: searchQuery,
            currentPage: page,
            totalPages: totalPages,
            hasPrevious: hasPrevious,
            hasNext: hasNext
        });

    } catch (error) {
        log(chalk.bgRed('Search error', error.message));
        res.render('error', {
            message: 'Search failed',
            error: error.message
        });
    }

});

app.get('/game/:id', async (req, res) => {
    res.render('detail')
});

app.get('/dev-tool', (req, res) => {
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

function cleanExit() {
    log(chalk.yellow('\nSaving final progress before shutdown...'));
    saveData();
    process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

async function serverStartup() {
    try {
        log(chalk.bgYellow.bold('\n Please wait while server is loading... '));

        await initialize();

        app.listen(port, () => {
            log(chalk.green.bold("\n==============================="));

            log(chalk.green('Server is running on PORT:'), port);

            log(chalk.green.bold("==============================="));

            log(chalk.green('Total Game Ids: ') + chalk.yellow.bold(gameAppId.length));

            log(chalk.green('Current Game Ids: ') + chalk.yellow(actualGames.length));

            log(chalk.green('Current DLC Ids: ') + chalk.yellow(dlcGames.length));

            log(chalk.green.bold("============== ") + chalk.red.bold('x') + chalk.green.bold(" ==============\n"));
        })

    } catch (error) {
        console.error("Failed to load game IDs:", error);
    }
}

serverStartup();