import express from 'express';
import axios from 'axios';
import compression from 'compression';

const app = express();
const port = process.env.PORT || 3000;
const steam_API = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
const steam_API_details = 'https://store.steampowered.com/api/appdetails?appids=';

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(compression());

app.get('/', (req, res) => {
    res.render('home.ejs')
})

app.get('/detail', (req, res) => {
    res.render('detail.ejs')
})








app.listen(port,() => {
    console.log('Server is running on port', port);
    
})