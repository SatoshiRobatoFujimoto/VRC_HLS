var url = require('url');
var htmlparser = require('htmlparser');
var request = require('request');

function m3u8_engine(ls_url, callback) {
    var base_url = ls_url.split('?')[0];
    switch (base_url.split('/')[2]) {
        case "www.showroom-live.com":
            var id = base_url.split('/').pop();
            url = "https://www.showroom-live.com/" + id;
            wowza_url(url, showroom, callback);
            break;
        case "www.openrec.tv":
            var id = base_url.split('/').pop();
            url = "https://www.openrec.tv/live/" + id;
            wowza_url(url, openrec, callback);
            break;
        case "www.mirrativ.com":
            var id = base_url.split('/').pop();
            url = "https://www.mirrativ.com/api/live/live?live_id=" + id;
            wowza_url(url, mirrativ, callback);
            break;
        case "www.youtube.com":
            if (ls_url.split('?').pop()) {
                var data = query_decode(ls_url.split('?').pop());
                if ('v' in data) {
                    youtube_live(data['v'], callback);
                }
            }
            break;
        default:
            callback(null);
            break;
    }
}

function youtube_live(lvid, callback) {
    const url = "https://www.youtube.com/get_video_info?&video_id=" + lvid;
    request.get(url, (err, res) => {
        var vars = query_decode(res.body);
        if (!err && vars.hlsvp) {
            var data = {
                "title": vars.title,
                "author": vars.author,
                "m3u8": vars.hlsvp,
                "thumbs": thumb_pickup(vars.player_response),
                "lvid": lvid,
                "platform": "YouTube Live",
                "provider": "YouTube"
            }
            callback(data);
        } else {
            callback(null);
        }
    });
}

function wowza_url(url, processor, callback) {
    request.get(url, (err, res, body) => {
        processor(body, (data) => {
            if (data == null) {
                callback(null);
            } else {
                callback(data);
            }
        })
    });
}

function thumb_pickup(player_response) {
    var thumbnails = JSON.parse(player_response).videoDetails.thumbnail.thumbnails;
    var response = { "size": 0, "url": "" };
    thumbnails.forEach(thumbnail => {
        if (thumbnail.width > response.size) {
            response.size = thumbnail.width;
            response.url = thumbnail.url;
        }
    });
    return response.url;
}

function html_decode(str) {
    str = str.replace(new RegExp('&quot;', 'g'), '"');
    return JSON.parse(str);
}

function query_decode(str) {
    if (str != null) {
        var res = {};
        str = str.split('&');
        str.forEach(data => {
            data = data.split('=')
            res[data[0]] = decodeURIComponent(data[1]);
        });
        return res;
    } else {
        return {};
    }
}

function mirrativ(a, b) {
    try {
        var c = JSON.parse(a);
        var d = {
            "title": c.title,
            "author": c.owner.name,
            "m3u8": c.streaming_url_hls,
            "thumbs": c.thumbnail_image_url,
            "platform": "Mirrativ",
            "provider": "Wowza"
        }
    } catch (error) {
        var d = null;
    }
    b(d);
}

function showroom(a, b) {
    var c = new htmlparser.DefaultHandler((e, f) => {
        if (e) c(e);
        var h = html_decode(htmlparser.DomUtils.getElements({ tag_name: "script", id: "js-live-data" }, f)[0].attribs['data-json']);
        if (h.streaming_url_hls == "") b(null);
        else {
            var d = {
                "title": h.room.room_name,
                "author": "",
                "m3u8": h.streaming_url_hls,
                "thumbs": h.room.image_m,
                "platform": "SHOWROOM",
                "provider": "Wowza"
            }
            b(d);
        }
    })
    var g = new htmlparser.Parser(c);
    g.parseComplete(a);
}

function openrec(a, b) {
    var c = new htmlparser.DefaultHandler((e, f) => {
        if (e) c(e);
        try {
            var d = {
                "title": htmlparser.DomUtils.getElements({ tag_name: "title" }, f)[0].children[0].raw.replace(" | OPENREC.tv", ""),
                "author": htmlparser.DomUtils.getElements({ tag_name: "div", class: "p-playbox__content__info__userframe__user__info" }, f)[0].children[1].children[1].children[0].data,
                "m3u8": null,
                "thumbs": htmlparser.DomUtils.getElements({ tag_name: "div", class: "js-data__player" }, f)[0].attribs['data-offlineimage'],
                "platform": "OPENREC.tv",
                "provider": "Wowza"
            }
            var h = htmlparser.DomUtils.getElements({ tag_name: "div", class: "js-data__player" }, f)[0].attribs['data-file'];
            var i = htmlparser.DomUtils.getElements({ tag_name: "div", class: "js-data__player" }, f)[0].attribs['data-lowlatencyfile'];
            if (i && i != '') d.m3u8 = i;
            else if (h) d.m3u8 = h;
            else d = null;
        } catch (error) {
            var d = null;
        }
        b(d);
    })
    var g = new htmlparser.Parser(c);
    g.parseComplete(a);
}

module.exports = m3u8_engine;
