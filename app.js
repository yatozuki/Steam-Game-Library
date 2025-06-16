import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import chalk from 'chalk';

import { port } from './config/constants.js'
import { initialize, getGameAppId } from './services/gameService.js';
import { getGameData } from './services/dataService.js';
import { getHomePage, getDevTool } from './controllers/gameController.js';
import { searchGames } from './controllers/searchController.js';
import { getGameDetail } from './controllers/detailController.js';
import { cleanExit, log } from './utils/helpers.js';
import { saveData } from './services/dataService.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

// Routes
app.get('/', getHomePage);
app.get('/search', searchGames);
app.get('/game/:id', getGameDetail);
app.get('/dev-tool', getDevTool);

// Process handlers
process.on('SIGINT', () => cleanExit(saveData));
process.on('SIGTERM', () => cleanExit(saveData));
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

async function serverStartup() {
    try {
        log(chalk.bgYellow.bold('\n Please wait while server is loading... '));

        await initialize();

        const gameAppId = getGameAppId();
        const { actualGames, dlcGames } = getGameData();

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