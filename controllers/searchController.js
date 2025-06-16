import { scrapeSteamSearch } from '../services/scrapeService.js';
import { perPage, scrape } from '../config/constants.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';

export async function searchGames(req, res) {
    const page = parseInt(req.query.page) || 1;
    const query = req.query.q?.trim().toLowerCase() || '';
    let startIdx = (page - 1) * perPage;
    let endIdx = startIdx + perPage;

    // if (!query || query.length < 3) {
    //     return res.render('search', {
    //         query,
    //         result: [],
    //         message: 'Please enter at least 3 characters'
    //     });
    // }

    try {
        const steamResults = await scrapeSteamSearch(query, scrape);
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
            caption: "Something is wrong!",
            message: 'Failed to load search result',
            error: error.message
        });
    }
}