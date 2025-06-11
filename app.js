import express from 'express';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

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
let detailInfo = [];
let skipID = [];

let actualSet = new Set();
let dlcSet = new Set();
let ignoreSet = new Set();
let detailSet = new Set();
let skipSet = new Set();

let searchIndex = null;
let gameDataMap = {};

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

        if (fs.existsSync('./data/details.json')) {
            detailInfo = JSON.parse(fs.readFileSync('./data/details.json', 'utf-8'));
            detailInfo.forEach(object => detailSet.add(object));
        }

        if (fs.existsSync('./data/skip_IDs.json')) {
            skipID = JSON.parse(fs.readFileSync('./data/skip_IDs.json', 'utf-8'));
            skipSet.forEach(id => skipSet.add(id));
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
        skipID = [...new Set(skipID)];

        const seen = new Set();
        detailInfo = detailInfo.filter(obj => {
            const duplicate = seen.has(obj.steam_appid);
            seen.add(obj.steam_appid);
            return !duplicate;
        });

        fs.writeFileSync('./data/Game_IDs.json', JSON.stringify(actualGames, null, 2));

        fs.writeFileSync('./data/DLC_IDs.json', JSON.stringify(dlcGames, null, 2));

        fs.writeFileSync('./data/ignore_IDs.json', JSON.stringify(ignoreID, null, 2));

        fs.writeFileSync('./data/details.json', JSON.stringify(detailInfo, null, 2));

        fs.writeFileSync('./data/skip_IDs.json', JSON.stringify(skipID, null, 2));

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
    log(startIdx);
    let endIdx = startIdx + perPage;
    let validIDs = [];

    function isDuplicateGame(gameData) {
        const normalizedNewName = gameData.name.toLowerCase().trim();
        return validIDs.some(game => 
            game.steam_appid === gameData.steam_appid || 
            game.name.toLowerCase().trim() === normalizedNewName
        );
    }

      function isOnPreviousPages(gameData) {
        const normalizedName = gameData.name.toLowerCase().trim();
        return detailInfo.some(game => 
            (game.steam_appid === gameData.steam_appid || 
             game.name.toLowerCase().trim() === normalizedName)
        );
    }

    while (validIDs.length < perPage) {
        if (startIdx < actualGames.length) {
            const appID = actualGames[startIdx];
            startIdx++;

            if (ignoreSet.has(appID) || dlcSet.has(appID) || skipSet.has(appID)) continue; 

            // const gameCached = myCache.get(`game_${appID}`);
            
            // if (gameCached) {
            //     if (!isDuplicateGame(gameCached.data)) {
            //         validIDs.push(gameCached.data);
            //         log(chalk.green(`[CACHE] Added game: ${appID}`));
            //     }
            //     continue;
            // }

            const existingDetail = detailInfo.find(game => game.steam_appid === appID);

            if (existingDetail) {             
                // if (isOnPreviousPages(existingDetail)) {
                //     log(chalk.yellow(`Skipping (Previous page): ${existingDetail.name}. ID: ${appID}`));
                //     continue;
                // }

                if (!isDuplicateGame(existingDetail)) {
                    validIDs.push(existingDetail);
                    myCache.set(`game_${appID}`, { data: existingDetail }, 3600);
                    log(chalk.green(`[STORAGE] Loaded existing game: ${appID}`));
                }

                continue;
            }

            try {
                const response = await axios.get(steam_API_details + appID);
                const result = response.data[appID];
                const gameData = result.data;

                if (gameData.type === 'game') {
                    if (isDuplicateGame(gameData)) {
                        skipID.push(appID);
                        skipSet.add(appID);
                        log(chalk.yellow(`Skipping game: ${gameData.name} (ID: ${appID})`));
                        continue;
                    }
                }

                if (actualSet.has(appID)) {
                    myCache.set(`game_${appID}`, { data: gameData }, 3600);

                    if (!detailInfo.some(game => game.steam_appid === appID)) {
                        detailInfo.push(gameData);
                    }

                    validIDs.push(gameData);
                    log(chalk.green(`Game: ${appID}`));

                }

            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
            }

        } else if (startIdx < gameAppId.length) {
            const appID = gameAppId[startIdx];
            startIdx++;

            if (ignoreSet.has(appID) || dlcSet.has(appID) || skipSet.has(appID)) continue; 

            // const gameCached = myCache.get(`game_${appID}`);
            
            // if (gameCached) {
            //     if (!isDuplicateGame(gameCached.data)) {
            //     validIDs.push(gameCached.data);
            //     log(chalk.green(`[CACHE] Added game: ${appID}`));
            //     }
            //     continue;
            // }

            const existingDetail = detailInfo.find(game => game.steam_appid === appID);

            if (existingDetail) {

                if (!isDuplicateGame(existingDetail)) {
                    validIDs.push(existingDetail);
                    myCache.set(`game_${appID}`, { data: existingDetail }, 3600);
                    log(chalk.green(`[STORAGE] Loaded New game: ${appID}`));
                }

                continue;
            }

            try {
                const response = await axios.get(steam_API_details + appID);
                const result = response.data[appID];
                const gameData = result.data;

                if (!result.success) {
                    ignoreID.push(appID);
                    ignoreSet.add(appID);
                    log(chalk.bgRed(`Ignore ID: ${appID}`));
                    continue;
                }

                if (gameData.type === 'dlc') {
                    dlcGames.push(appID);
                    dlcSet.add(appID);
                    log(chalk.bgBlue(`DLC: ${dlcGames.length}`));
                    continue;
                }

                if (gameData.type === 'game') {
                    if (isDuplicateGame(gameData)) {
                        skipID.push(appID);
                        skipSet.add(appID);
                        log(chalk.yellow(`Skipping game: ${gameData.name} (ID: ${appID})`));
                        continue;
                    }

                    myCache.set(`game_${appID}`, { data: gameData }, 3600);
                    if (!detailInfo.some(game => game.steam_appid === appID)) {
                        detailInfo.push(gameData);
                    }
                    actualGames.push(appID);
                    actualSet.add(appID);
                    validIDs.push(gameData);

                    log(chalk.bgGreen(`New Game Added: ${appID}`));
                }

            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
            }
        }
    }

    log(`Total game: ${detailInfo.length}`);
    if (detailInfo.length >= endIdx) {
        return detailInfo.slice(Number((page - 1) * perPage), endIdx);
    } else {
        return detailInfo.slice(Number(-perPage));
    }
};

