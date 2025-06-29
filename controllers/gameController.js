import { gameFilter, getTotalPages } from '../services/gameService.js';
import { getGameData } from '../services/dataService.js'
import { searchData } from '../services/scrapeService.js'
import { gameDetail_dev } from './detailController.js';
import { perPage } from '../config/constants.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';

export async function getHomePage(req, res) {
    const page = parseInt(req.query.page) || 1;
    const query = req.query.q?.trim().toLowerCase() || '';

    try {
        const totalPages = getTotalPages();
        const games = await gameFilter(page, perPage);

        if (games === 429) {
            res.render('error', {
                query,
                game: null,
                page,
                caption: "Reached Steam API Limit!",
                message: "Unfortunately, you’ve hit the Steam API limit. Please wait a few minutes before trying again.",
                error: "Request failed with status code 429"
            });
        } else {
            res.render('home', {
                query,
                games: games,
                currentPage: page,
                totalPages,
                hasPrevious: page > 1,
                hasNext: page < totalPages
            });
        }

        
    } catch (error) {
        log(chalk.bgRed('Page error', error.message));
        res.render('error', {
            query,
            game: null,
            page,
            caption: "Something is wrong!",
            message: 'Failed to load home page',
            error: error.message
        });
    }
}

export function getDevTool(req, res) {
    const { ignoreID, dlcGames, actualGames } = getGameData();
    
    res.json({
        noInfo: ignoreID,
        DLC: dlcGames,
        Games: actualGames,
        Detail: gameDetail_dev,
        Search_Result: searchData

    });
}