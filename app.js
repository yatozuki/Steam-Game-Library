import express from 'express';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';

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

async function loadGameIDs() {
    try {
        const cachedIDs = myCache.get(`all_game_ids`);
        if (cachedIDs) {
            gameAppId = cachedIDs;
            console.log(`Loaded ${gameAppId.length} game IDs from cache`);
            return;
        }

        const response = await axios.get(steam_API);
        gameAppId = response.data.applist.apps.map(game => game.appid);
        myCache.get(`all_game_ids`, gameAppId, 86400);
        console.log(`Loaded ${gameAppId.length} game IDs`);
    } catch (error) {
        console.log('Failed to load game IDs', error.message); 
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

        const paginatedGames = gameAppId.slice(startIdx, endIdx);

        // console.log(`paginated Games: ${paginatedGames}`);
        
        const totalPages = Math.ceil(gameAppId.length /gamePerPage);
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

loadGameIDs()

app.listen(port,() => {
    console.log('Server is running on port', port);
    
})