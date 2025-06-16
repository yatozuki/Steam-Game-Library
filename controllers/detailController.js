import { detailData } from '../services/detailService.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';

export async function getGameDetail(req, res) {
    const query = req.query.q?.trim().toLowerCase() || '';
    const appid = parseInt(req.params.id);
    log(appid);

    // const game = await detailData(appid);
    // log(game);


    res.render('detail', {
        query
    });
}