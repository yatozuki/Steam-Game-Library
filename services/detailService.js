import { steam_API_details, Scrape_MS} from '../config/constants.js';
import { myCache, cacheTime } from '../config/cache.js';
import { log } from '../utils/helpers.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export let pcRequirements = [];

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
            // Windows
            const $windowsMin = cheerio.load(String(result.data.pc_requirements.minimum));
            const $windowsRec = cheerio.load(String(result.data.pc_requirements.recommended));

            const windowsMin = $windowsMin('ul.bb_ul li').map((i, el) => $windowsMin.html(el)).get().join('');
            const windowsRec = $windowsRec('ul.bb_ul li').map((i, el) => $windowsRec.html(el)).get().join('');
            
            // Mac
            const $macMin = cheerio.load(String(result.data.mac_requirements.minimum));
            const $macRec = cheerio.load(String(result.data.mac_requirements.recommended));

            const macMin = $macMin('ul.bb_ul li').map((i, el) => $macMin.html(el)).get().join('');
            const macRec = $macRec('ul.bb_ul li').map((i, el) => $macRec.html(el)).get().join('');

            // Linux
            const $linuxMin = cheerio.load(String(result.data.linux_requirements.minimum));
            const $linuxRec = cheerio.load(String(result.data.linux_requirements.recommended));

            const linuxMin = $linuxMin('ul.bb_ul li').map((i, el) => $linuxMin.html(el)).get().join('');
            const linuxRec = $linuxRec('ul.bb_ul li').map((i, el) => $linuxRec.html(el)).get().join('');

            pcRequirements.push(
                {platform: "Windows", w_minimum: windowsMin, w_recommended: windowsRec},
                {platform: "Mac", m_minimum: macMin, m_recommended: macRec},
                {platform: "Linux", l_minimum: linuxMin, l_recommended: linuxRec}
            )
            log(pcRequirements)
            myCache.set(appid, result, cacheTime);
            return result;
        } else {
            return result;
        }
    } catch (error) {
        log(`Error processing ${appid}:`, error.message)
    }
}