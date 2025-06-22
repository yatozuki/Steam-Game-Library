import { detailData, pcRequirements } from '../services/detailService.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';
log(pcRequirements)
export let gameDetail_dev = [];

export async function getGameDetail(req, res) {
    const query = req.query.q?.trim().toLowerCase() || '';
    const appid = parseInt(req.params.id);
    log(appid);

    try {
        const game = await detailData(appid);

        if (!game.success) {
            const error = `Request failed with status code 404.<br><strong>${appid}: <br>{ "success": false }</strong>`;
            const message = `It seem like steam (appid = ${appid}) data can't be fetch via public API. (Might be NSFW or Violent game)`
            res.render('error', {
                query,
                game,
                caption: "404 Data Not Found!",
                message,
                error
            });

        } else {
            const dataExist = gameDetail_dev.some(g => 
                g.data.steam_appid === game.data.steam_appid
            );

            if (!dataExist) {
                gameDetail_dev.push(game);
            }

            // log(game)

            res.render('detail', {
                query,
                game: game.data,
                requirements: pcRequirements
            });

        }
    } catch (error) {
        log(chalk.bgRed('Error', error.message));
        res.render('error', {
            query,
            game: null,
            caption: "Something is wrong!",
            message: 'Failed to load game detail',
            error: error.message
        });
    }
    
}