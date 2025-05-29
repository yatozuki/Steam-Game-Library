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
let cachedGames = {};

async function loadGameIDs() {
    try {
        const response = await axios.get(steam_API);
        gameAppId = response.data.applist.apps.map(game => game.appid);
        console.log(`Loaded ${gameAppId.length} game IDs`);
    } catch (error) {
        console.log('Failed to load game IDs', error.message); 
    }
};

async function gameDetails(appID) {
    if (cachedGames[appID]) {
        return cachedGames[appID];
    }

    try {
        const response = await axios.get(steam_API_details + appID);
        const gameData = response.data[appID].data;
        cachedGames[appID] = gameData;
    } catch (error) {
        console.log(`Failed to load game ${appID}:`, error.message);
        return null;
    }
}

app.get('/', async (req, res) => {
    
    try { 
        const page = parseInt(req.query.page) || 1;
        const gamePerPage = 20;

        const startIdx = (page - 1) * gamePerPage;
        const endIdx = startIdx + gamePerPage;

        const paginatedGames = gameAppId.slice(startIdx, endIdx);

        const totalPages = Math.ceil(gameAppId.length /gamePerPage);
    
        let games = [];

        for (let i = 0; i < paginatedGames.length; i++){

            const game = await gameDetails(gameAppId[i]);
            if (game) {
                games.push(game);
            }
        };
        
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
})






loadGameIDs()

app.listen(port,() => {
    console.log('Server is running on port', port);
    
})