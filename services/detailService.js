import { steam_API_details, Scrape_MS, perPage } from '../config/constants.js';
import { myCache } from '../config/cache.js';
import { saveData, getGameData, updateGameData } from '../services/dataService.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';
import axios from 'axios';

export async function detailData(appid) {
    let { detailInfo, detailSet } = getGameData();

    try {
        const response = await axios.get(steam_API_details + appid);
        const result = response.data[appid];
        
    } catch (error) {
        log(`Error processing ${appid}:`, error.message)
    }
}