# Steam Game Library

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Contributions](https://img.shields.io/badge/contributions-welcome-brightgreen) <br>
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?&style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?&style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?&style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=white)
![Axios](https://img.shields.io/badge/axios-%23202020.svg?style=for-the-badge&logo=axios&logoColor=white)
![Puppeteer](https://img.shields.io/badge/puppeteer-%23323330.svg?style=for-the-badge&logo=puppeteer&logoColor=green)
![Steam API](https://img.shields.io/badge/steam_api-%23000000.svg?style=for-the-badge&logo=steam&logoColor=white)
![Compression](https://img.shields.io/badge/compression-%23444.svg?style=for-the-badge)

---

## 📑 Table of Contents

- [Description](#-description)
- [Warning](#-warning)
	- [NSFW Content](#-nsfw-content)
	- [Steam API Rate Limits](#-steam-api-rate-limits)
	- [Safe Usage](#-safe-usage)
	- [Terms of Use](#-terms-of-use)
- [Compatibility](#-compatibility)
- [Setup](#-setup)
- [Usage](#-usage)
	- [Browsing the Library](#-browsing-the-library)
	- [Searching for Games](#-searching-for-games)
	- [Caching and Saving Data](#-caching-and-saving-data)
- [Screenshots](#-screenshots)
- [Known Bugs](#-known-bugs)
- [Note](#-note)
- [Contributing](#-contributing)

---

## 📝 Description

The Steam Game Library is a local web app that helps you browse Steam games with up-to-date prices and detailed info. No Steam login or token needed. Eeverything works via the public API. You can view game titles, images, prices, genres, release dates, and descriptions. Each game links directly to its Steam store page. It’s built to save time. No more manual searching, just browse and click.

---

## 🚨 Warning
### 🚫 NSFW Content:
Steam’s catalog includes adult or mature-rated games, and this app currently does **not** filter out such content. That means NSFW or explicit titles may appear while browsing. Viewer discretion is advised. Especially in shared or public environments. Future updates may include content filtering, but for now, browse at your own risk.

### ⏳ Steam API Rate Limits:
Steam’s Web API enforces strict rate limits. While the official daily cap is around **100,000 requests**, the more critical limit is short-term: approximately **200 requests every 5 minutes**. Going beyond this threshold will trigger **HTTP 429 (Too Many Requests)** errors. In more aggressive scenarios like rapid page flipping or mass scraping, Steam may temporarily **block your IP**, which can last from a few minutes to several hours. To avoid issues, pace your requests responsibly and don’t push the limits unless you’re ready to wait.

### 👍 Safe Usage:
To avoid hitting Steam API rate limits, don’t spam multiple pages in quick succession. Keep your `perPage` game count reasonable (20 is recommended), and always allow a short delay between requests. You can tweak this delay using the `Delay_MS` and `Scrape_MS` setting in `config/constant.js`. Whenever possible, take advantage of the cached data. It loads faster and puts zero pressure on the API.

### 📜 Terms of Use:
Scraping or excessive usage beyond the intended scope of the public Steam API may violate Valve’s terms of service. Ignoring rate limits, overloading requests, or abusing endpoints can lead to **temporary IP bans** or even **permanent revocation of access**. Don’t risk it. Respect the limits. With great power comes great responsibility (and possible 403 status code).

---

## 💻 Compatibility

Currently, the app is optimized for **PC and desktop browsers**, offering the best experience on larger screens. Mobile support and responsive layouts are still under development. So UI elements may break or appear misaligned on smaller devices. Full mobile compatibility is planned for a future update.



## 👨‍💻 Setup

1. **Clone the repo**  
```
git clone https://github.com/yatozuki/Steam-Game-Library.git
```
2. **Go to project folder**  
```
cd Steam-Game-Library
```
3. **Install dependencies**  
```
npm i
```
4. **Start the server**  
```
npm start
```
**For development**  
```
npm run dev
```
5. **Open browser**  
```
localhost:3000
```
6. **Access on other devices (same Wi-Fi)**  
```
192.x.x.x:3000
```
---
## 🚀 Usage

### 🌐 Browsing the Library:

Once the server is running, you can browse Steam games using a clean, paginated UI. Each page displays game titles, thumbnails, and current prices. Click on any game’s image or title to view its detailed info. **Want to skip around?** You can jump directly to any page via URL (e.g., `http://localhost:3000/?page=3`) or access a specific game using its Steam App ID (`http://localhost:3000/game/{APP_ID}`). On each detail page, you’ll find the game’s full description and a quick-link button to open it directly in the Steam store. Fast, simple, and no manual searching needed.

### 🔍 Searching for Games:

The search feature leverages **Puppeteer** to perform real-time searches directly from Steam’s website. Unlike the official Steam API which lacks a proper text-based search endpoint. This approach uses a headless Chrome instance to scrape actual search results. This means the search can handle **partial names**, **typos**, and **fuzzy matches** with high accuracy. The only downside is it’s a bit slower like ~20 sec for 50 games, since Puppeteer needs to launch a browser and load content. But the trade-off is worth it. More reliable results, better matching, and no API limitations getting in your way.
>**Do not exceed 1000 Scrape Results** unless you’re okay with risking an IP block. Steam doesn’t like aggressive scraping. If you _really_ need to go beyond that, use a **reliable VPN** and rotate IPs carefully. But be warned,  **you do so at your own risk**. I take no responsibility for any blocks, bans, or downtime caused by misuse. Browse smart. It's recommended to keep it under 500.


### 💾 Caching and Saving Data:

The app caches fetched game data locally. When you stop the server cleanly (e.g., by pressing `Ctrl+C`), all cached data is saved as JSON files on disk. On the next start, the app loads from these files instead of fetching from Steam again, making page loads **much faster** and dramatically reducing API calls. This means browsing feels almost instant once data is saved. If you skip saving or restart the server, the app will re-download everything on each run.
>You can delete all JSON files in the `data` folder anytime. They’ll automatically regenerate when you reload the app. But why bother? There’s already around **207,000 preloaded data entries** ready to speed things up. Deleting cache only slows you down and raises the chance of hitting Steam’s rate limits. 

To keep browsing smooth and fast, always stop the server cleanly with `Ctrl+C` after you’ve loaded enough data to save your cache.

---

## 📷 Screenshots

- Game list page  
- Game detail page  
- Search result page  

---

## 🐞 Known Bugs

-  💥 Navigating to an invalid page number (beyond the available range) may cause the app to hang or crash unexpectedly. Use page numbers within the valid range to avoid issues.
    
-   ♾️ Loading the final page of results can be significantly slower than others. This may be due to Steam API limitations or network issues. I haven't figured it out yet.

---

## 📂 Note

-   Several key settings in `config/constant.js` such as games per page, scrape count per search, and delay after 429 errors can be adjusted to optimize performance and reduce issues.

-   Deleting the `cached.json` files forces the app to re-fetch all data from Steam on the next run. This is handy for refreshing data but will slow startup and increase API usage.
    
-   To reset the cache, simply delete the `.json` files in the `/data/` folder. They’ll be automatically regenerated when you reload the app.

---

## 🤝 Contributing

I welcome contributions from everyone. If you have ideas for improvements, new features, or spot any issues, feel free to open a pull request or raise an issue. Your suggestions and efforts to enhance the project are greatly appreciated.
