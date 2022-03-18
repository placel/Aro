const Scraper = require('./scraper');
const FileSystem = require('./fileSystem');
const Command = require('./command');

const Cast = require('castv2-client').Client;
const Receiver = require('castv2-client').DefaultMediaReceiver;
const mdns = require('mdns-js');
const fs = require('fs');
const {exec} = require('child_process');

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const MOVIE = 0;
const TV = 1;
const COMMAND = -1;

const prefix = '!';
const friendlyName = "Logan's Room TV";

// https://developers.google.com/cast/docs/web_sender/advanced#sending_media_messages_to_the_receiver -- Keep track of movie time
// https://developers.google.com/cast/docs/reference/messages#MediaStatus
// https://developers.google.com/cast/docs/reference/messages#GetStatus
// https://developers.google.com/cast/docs/web_sender/advanced#resuming_a_session_without_reloading_the_web_page -- maybe this

client.once('ready', (bot) => {
  console.log('Streamer is active...')
  client.user.setActivity("");  
  exec("http-server './lib/server' --cors -192.168.2.18 -p 8080", (error, stdout, stderr) => {}); // Start the subtitle server
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith(prefix)) { return }
  const type = message.channel.name === "stream-movie" ? MOVIE : TV;
  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  const info = args.join(" ");
  var author = undefined;
  try { author = info.match(/{[a-zA-Z]+}/gm).toString().replace('{', '').replace('}', '')} catch (e) { }
  const content = info.replace(/{[a-zA-Z]+}/gm, ''); 

  if (command === 'stream' && !content.includes("cancel")) {
    let isolated = isolateData(content, type);
    const safe = await Scraper.scrapeIMDB(isolated.content, isolated.date, type);

    if (type === MOVIE) {
      const data = await Scraper.scrapeMovieURL(safe.content, safe.date);
      data.subtitleUrl = await uploadSubtitles(data.subtitleUrl, safe.content);
      castURL(safe.content, data.videoUrl, data.subtitleUrl, data.thumbnailUrl, friendlyName);
    } else {
      isolated = FileSystem.readWatchingListJSON(isolated, safe, type, author);
      const data = await Scraper.scrapeTVUrl(safe.content, safe.date, isolated.season, isolated.episode);
      data.subtitleUrl = await uploadSubtitles(data.subtitleUrl, safe.content);
      castURL(safe.content, data.videoUrl, data.subtitleUrl, data.thumbnailUrl, friendlyName);
      FileSystem.writeWatchingListJSON(data, safe, type, author);
    }

    client.user.setActivity(`${safe.content} (${safe.date})`);
  } 
  else if (command == 'command' && !content.includes("cancel")) { 
    const response = await Command.commandFilter(isolateData(content, COMMAND), author); 

    if (response != -1) { 
      const channel = client.channels.cache.find(ch => ch.name.includes(`stream-${response.channel}`));
      channel.send(response.message); 
    }
  }
});

function isolateData(message, type) {
  let isolated = {
    content: message.toLowerCase(),
    date: -1,
    season: -1,
    episode: -1
  };

  if (message.includes("from year")) {
    temp = message.split("from year");
    isolated.content = temp[0];
    isolated.date = parseInt(temp[1].trim());
  } else if (message.includes("by date")) {
    temp = message.split("by date");
    isolated.content = temp[0];
    isolated.date = parseInt(temp[1].trim());
  } else if (message.includes("by year")) {
    temp = message.split("by year");
    isolated.content = temp[0];
    isolated.date = parseInt(temp[1].trim());
  }
  if (type === MOVIE) {

  } else if (type === TV) {
    try {
      let extract = message.split(",")
      isolated.content = extract[0].trim();
      isolated.episode = parseInt(extract[1].trim());
    } catch (e) { }

    if (isolated.content.toLowerCase().includes("season")) {
      let extract = isolated.content.split("season")
      isolated.content = extract[0].trim()
      isolated.season = parseInt(extract[1].trim())
    }
  }

  isolated.content = isolated.content.toLowerCase();
  return isolated;
}

function castURL(content, videoUrl, subtitleUrl, thumbnailUrl, friendlyName) {
  var browser = mdns.createBrowser(mdns.tcp('googlecast'));
      
  browser.on('ready', function onReady() {
    browser.discover();
  });
  
  browser.on('update', function onUpdate(data) {
    if (data.type[0].name === 'googlecast') {
      if (data['txt'][6].includes(`fn=${friendlyName}`)) { 
        ondeviceup(content, videoUrl, subtitleUrl, thumbnailUrl, data['addresses'][0]); 
        browser.stop(); 
      }
    }
  });

  setTimeout(function onTimeout() {
    browser.stop();
  }, 5000);
}

