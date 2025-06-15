import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { myCache } from '../config/cache.js';
import {Scrape_MS } from '../config/constants.js';
import { time, log } from '../utils/helpers.js';
import chalk from 'chalk';

puppeteer.use(StealthPlugin());

export async function scrapeSteamSearch(query, maxResults = 100) {
    let results = [];
    let previousHeight;
    let attempts = 0;
    const maxAttempts = 1;

    const cacheKey = `search_${query.toLowerCase().trim()}`;
    
    const cachedResults = myCache.get(cacheKey);
    if (cachedResults) {
        log(chalk.green(`Cached results for: "${query}"`));
        return cachedResults;
    }
    
    log(chalk.yellow(`[${time()}] Activating stealth mode...`));

    log(chalk.yellow(`[${time()}] Launching headless browser...`));

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        log(chalk.yellow(`[${time()}] Preparing to scrape...`));

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
        await page.goto(`https://store.steampowered.com/search/?term=${encodeURIComponent(query)}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
    
        try {
            log(chalk.yellow(`[${time()}] Waiting for the selector...`));

            await page.waitForSelector('#search_resultsRows');

        } catch (error) {
            log(chalk.red(`[${time()}] Nothing is found`));

            myCache.set(cacheKey, results, 86400);
            return results;
        }
        
        while (attempts < maxAttempts && results.length < maxResults) {
            const newResults = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('#search_resultsRows a').forEach(item => {
                    const appId = item.getAttribute('data-ds-appid');
                    const bundleId = item.getAttribute('data-ds-bundleid');
                    const originalImgUrl = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : null;
                    const altImgUrl = item.querySelector('img')?.src.replace(/capsule_sm_120\.jpg/g, 'header.jpg');
                        
                    const discountText = item.querySelector('.discount_pct')?.innerText.trim();
                    const discountPercent = discountText ? parseInt(discountText.replace(/[%-]/g, ''), 10) : 0;

                    const finalPrice = item.querySelector('.discount_final_price')?.innerText.toString().replace('Your Price:\n', '').trim();
                    items.push({
                        steam_appid: appId,
                        bundle_id: bundleId,
                        name: item.querySelector('.title')?.innerText.trim(),
                        original_price: item.querySelector('.discount_original_price')?.innerText.trim() || finalPrice,
                        final_price: finalPrice,
                        discount_percent: discountPercent,
                        header_image: originalImgUrl || altImgUrl,
                        url: item.href,
                        coming_soon: item.querySelector('.search_released')?.innerText.trim()
                    });
                });
                return items;
            });
            
            newResults.forEach(item => {
                if (!results.some(existing => existing.url === item.url)) {
                    results.push(item);
                }
            });
            
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {
                timeout: 5000
            }).catch(() => {
                log(chalk.yellow(`[${time()}] No more results to load`));
                attempts++;
            });
            await new Promise(resolve => setTimeout(resolve, Scrape_MS));
            await page.waitForNetworkIdle();
            log(chalk.yellow(`[${time()}] Found ${results.length} results`));
        }
        
        log(chalk.green(`[${time()}] Total results for "${query}": ${results.length}`));
        myCache.set(cacheKey, results, 86400);
        return results;

    } catch (error) {
        log(chalk.red(`[${time()}] Scraping error for "${query}":`, error));
        throw error;
    } finally {
        log('Browser Close\n')
        await browser.close();
    }
}