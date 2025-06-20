import { steam_API_details, Scrape_MS} from '../config/constants.js';
import { myCache, cacheTime } from '../config/cache.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';
import axios from 'axios';


export async function detailData(appid) {
    const detailCache = myCache.get(appid);
    if (detailCache) {
        log(`Detail Information of "${detailCache.data.name}" is loaded`)
        return detailCache
    }
    
    try {
        const response = await axios.get(steam_API_details + appid);
        const result = response.data[appid];

        if (result.success) {
            myCache.set(appid, result, cacheTime);
            return result;
        } else {
            return result;
        }
    } catch (error) {
        log(`Error processing ${appid}:`, error.message)
    }
}