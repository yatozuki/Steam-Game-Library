import express from 'express';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

const app = express();
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const myCache = new NodeCache({
    stdTTL: 86400,
    checkperiod: 2000
});

const Delay_MS = 35000;
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

function time() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Format as "X h: Y m: Z s" (24-hour format)
    return `${hours}h: ${minutes}m: ${seconds}s`;
}

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

                if (!isDuplicateGame(existingDetail)) {
                    validIDs.push(existingDetail);
                    myCache.set(`game_${appID}`, { data: existingDetail }, 86400);
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
                    myCache.set(`game_${appID}`, { data: gameData }, 86400);

                    if (!detailInfo.some(game => game.steam_appid === appID)) {
                        detailInfo.push(gameData);
                    }

                    validIDs.push(gameData);
                    log(chalk.green(`Game: ${appID}`));

                }

            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
                if (error.response?.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, Delay_MS));
                    saveData();
                }
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
                    myCache.set(`game_${appID}`, { data: existingDetail }, 86400);
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

                    myCache.set(`game_${appID}`, { data: gameData }, 86400);
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
                if (error.response?.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, Delay_MS));
                    saveData();
                }
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

async function scrapeSteamSearch(query, maxResults = 100) {
    let results = [];
    let previousHeight;
    let attempts = 0;
    const maxAttempts = 1;

    const cacheKey = `search_${query.toLowerCase().trim()}`;
    
    const cachedResults = myCache.get(cacheKey);
    if (cachedResults) {
        log(chalk.green(`Cached results for: "${query}"`));
        return cachedResults;
    }
    
    log(chalk.yellow(`[${time()}] Activating stealth mode...`));

    puppeteer.use(StealthPlugin())

    log(chalk.yellow(`[${time()}] Launching headless browser...`));

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        log(chalk.yellow(`[${time()}] Preparing to scrape...`));

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
        await page.goto(`https://store.steampowered.com/search/?term=${encodeURIComponent(query)}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
    
        try {
            log(chalk.yellow(`[${time()}] Waiting for the selector...`));

            await page.waitForSelector('#search_resultsRows');

        } catch (error) {
            log(chalk.red(`[${time()}] Nothing is found`));

            myCache.set(cacheKey, results, 86400);
            return results;
        }
        
        while (attempts < maxAttempts && results.length < maxResults) {

            const newResults = await page.evaluate(() => {
                const items = [];

                document.querySelectorAll('#search_resultsRows a').forEach(item => {
                    const appId = item.getAttribute('data-ds-appid');
                    const bundleId = item.getAttribute('data-ds-bundleid');

                    const originalImgUrl = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : null;
                    const altImgUrl = item.querySelector('img')?.src.replace(/capsule_sm_120\.jpg/g, 'header.jpg');
                        
                    const discountText = item.querySelector('.discount_pct')?.innerText.trim();
                    const discountPercent = discountText ? parseInt(discountText.replace(/[%-]/g, ''), 10) : 0;

                    const finalPrice = item.querySelector('.discount_final_price')?.innerText.toString().replace('Your Price:\n', '').trim();
                    items.push({
                        steam_appid: appId,
                        bundle_id: bundleId,
                        name: item.querySelector('.title')?.innerText.trim(),
                        original_price: item.querySelector('.discount_original_price')?.innerText.trim() || finalPrice,
                        final_price: finalPrice,
                        discount_percent: discountPercent,
                        header_image: originalImgUrl || altImgUrl,
                        url: item.href,
                        coming_soon: item.querySelector('.search_released')?.innerText.trim()
                    });
                });
                return items;
            });
            
            newResults.forEach(item => {
                if (!results.some(existing => existing.url === item.url)) {
                    results.push(item);
                }
            });
            
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {
                timeout: 5000
            }).catch(() => {
                log(chalk.yellow(`[${time()}] No more results to load`));

                attempts++;
            });
            await new Promise(resolve => setTimeout(resolve, 5000));

            await page.waitForNetworkIdle();

            log(chalk.yellow(`[${time()}] Found ${results.length} results`));
        }
        
        log(chalk.green(`[${time()}] Total results for "${query}": ${results.length}`));
        // log(results)

        myCache.set(cacheKey, results, 86400);

        return results;

    } catch (error) {
        log(chalk.red(`[${time()}] Scraping error for "${query}":`, error));
        throw error;
    } finally {
        log('Browser Close\n')
        await browser.close();
    }
    
}

app.get('/', async (req, res) => {
    const query = req.query.q?.trim().toLowerCase() || '';

    try {
        const page = parseInt(req.query.page) || 1;
        const totalPages = Math.ceil(gameAppId.length / perPage);

        const games = await gameFilter(page, perPage);

        res.render('home', {
            query,
            games: games,
            currentPage: page,
            totalPages,
            hasPrevious: page > 1,
            hasNext: page < totalPages
        });
        

    } catch (error) {
        log(chalk.bgRed('Page error', error.message));
        res.render('error', {
            query,
            message: 'Failed to load home page',
            error: error.message
        });
    }
});

app.get('/search', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const query = req.query.q?.trim().toLowerCase() || '';
    let startIdx = (page - 1) * perPage;
    let endIdx = startIdx + perPage;

    if (!query || query.length < 3) {
        return res.render('search', {
            query,
            result: [],
            message: 'Please enter at least 3 characters'
        });
    }

    try {
        const steamResults = await scrapeSteamSearch(query, 50);
        const totalPages = Math.ceil(steamResults.length / perPage);
        const hasPrevious = page > 1;
        const hasNext = page < totalPages;

        return res.render('search', {
            query,
            totalResults: steamResults,
            results: steamResults.slice(Number((page - 1) * perPage), endIdx),
            message: null,
            currentPage: page,
            totalPages,
            hasPrevious,
            hasNext
        });

    } catch (error) {
        log(chalk.red('Search error:', error));
        return res.render('error', {
            query,
            message: 'Failed to load search result',
            error: error.message
        });
    }
});

app.get('/game/:id', async (req, res) => {
    const query = req.query.q?.trim().toLowerCase() || '';
    res.render('detail', {
        query
    })
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

async function serverStartup() {
    try {
        log(chalk.bgYellow.bold('\n Please wait while server is loading... '));

        await initialize();

        app.listen(port, '0.0.0.0', () => {
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