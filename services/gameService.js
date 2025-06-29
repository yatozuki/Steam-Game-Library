import axios from 'axios';
import { steam_API, steam_API_details, Delay_MS, perPage } from '../config/constants.js';
import { myCache, cacheTime } from '../config/cache.js';
import { loadData, saveData, getGameData, updateGameData } from './dataService.js';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';

let gameAppId = [];
export async function initialize() {
    try {
        const cachedIDs = myCache.get(`all_game_ids`);
        if (cachedIDs) {
            gameAppId = cachedIDs;
            log(`Loaded (Cached): ${gameAppId.length} Game IDs`);
            return;
        }

        if (gameAppId.length === 0) {
            const response = await axios.get(steam_API);
            gameAppId = response.data.applist.apps.map(game => game.appid);
            myCache.set(`all_game_ids`, gameAppId, 86400);
        }

        loadData();

    } catch (error) {
        log('Failed to load game IDs', error.message);
    }
}

export async function gameFilter(page, perPage) {
    let { actualGames, dlcGames, ignoreID, detailInfo, skipID, 
          actualSet, dlcSet, ignoreSet, detailSet, skipSet } = getGameData();
    
    let startIdx = (page - 1) * perPage;
    log(startIdx);
    let endIdx = startIdx + perPage;
    let validIDs = [];
    let validCollection = 0;

    function isDuplicateGame(gameData) {
        const normalizedNewName = gameData.name.toLowerCase().trim();
        return validIDs.some(game => 
            game.steam_appid === gameData.steam_appid || 
            game.name.toLowerCase().trim() === normalizedNewName
        );
    }

    while (validIDs.length < perPage) {
        if (startIdx < actualGames.length) {
            const appID = actualGames[(actualGames.length - 1) - startIdx];
            startIdx++;

            if (ignoreSet.has(appID) || dlcSet.has(appID) || skipSet.has(appID)) continue; 

            const cacheGame = myCache.get(`game_${appID}`);
            if (cacheGame) {
                validIDs.push(cacheGame.data);
                validCollection++;
                log(chalk.green(`[Game ${validCollection}/${perPage}] Loaded `)+ chalk.yellow(`[CACHED]`) + chalk.green(`: ${appID}`));
            }


            const existingDetail = detailInfo.find(game => game.steam_appid === appID);

            if (existingDetail) {             
                if (!isDuplicateGame(existingDetail)) {
                    validIDs.push(existingDetail);
                    myCache.set(`game_${appID}`, { data: existingDetail }, cacheTime);
                    validCollection++;
                    log(chalk.green(`[GAME ${validCollection}/${perPage}] Loaded `)+ chalk.yellow(`[STORAGE]`) + chalk.green(`: ${appID}`));

                }
                continue;
            }

            try {
                const response = await axios.get(steam_API_details + appID);
                const result = response.data[appID];
                const gameData = result.data;

                if (gameData.type === 'game') {
                    if (isDuplicateGame(gameData)) {
                        skipID.push(appID);
                        skipSet.add(appID);
                        log(chalk.yellow(`Skipping game: ${gameData.name} (ID: ${appID})`));
                        continue;
                    }
                }

                if (actualSet.has(appID)) {
                    myCache.set(`game_${appID}`, { data: gameData }, cacheTime);

                    if (!detailInfo.some(game => game.steam_appid === appID)) {
                        detailInfo.push(gameData);
                    }

                    validIDs.push(gameData);
                    validCollection++;
                    log(chalk.green(`[GAME ${validCollection}/${perPage}] Loaded: ${appID}`));

                }

            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
                if (error.response?.status === 429) {
                    // await new Promise(resolve => setTimeout(resolve, Delay_MS));
                    saveData();
                    return error.response.status;
                }
            }

        } else if (startIdx < gameAppId.length) {
            const appID = gameAppId[startIdx];
            startIdx++;

            if (ignoreSet.has(appID) || dlcSet.has(appID) || skipSet.has(appID)) continue; 

            const cacheGame = myCache.get(`game_${appID}`);
            if (cacheGame) {
                validIDs.push(cacheGame.data);
                validCollection++;
                log(chalk.bgGreen(`[Game ${validCollection}/${perPage}] Loaded `)+ chalk.yellow(`[CACHED]`) + chalk.green(`: ${appID}`));
            }
            
            const existingDetail = detailInfo.find(game => game.steam_appid === appID);

            if (existingDetail) {
                if (!isDuplicateGame(existingDetail)) {
                    validIDs.push(existingDetail);
                    myCache.set(`game_${appID}`, { data: existingDetail }, cacheTime);
                    validCollection++;
                    log(chalk.bgGreen(`[GAME ${validCollection}/${perPage}] Loaded `)+ chalk.yellow(`[STORAGE]`) + chalk.green(`: ${appID}`));
                }
                continue;
            }

            try {
                const response = await axios.get(steam_API_details + appID);
                const result = response.data[appID];
                const gameData = result.data;

                if (!result.success) {
                    ignoreID.push(appID);
                    ignoreSet.add(appID);
                    log(chalk.bgRed(`Ignore ID: ${appID}`));

                }

                if (gameData.type === 'dlc') {
                    dlcGames.push(appID);
                    dlcSet.add(appID);
                    log(chalk.bgBlue(`DLC: ${dlcGames.length}`));
                    continue;
                }

                if (gameData.type === 'game') {
                    if (isDuplicateGame(gameData)) {
                        skipID.push(appID);
                        skipSet.add(appID);
                        log(chalk.yellow(`Skipping game: ${gameData.name} (ID: ${appID})`));
                        continue;
                    }

                    myCache.set(`game_${appID}`, { data: gameData }, cacheTime);
                    if (!detailInfo.some(game => game.steam_appid === appID)) {
                        detailInfo.push(gameData);
                    }
                    actualGames.push(appID);
                    actualSet.add(appID);
                    validIDs.push(gameData);
                    validCollection++;
                    log(chalk.bgGreen(`[GAME ${validCollection}/${perPage}] Added: ${appID}`));
                }

            } catch (error) {
                log(`Error processing ${appID}:`, error.message);
                if (error.response?.status === 429) {
                    // await new Promise(resolve => setTimeout(resolve, Delay_MS));
                    saveData();
                    return error.response.status;
                }
            }
        }
    }

    updateGameData({ actualGames, dlcGames, ignoreID, detailInfo, skipID, 
                    actualSet, dlcSet, ignoreSet, detailSet, skipSet });
    
    saveData();
    log(`Total game: ${detailInfo.length}`);

    const totalPage = getTotalPages();
    const startIndex = Number((page - 1) * perPage)
    const lastIndex = totalPage * perPage;

    const indexResult = (endIdx - lastIndex) - perPage;

    if (detailInfo.length >= endIdx) {
        // log("Normal Order")
        return detailInfo.slice(startIndex, endIdx);

    } else if (detailInfo.length < endIdx) { 
        // log("Nothing in detailInfo", startIndex, endIdx)
        const reverseArray = detailInfo.reverse();
        return reverseArray.slice(0, perPage)

    } else {
        if (indexResult === -20) {
            // log('Last 20 Games')
            return detailInfo.slice(indexResult)
        } else {
            // log(indexResult - 20, indexResult);
            return detailInfo.slice(indexResult - 20, indexResult);
        };
       
    }
}

export function getGameAppId() {
    return gameAppId;
}

export function getTotalPages() {
    return Math.ceil((gameAppId.length / perPage) -2);
}