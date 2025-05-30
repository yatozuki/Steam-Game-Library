import express from 'express';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';
import fs from 'fs';
import { log } from 'console';

const app = express();
const port = process.env.PORT || 3000;
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 2000 });

const steam_API = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
const steam_API_details = 'https://store.steampowered.com/api/appdetails?appids=';

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(compression());

let gameAppId = [];
let actualGames = [];
let dlcGames = [];

const gameIdPath = './data/actualGames.json';
const dlcIdPath = './data/dlcGames.json'; 
const removeIdPath = './data/removeGames.json';

async function loadGameIDs() {
    try {
        const cachedIDs = myCache.get(`all_game_ids`);
        if (cachedIDs) {
            gameAppId = cachedIDs;
            console.log(`Loaded (Cached): ${gameAppId.length} Game IDs`);
            return;
        }

        const response = await axios.get(steam_API);
        gameAppId = response.data.applist.apps.map(game => game.appid);
        myCache.set(`all_game_ids`, gameAppId, 86400);
        // console.log(`Loaded ${gameAppId.length} Game IDs`);
    } catch (error) {
        console.log('Failed to load game IDs', error.message); 
    }
};

async function idFilter() {
    try {
        const cachedGameIDs = myCache.get(`game_ids`);
        const cachedDlcIDs = myCache.get(`dlc_ids`);

        if (cachedGameIDs) {
            actualGames = cachedGameIDs;
            console.log(`Game Loaded (Cached): ${actualGames.length} Game IDs`);
            return;
        }

        if (cachedDlcIDs) {
            dlcGames = cachedDlcIDs;
            console.log(`DLC Loaded (Cached): ${actualGames.length} DLC IDs`);
            return;
        }

        for (let i = 0; i < gameAppId.length; i++) {
            const justID = gameAppId[i];
            const response = await axios.get(steam_API_details + justID);
            const result = response.data[justID];
            const gameData = result.data;

            if (!result.success) {
                gameAppId.splice(i, 1);
                i--;
                console.log(`${justID} was removed from gameAppId`);
                continue;
            };

            if (gameData.type === 'game') {
                actualGames.push(gameData);
                myCache.set(`game_ids`, actualGames, 864000);
                console.log(`Game Loaded: ${actualGames.length} Game IDs`);
                
            } else {
                dlcGames.push(gameData);
                myCache.set(`dlc_ids`, dlcGames, 864000);
                console.log(`DLC Loaded: ${actualGames.length} DLC IDs`);

            };
        }
    } catch (error) {
        console.log('Error: ', error.message);
    }
};

async function gameDetails(appID) {
    const cachedGames = myCache.get(`game_${appID}`);
    if (cachedGames) {
        return cachedGames.type === 'dlc' ? null : cachedGames;
    }

    const cachedError = myCache.get(`error_${appID}`);
    if (cachedError) {
        return null;
    }

    try {
        const response = await axios.get(steam_API_details + appID);
        const result = response.data[appID];
        const gameData = result.data;

        if (!result.success) return null;

        if(!gameData || gameData.type === 'dlc') return null;

        if (gameData && gameData.type === 'game') {
            myCache.set(`game_${appID}`, gameData, 3600);

            return gameData;
        };

        return null;
    } catch (error) {
        console.log(`Failed to load game ${appID}:`, error.message);
        myCache.set(`error_${appID}`, true, 300);
        return null;
    }
}

app.get('/', async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const gamePerPage = 30;

        const startIdx = (page - 1) * gamePerPage;
        // console.log(`Start Index: ${startIdx}`);
        
        const endIdx = startIdx + gamePerPage;

        const paginatedGames = actualGames.slice(startIdx, endIdx);

        // console.log(`paginated Games: ${paginatedGames}`);
        
        const totalPages = Math.ceil(actualGames.length /gamePerPage);
        // console.log(`Total Pages: ${totalPages}`);
        
        let attempts = 0;
        const maxAttempts = 100;

        let games = [];
        
        for (let i = 0; i < paginatedGames.length && attempts < maxAttempts; i++) {
            attempts++;
            
            const appID = paginatedGames[i];
            const game = await gameDetails(appID);
            if (game) games.push(game);
        };
        
        console.log(`Games On Page: ${games.length}`);
        
        res.render('home', { 
            games: games,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.log('Page error:', error.message);
        res.send('error', {message: 'Sorry, something went wrong'});
    }
});

app.get('/detail', (req, res) => {
    res.render('detail')
});

app.get('/dev-tool-cache', (req, res) => {
    const stats = myCache.getStats();
    res.json({
        keys: myCache.keys(),
        hits: stats.hits,
        misses: stats.misses,
        ksize: stats.ksize,
        vsize: stats.vsize
    });
});

async function serverStartup() {
    try {
        await loadGameIDs();
        // await idFilter();

        app.listen(port, () => {
            console.log("\n===============================\n");
            console.log('Server is running on PORT:', port);
            console.log(`Total game Ids: ${gameAppId.length}`);
            console.log(`Current Game Ids: ${actualGames.length}`);
            console.log(`Current DLC Ids: ${dlcGames.length}`);
            console.log("\n============== x ==============\n");
        })

    } catch (error) {
        console.error("Failed to load game IDs:", error);
    }
}

serverStartup();