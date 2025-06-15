import { gameFilter, getTotalPages } from '../services/gameService.js';
import { perPage } from '../config/constants.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';

export async function getHomePage(req, res) {
    const query = req.query.q?.trim().toLowerCase() || '';

    try {
        const page = parseInt(req.query.page) || 1;
        const totalPages = getTotalPages();
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
}

export async function getGameDetail(req, res) {
    const query = req.query.q?.trim().toLowerCase() || '';
    res.render('detail', {
        query
    });
}

export function getDevTool(req, res) {
    const stats = myCache.getStats();
    const { ignoreID, dlcGames, actualGames } = getGameData();
    
    res.json({
        keys: myCache.keys(),
        noInfo: ignoreID,
        DLC: dlcGames,
        Games: actualGames,
    });
}