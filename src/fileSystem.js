const fs = require('fs');
const MOVIE = 0, TV = 1, RANDOM = 2;
const dir = './lib/server/profiles';

function readWatchingListJSON(isolated, safe, type, author) {
    const userName = author;

    if (type === MOVIE) { } 
    else {
        const rawData = fs.readFileSync(`${dir}/${userName}Data/watchingListTV.json`);
        let watchingList = {};
        try { watchingList = JSON.parse(rawData); } catch (e) { }

        // Problem: 'The Office season 6'; if found in watching it will play season 6, with the up-next episode no matter the season
        if (isolated.season === -1) {
            try { isolated.season = watchingList[`${safe.content} (${safe.date})`].season; } 
            catch (e) { isolated.season = 1; }
        }
        
        if (isolated.episode === -1) {
            try { isolated.episode = watchingList[`${safe.content} (${safe.date})`].episode; } 
            catch (e) { isolated.episode = 1; }
        }
    }

    return {season: isolated.season, episode: isolated.episode }
}
  
function writeWatchingListJSON(data, safe, type, author) {
    const userName = author

    if (type === MOVIE) { } 
    else {
        const rawData = fs.readFileSync(`${dir}/${userName}Data/watchingListTV.json`);
        let watchingList = {};
        try { watchingList = JSON.parse(rawData); } catch (e) { }
        
        watchingList[`${safe.content} (${safe.date})`] = {};
        watchingList[`${safe.content} (${safe.date})`].season = data.season;
        watchingList[`${safe.content} (${safe.date})`].episode = data.episode;

        fs.writeFileSync(`${dir}/${userName}Data/watchingListTV.json`, JSON.stringify(watchingList));
    }
}

// check if the content asked to be played is in the watchlist; if so, delete from list.json
function readListJSON(safe, type, author) {
    const userName = author

    if (type === MOVIE) { 
        const rawData = fs.readFileSync(`${dir}/${userName}Data/listMovie.json`);
        let list = [];
        try { list = JSON.parse(rawData); } catch (e) { }
        const index = Math.floor(Math.random() * list.length);
        const content = list[index].replace(/\(\d\d\d\d\)/g, '');
        
        list.splice(index, 1);
        fs.writeFileSync(`${dir}/${userName}Data/listMovie.json`, JSON.stringify(list));
        
        return { content: content, type: 'movie' }
    } 
    else if (type === TV) {
        const rawData = fs.readFileSync(`${dir}/${userName}Data/listTV.json`);
        let list = [];
        try { list = JSON.parse(rawData); } catch (e) { }
        const index = Math.floor(Math.random() * list.length);
        const content = list[index].replace(/\(\d\d\d\d\)/g, '');
        
        list.splice(index, 1);
        fs.writeFileSync(`${dir}/${userName}Data/listTV.json`, JSON.stringify(list));

        return { content: content, type: 'tv' }
    } 
    else if (type === RANDOM) {
        const type = Math.floor(Math.random() * 2) +1;
        const file = type === MOVIE ? 'Movie' : 'TV';
        const rawData = fs.readFileSync(`${dir}/${userName}Data/list${file}.json`);

        let list = [];
        try { list = JSON.parse(rawData); } catch (e) { }

        const index = Math.floor(Math.random() * list.length);
        const content = list[index].replace(/\(\d\d\d\d\)/g, '');
        
        list.splice(index, 1);
        fs.writeFileSync(`${dir}/${userName}Data/listTV.json`, JSON.stringify(list));

        let channelType = type === MOVIE ? 'movie' : 'tv';
        return { content: content, type: channelType }
    }
}

function writeListJSON(safe, type, author) {
    const userName = author;

    if (type === MOVIE) { 
        const rawData = fs.readFileSync(`${dir}/${userName}Data/listMovie.json`);
        let list = [];
        try { list = JSON.parse(rawData); } catch (e) { }
        list.push(`${safe.content} (${safe.date})`);

        fs.writeFileSync(`${dir}/${userName}Data/listMovie.json`, JSON.stringify(list));
    } 
    else if (type === TV) {        
        const rawData = fs.readFileSync(`${dir}/${userName}Data/listTV.json`);
        let list = [];
        try { list = JSON.parse(rawData); } catch (e) { }
        list.push(`${safe.content} (${safe.date})`);

        fs.writeFileSync(`${dir}/${userName}Data/listTV.json`, JSON.stringify(list));
    }
}

function createNewProfile(userName) {
    const newDir = `${dir}/${userName}Data`;
    try { fs.mkdirSync( `${newDir}`, { recursive: true }); } catch (e) { console.log("Profile Already Exist."); return }

    try {
        fs.writeFile(`${newDir}/listMovie.json`, '[]', (e) => { });
        fs.writeFile(`${newDir}/listTV.json`, '[]', (e) => { });
        fs.writeFile(`${newDir}/watchingListMovie.json`, '{}', (e) => { });
        fs.writeFile(`${newDir}/watchingListTV.json`, '{}', (e) => { });
    } catch (e) { }

    // const rawData = fs.readFileSync(`./lib/server/profiles/profiles.json`);
    // let profileList = {};
    // try { profileList = JSON.parse(rawData); } catch (e) { }
    // profileList[`${author}`] = userName;

    // fs.writeFile(`./lib/server/profiles/profiles.json`, JSON.stringify(profileList), (e) => { });
}

module.exports = { readWatchingListJSON, writeWatchingListJSON, readListJSON, writeListJSON, createNewProfile };