async function buildSearchIndex() {
    const allCachedGames = [];
    const cachedKeys = myCache.keys();
    
    for (const key of cachedKeys) {
        if (key.startsWith('game_')) {
            const cached = myCache.get(key);
            if (cached?.valid) {
                allCachedGames.push(cached.data);
                gameDataMap[cached.data.steam_appid] = cached.data;
            }
        }
    }

    // Configure fuzzy search
    const options = {
        keys: ['name'],
        threshold: 0.4, // More tolerant matching
        includeScore: true
    };
    
    searchIndex = new Fuse(allCachedGames, options);
    log(chalk.green(`Built search index with ${allCachedGames.length} games`));
}

// More robust Steam store search
async function searchSteamStore(query) {
    try {
        const response = await axios.get('https://store.steampowered.com/api/storesearch', {
            params: {
                term: query,
                l: 'english',
                cc: 'us'
            }
        });
        
        return response.data.items.map(item => ({
            steam_appid: item.id,
            name: item.name,
            header_image: item.tiny_image || item.small_image || item.image
        }));
        
    } catch (error) {
        log(chalk.red('Steam store search error:', error));
        return [];
    }
}

app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const totalPages = Math.ceil(gameAppId.length / perPage);

        const hasPrevious = page > 1;
        const hasNext = page < totalPages;

        const searchQuery = req.query.q?.trim().toLowerCase() || '';

        const games = await gameFilter(page, perPage);

        res.render('home', {
            query: searchQuery,
            games: games,
            currentPage: page,
            totalPages: totalPages,
            hasPrevious: hasPrevious,
            hasNext: hasNext
        });
        

    } catch (error) {
        const searchQuery = req.query.q?.trim().toLowerCase() || '';
        log(chalk.bgRed('Page error', error.message));
        res.render('error', {
            query: searchQuery,
            message: 'Sorry, something went wrong',
            error: error.message
        });
    }
});

// app.get('/search', async (req, res) => {
//     try {
//         const cachedResults = [];

//         const page = parseInt(req.query.page) || 1;
//         const totalPages = Math.ceil(cachedResults.length / perPage);

//         const hasPrevious = page > 1;
//         const hasNext = page < totalPages;

//         const searchQuery = req.query.q?.trim().toLowerCase() || '';

//         if (!searchQuery || searchQuery.length < 3) {
//             return res.render('search', {
//                 results: [],
//                 query: searchQuery,
//                 message: 'Please enter at least 3 characters'
//             });
//         }

//         for (const appID of gameAppId) {
//             const cached = myCache.get(`game_${appID}`);
//             if (cached) {
//                 if (cached.data.name.toLowerCase().includes(searchQuery)) {
//                     cachedResults.push(cached.data);
//                 }
//             }
//         }

//         if (cachedResults.length < 10) {
//             const searchResults = await searchFilter(searchQuery);
//             cachedResults.push(...searchResults);
//         }

//         res.render('search', {
//             results: cachedResults.slice(0, perPage),
//             query: searchQuery,
//             currentPage: page,
//             totalPages: totalPages,
//             hasPrevious: hasPrevious,
//             hasNext: hasNext
//         });

//     } catch (error) {
//         log(chalk.bgRed('Search error', error.message));
//         res.render('error', {
//             message: 'Search failed',
//             error: error.message
//         });
//     }

// });

app.get('/search', async (req, res) => {
    const query = req.query.q?.trim();
    
    if (!query || query.length < 2) {
        return res.render('search', {
            query,
            results: [],
            message: 'Please enter at least 2 characters'
        });
    }

    try {
        const fuseResults = searchIndex.search(query);
        const instantResults = fuseResults.slice(0, 50).map(r => r.item);

        if (instantResults.length > 0) {
            return res.render('search', {
                query,
                results: instantResults,
                message: null
            });
        }

        const steamResults = await searchSteamStore(query);
        return res.render('search', {
            query,
            results: steamResults.slice(0, 50),
            message: null
        });

    } catch (error) {
        log(chalk.red('Search error:', error));
        return res.render('error', {
            query,
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
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

setInterval(buildSearchIndex, 3600000); 

async function serverStartup() {
    try {
        log(chalk.bgYellow.bold('\n Please wait while server is loading... '));

        await initialize();
        await buildSearchIndex();

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