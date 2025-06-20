import { detailData } from '../services/detailService.js';
import { log } from '../utils/helpers.js';
import * as cheerio from 'cheerio';
import chalk from 'chalk';

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
            const $min = cheerio.load(String(game.data.pc_requirements.minimum));
            const $rec = cheerio.load(String(game.data.pc_requirements.recommended));

            const minRequirements = $min('ul.bb_ul li').map((i, el) => $min.html(el)).get().join('');
            const recRequirements = $rec('ul.bb_ul li').map((i, el) => $rec.html(el)).get().join('');
            
            // log(`${minRequirements.length}, ${recRequirements.length}`)
            
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
                min: minRequirements,
                max: recRequirements
            });

        }
    } catch (error) {
        log(chalk.bgRed('Error', error.message));
        res.render('error', {
            query,
            caption: "Something is wrong!",
            message: 'Failed to load game detail',
            error: error.message
        });
    }
    
}