import fs from 'fs';
import { log } from '../utils/helpers.js';
import chalk from 'chalk';

let actualGames = [];
let dlcGames = [];
let ignoreID = [];
let detailInfo = [];
let skipID = [];

let actualSet = new Set();
let dlcSet = new Set();
let ignoreSet = new Set();
let detailSet = new Set();
let skipSet = new Set();

export function loadData() {
    try {
        if (fs.existsSync('./data/Game_IDs.json')) {
            actualGames = JSON.parse(fs.readFileSync('./data/Game_IDs.json', 'utf-8'));
            actualGames.forEach(id => actualSet.add(id));
        }

        if (fs.existsSync('./data/DLC_IDs.json')) {
            dlcGames = JSON.parse(fs.readFileSync('./data/DLC_IDs.json', 'utf-8'));
            dlcGames.forEach(id => dlcSet.add(id));
        }

        if (fs.existsSync('./data/ignore_IDs.json')) {
            ignoreID = JSON.parse(fs.readFileSync('./data/ignore_IDs.json', 'utf-8'));
            ignoreID.forEach(id => ignoreSet.add(id));
        }

        if (fs.existsSync('./data/details.json')) {
            detailInfo = JSON.parse(fs.readFileSync('./data/details.json', 'utf-8'));
            detailInfo.forEach(object => detailSet.add(object));
        }

        if (fs.existsSync('./data/skip_IDs.json')) {
            skipID = JSON.parse(fs.readFileSync('./data/skip_IDs.json', 'utf-8'));
            skipSet.forEach(id => skipSet.add(id));
        }

    } catch (error) {
        log(chalk.red('Error loading progress:', error.message));
    }
}

export function saveData() {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data');
        }

        actualGames = [...new Set(actualGames)];
        dlcGames = [...new Set(dlcGames)];
        ignoreID = [...new Set(ignoreID)];
        skipID = [...new Set(skipID)];

        const seen = new Set();
        detailInfo = detailInfo.filter(obj => {
            const duplicate = seen.has(obj.steam_appid);
            seen.add(obj.steam_appid);
            return !duplicate;
        });

        fs.writeFileSync('./data/Game_IDs.json', JSON.stringify(actualGames, null, 2));
        fs.writeFileSync('./data/DLC_IDs.json', JSON.stringify(dlcGames, null, 2));
        fs.writeFileSync('./data/ignore_IDs.json', JSON.stringify(ignoreID, null, 2));
        fs.writeFileSync('./data/details.json', JSON.stringify(detailInfo, null, 2));
        fs.writeFileSync('./data/skip_IDs.json', JSON.stringify(skipID, null, 2));

        // log(`Total: ${actualGames.length + dlcGames.length + ignoreID.length}`);

    } catch (error) {
        log(chalk.red('Error saving progress:', error.message));
    }
}

export function getGameData() {
    return {
        actualGames, dlcGames, ignoreID, detailInfo, skipID,
        actualSet, dlcSet, ignoreSet, detailSet, skipSet
    };
}

export function updateGameData(newData) {
    actualGames = newData.actualGames;
    dlcGames = newData.dlcGames;
    ignoreID = newData.ignoreID;
    detailInfo = newData.detailInfo;
    skipID = newData.skipID;
    actualSet = newData.actualSet;
    dlcSet = newData.dlcSet;
    ignoreSet = newData.ignoreSet;
    detailSet = newData.detailSet;
    skipSet = newData.skipSet;
}