function ondeviceup(content, videoUrl, subtitleUrl, thumbnailUrl, host) {
    var client = new Cast();
  
    client.connect(host, function() {
      console.log('connected, launching app ...');
      
      client.launch(Receiver, function(err, player) {
        
        var media = {
  
          // Here you can plug a URL to any mp4, webm, mp3 or jpg file with the proper contentType.
          contentId: videoUrl,
          contentType: 'video/mp4',
          streamType: 'BUFFERED', // or LIVE

          textTrackStyle: {
            backgroundColor: '#FFFFFF00', // FFFFFF is for white, and 00 is for opacity
            foregroundColor: '#FFFFFFFF', // see http://dev.w3.org/csswg/css-color/#hex-notation
            edgeType: 'DROP_SHADOW', // can be: "NONE", "OUTLINE", "DROP_SHADOW", "RAISED", "DEPRESSED"
            edgeColor: '#00000095', // see http://dev.w3.org/csswg/css-color/#hex-notation
            fontScale: 1, // transforms into "font-size: " + (fontScale*100) +"%"
            fontStyle: 'BOLD', // can be: "NORMAL", "BOLD", "BOLD_ITALIC", "ITALIC",
            fontFamily: 'Verdana', // specific font family
            fontGenericFamily: 'SANS_SERIF', // can be: "SANS_SERIF", "MONOSPACED_SANS_SERIF", "SERIF", "MONOSPACED_SERIF", "CASUAL", "CURSIVE", "SMALL_CAPITALS",
            windowType: 'NONE' // can be: "NONE", "NORMAL", "ROUNDED_CORNERS"
          },

          tracks: [{
              trackId: 1,
              type: 'TEXT',
              trackContentId: `http://192.168.2.18:8080/subtitles/${subtitleUrl}`,
              trackContentType: 'text/vtt',
              name: 'English',
              language: 'en-US',
              subtype: 'SUBTITLES'
          }],  
  
            // Title and cover displayed while buffering
            // https://developers.google.com/cast/docs/reference/messages#TvShowMediaMetadata -- Display more info
          metadata: {
            type: 0,
            metadataType: 0,
            title: content, 
            images: [
              { url: thumbnailUrl }
            ],
          },
          
        };
  
        // player.on('status', function(status) {
        //   console.log('status broadcast playerState=%s', status.playerState);
        // });
  
        player.load(media, { autoplay: true, activeTrackIds: [1]}, function(err, status) {

          // If successful, try deleting VTT file right away so subtitle files don't build up
          try { console.log('media loaded playerState=%s', status.playerState); } catch (e) { console.log(err);}

          // // Seek to 2 minutes after 15 seconds playing.
          // setTimeout(function() {
          //   player.seek(2*60, function(err, status) {
          //     //
          //   });
          // }, 15000);
  
        });

      

      });
    });
  
    client.on('error', function(err) {
      console.log('Error: %s', err.message);
      client.close();
    });
}

async function uploadSubtitles(url, content) {
  const response = await Scraper.scrapeSubtitles(url);
  if (!response) { return }

  const vtt = convertToVTT(response);
  const file = `${content}En${Math.round(Math.random() * 100)}.vtt`;
  fs.writeFileSync(`./lib/server/subtitles/${file}`, vtt);

  return file
}

function convertToVTT(data) {
  let srt = data.replace(/\r+/g, '').replace(/^\s+|\s+$/g, '');
  let cueList = srt.split('\n\n');
  let vtt = "WEBVTT\n\n";

  cueList.forEach((caption) => {
    try { vtt += createVTTCue(caption) } catch (e) { }
  });

  return vtt;
}

function createVTTCue(caption) {
  // https://github.com/silviapfeiffer/silviapfeiffer.github.io/blob/master/index.html
  let cue = "";
  let s = caption.split(/\n/);

  while (s.length > 3) {
    for (let i = 3; i < s.length; i++) {
        s[2] += "\n" + s[i]
    }
    s.splice(3, s.length - 3);
  }
  let line = 0;

  if (!s[0].match(/\d+:\d+:\d+/) && s[1].match(/\d+:\d+:\d+/)) {
    cue += s[0].match(/\w+/) + "\n";
    line += 1;
  }

  if (s[line].match(/\d+:\d+:\d+/)) {
    let m = s[1].match(/(\d+):(\d+):(\d+)(?:,(\d+))?\s*--?>\s*(\d+):(\d+):(\d+)(?:,(\d+))?/);
    if (m) {
      cue += m[1]+":"+m[2]+":"+m[3]+"."+m[4]+" --> " +m[5]+":"+m[6]+":"+m[7]+"."+m[8]+"\n";
      line += 1;
    }
  } 

  if (s[line]) { cue += s[line] + "\n\n"; }
  return cue;
}

client.login('OTE3NTU4NDgyMjY0MjY4ODcw.Ya6c7Q.Sy3k0QXZlcwxk8M8xljnTQWnQsA');

// OTE3NTU4NDgyMjY0MjY4ODcw.Ya6c7Q.f7bc3nlGqsO0qvDQM5djHUBx9aI