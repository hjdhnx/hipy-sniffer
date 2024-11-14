// 开始处理
export default {
    async fetch(request, env) {
        env.localProxyUrl = env.localProxyUrl || "https://live.playdreamer.cn/";
        const localUrl = new URL(request.url);
        proxyUrl = localUrl.origin;
        return await handleRequest(request, env);
    },
};

// 搜索
async function searchContent(keywords, page, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';
    const items = [];
    const url = `${localProxyUrl}https://huaren.live/vodsearch/page/${page}/wd/${keywords}.html`
    const response = await fetch(url, {
        method: 'GET',
        headers: header,
        cf: {
            timeout: 30000
        }
    });
    const text = await response.text();

    let maxPage;
    try {
        maxPage = parseInt(text.match(/<div class="page-tip.*?">共\d+条数据,当前\d+\/(\d+)页<\/div>/)[1]);
    } catch (error) {
        maxPage = page;
    }

    const vodList = text.match(/<div class="public-list-box search-box flex rel">(.*?)<\/a><\/div><\/div><\/div>/g) || [];

    for (const vod of vodList) {
        const match = vod.match(/<a target="_self" href="\/.*?\/(\d+).html">(.*?)<\/a>/);
        const sid = match[1];
        const name = match[2].trim();
        const pic = vod.match(/<img class="lazy lazy1 gen-movie-img mask-1" alt=".*?" referrerpolicy="no-referrer" src=".*?" data-src="(.*?)" \/>/)[1];
        const remark = vod.match(/<span class="public-list-prb.*?">(.*?)<\/span>/)[1].trim();

        items.push({
            vod_id: sid,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remark
        });
    }

    const result = {
        list: items,
        hasNextPage: page < maxPage,
        url: url
    };
    return result;
}

// 详情
async function detailContent(ids, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';
    const response = await fetch(`${localProxyUrl}https://api.huaren.live/index.php//dp?id=${ids}`, {
        method: 'POST',
        headers: header,
        cf: {
            timeout: 30000
        }
    });
    const videoInfos = await response.json();

    const vod = {
        vod_id: ids,
        vod_name: videoInfos.name,
        vod_year: videoInfos.year.trim(),
    };
    let playUrl = '';
    let playFrom = '';

    for (const video of videoInfos.url) {
        playFrom += `${video.from}$$$`;
        for (const url of video.url) {
            playUrl += `${url.name}$${btoa(url.url)}#`;
        }
        playUrl = playUrl.replace(/#$/, '') + '$$$';
    }

    playUrl = playUrl.replace(/\$\$\$$/, '');
    playFrom = playFrom.replace(/\$\$\$$/, '');

    vod.vod_play_from = playFrom;
    vod.vod_play_url = playUrl;

    const result = {list: [vod]};
    return result;
}

// 播放
async function playerContent(pid, proxyUrl) {
    header['Content-Type'] = 'application/x-mpegURL';
    const url = `${proxyUrl}/proxyM3u8?url=${pid}&type=m3u8`;
    const result = {
        parse: 0,
        header: header,
        url: url
    };
    return result;
}

// 获取 M3U8 内容
async function getM3U8(url, proxyUrl, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';

    let useLocalProxyUrl = false;
    if (line.includes('huaren.')) {
        url = `${localProxyUrl}${url}`;
        useLocalProxyUrl = true;
    }
    const response = await fetch(url, {
        headers: header,
        cf: {
            timeout: 30000
        }
    });
    const lines = await response.text();
    let m3u8Str = "";
    const linesArray = lines.split("\n");

    for (let line of linesArray) {
        if (line.length > 0 && !line.startsWith("#")) {
            if (!line.startsWith('http')) {
                if (line.startsWith('/')) {
                    line = url.substring(0, url.indexOf('/', 8)) + line;
                } else {
                    line = url.substring(0, url.lastIndexOf('/') + 1) + line;
                }
            }
            if (line.includes('.m3u8') && !line.includes('.ts')) {
                m3u8Str += proxyUrl + "/proxyM3u8?url=" + btoa(line) + "\n";
            } else {
                if (useLocalProxyUrl) {
                    m3u8Str += localProxyUrl + btoa(line) + "\n";
                } else {
                    m3u8Str += proxyUrl + "/proxyMedia?url=" + btoa(line) + "\n";
                }
            }
        } else {
            if (line.includes('URI=')) {
                const uriMatch = line.match(/URI="(.*?)"/);
                if (uriMatch) {
                    let URI = uriMatch[1];
                    let fullURI;
                    if (URI.startsWith('/')) {
                        fullURI = url.substring(0, url.indexOf('/', 8)) + URI;
                    } else {
                        fullURI = url.substring(0, url.lastIndexOf('/') + 1) + URI;
                    }
                    if (fullURI.includes('.m3u8') && !fullURI.includes('.ts')) {
                        fullURI = proxyUrl + "/proxyM3u8?url=" + btoa(fullURI);
                    } else {
                        if (useLocalProxyUrl) {
                            fullURI = localProxyUrl + btoa(fullURI);
                        } else {
                            fullURI = proxyUrl + "/proxyMedia?url=" + btoa(fullURI);
                        }
                    }
                    const regex = new RegExp(URI, 'g');
                    line = line.replace(regex, fullURI);
                }
            }
            m3u8Str += line + "\n";
        }
    }
    return "m3u-" + m3u8Str.trim();
}

async function handleRequest(request, env) {
    const localUrl = new URL(request.url);
    const parsedLocalUrl = new URL(localUrl.href);
    const proxyUrl = parsedLocalUrl.protocol + "//" + parsedLocalUrl.host
    const path = localUrl.pathname;
    const params = localUrl.searchParams;
    try {
        // 点播爬虫
        if (path === "/vod") {
            let content;
            const wd = params.get("wd");
            const ids = params.get("ids");
            const play = params.get("play");
            if (wd !== null) {
                // 搜索
                let page;
                page = params.get("pg");
                if (page === null) {
                    page = 1
                } else {
                    page = parseInt(page);
                }
                content = await searchContent(wd, page, env);
            } else if (ids !== null) {
                // 详情
                content = await detailContent(ids, env)
            } else if (play !== null) {
                // 播放
                content = await playerContent(play, proxyUrl)
            } else {
                content = {};
            }
            return new Response(JSON.stringify(content, null, 2), {
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8'
                }
            });
        }

        // 代理 M3U8
        else if (path === "/proxyM3u8") {
            const urlStr = params.get("url");
            const url = atob(urlStr);
            const content = await getM3U8(url, proxyUrl, env);
            return new Response(content.slice(4), {
                headers: {
                    "Content-Type": "application/vnd.apple.mpegurl",
                    "Content-Disposition": "attachment; filename=huaren.m3u8",
                },
            });
        }
        // 代理 切片
        else if (path === "/proxyMedia") {
            const urlStr = params.get("url");
            const url = atob(urlStr);
            const responseHeaders = new Headers();

            for (const [key, value] of request.headers.entries()) {
                if (key.toLowerCase() === "host") {
                    continue;
                }
                responseHeaders.set(key, value);
            }

            const response = await fetch(url, {
                method: request.method,
                body: request.body,
                headers: responseHeaders,
                cf: {
                    timeout: 30000
                }
            });
            const contentType = response.headers.get("content-type");
            const lowerContentType = contentType.toLowerCase();
            const statusCode = response.status;

            for (const [key, value] of response.headers) {
                const lowerKey = key.toLowerCase();
                if (lowerKey === "connection" || lowerKey === "transfer-encoding") {
                    continue;
                }
                if (lowerContentType === "application/vnd.apple.mpegurl" || lowerContentType === "application/x-mpegurl") {
                    if (lowerKey === "content-length" || lowerKey === "content-range" || lowerKey === "accept-ranges") {
                        continue;
                    }
                }
                responseHeaders.set(key, value);
            }

            // 添加 CORS 头部，允许跨域访问
            responseHeaders.set('Access-Control-Allow-Origin', '*');
            responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            responseHeaders.set('Access-Control-Allow-Headers', '*');

            const readableStream = new ReadableStream({
                start(controller) {
                    const reader = response.body.getReader();

                    function read() {
                        reader.read()
                            .then(({
                                       done,
                                       value
                                   }) => {
                                if (done) {
                                    controller.close();
                                    return;
                                }
                                controller.enqueue(value);
                                read();
                            });
                    }

                    read();
                },
            });

            return new Response(readableStream, {
                status: statusCode,
                headers: responseHeaders,
            });
        } else if (path.startsWith('/http')) {
            return await fetch(path.slice(1), {
                method: request.method,
                body: request.body,
                headers: header,
                cf: {
                    timeout: 30000
                }
            })
        } else {
            return new Response(`错误：${path}`, {
                status: 404
            });
            // return new Response(html, {
            // 	headers: {
            // 		'Content-Type': 'text/html'
            // 	}
            // });
        }
    } catch (erro) {
        console.error(erro.message)
        return new Response(`错误：${erro}`, {
            status: 404
        });
    }
}

let proxyUrl;
let header = {
    "Referer": "https://huaren.live/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"
};
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"><title>404</title><style>body,html{background:#28254c;font-family:Ubuntu}*{box-sizing:border-box}.box{width:350px;height:100%;max-height:600px;min-height:450px;background:#332f63;border-radius:20px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:30px 50px}.box .box__ghost{padding:15px 25px 25px;position:absolute;left:50%;top:30%;transform:translate(-50%,-30%)}.box .box__ghost .symbol:nth-child(1){opacity:.2;animation:shine 4s ease-in-out 3s infinite}.box .box__ghost .symbol:nth-child(1):after,.box .box__ghost .symbol:nth-child(1):before{content:'';width:12px;height:4px;background:#fff;position:absolute;border-radius:5px;bottom:65px;left:0}.box .box__ghost .symbol:nth-child(1):before{transform:rotate(45deg)}.box .box__ghost .symbol:nth-child(1):after{transform:rotate(-45deg)}.box .box__ghost .symbol:nth-child(2){position:absolute;left:-5px;top:30px;height:18px;width:18px;border:4px solid;border-radius:50%;border-color:#fff;opacity:.2;animation:shine 4s ease-in-out 1.3s infinite}.box .box__ghost .symbol:nth-child(3){opacity:.2;animation:shine 3s ease-in-out .5s infinite}.box .box__ghost .symbol:nth-child(3):after,.box .box__ghost .symbol:nth-child(3):before{content:'';width:12px;height:4px;background:#fff;position:absolute;border-radius:5px;top:5px;left:40px}.box .box__ghost .symbol:nth-child(3):before{transform:rotate(90deg)}.box .box__ghost .symbol:nth-child(3):after{transform:rotate(180deg)}.box .box__ghost .symbol:nth-child(4){opacity:.2;animation:shine 6s ease-in-out 1.6s infinite}.box .box__ghost .symbol:nth-child(4):after,.box .box__ghost .symbol:nth-child(4):before{content:'';width:15px;height:4px;background:#fff;position:absolute;border-radius:5px;top:10px;right:30px}.box .box__ghost .symbol:nth-child(4):before{transform:rotate(45deg)}.box .box__ghost .symbol:nth-child(4):after{transform:rotate(-45deg)}.box .box__ghost .symbol:nth-child(5){position:absolute;right:5px;top:40px;height:12px;width:12px;border:3px solid;border-radius:50%;border-color:#fff;opacity:.2;animation:shine 1.7s ease-in-out 7s infinite}.box .box__ghost .symbol:nth-child(6){opacity:.2;animation:shine 2s ease-in-out 6s infinite}.box .box__ghost .symbol:nth-child(6):after,.box .box__ghost .symbol:nth-child(6):before{content:'';width:15px;height:4px;background:#fff;position:absolute;border-radius:5px;bottom:65px;right:-5px}.box .box__ghost .symbol:nth-child(6):before{transform:rotate(90deg)}.box .box__ghost .symbol:nth-child(6):after{transform:rotate(180deg)}.box .box__ghost .box__ghost-container{background:#fff;width:100px;height:100px;border-radius:100px 100px 0 0;position:relative;margin:0 auto;animation:upndown 3s ease-in-out infinite}.box .box__ghost .box__ghost-container .box__ghost-eyes{position:absolute;left:50%;top:45%;height:12px;width:70px}.box .box__ghost .box__ghost-container .box__ghost-eyes .box__eye-left{width:12px;height:12px;background:#332f63;border-radius:50%;margin:0 10px;position:absolute;left:0}.box .box__ghost .box__ghost-container .box__ghost-eyes .box__eye-right{width:12px;height:12px;background:#332f63;border-radius:50%;margin:0 10px;position:absolute;right:0}.box .box__ghost .box__ghost-container .box__ghost-bottom{display:flex;position:absolute;top:100%;left:0;right:0}.box .box__ghost .box__ghost-container .box__ghost-bottom div{flex-grow:1;position:relative;top:-10px;height:20px;border-radius:100%;background-color:#fff}.box .box__ghost .box__ghost-container .box__ghost-bottom div:nth-child(2n){top:-12px;margin:0 0;border-top:15px solid #332f63;background:0 0}.box .box__ghost .box__ghost-shadow{height:20px;box-shadow:0 50px 15px 5px #3b3769;border-radius:50%;margin:0 auto;animation:smallnbig 3s ease-in-out infinite}.box .box__description{position:absolute;bottom:30px;left:50%;transform:translateX(-50%)}.box .box__description .box__description-container{color:#fff;text-align:center;width:200px;font-size:16px;margin:0 auto}.box .box__description .box__description-container .box__description-title{font-size:24px;letter-spacing:.5px}.box .box__description .box__description-container .box__description-text{color:#8c8aa7;line-height:20px;margin-top:20px}.box .box__description .box__button{display:block;position:relative;background:#ff5e65;border:1px solid transparent;border-radius:50px;height:50px;text-align:center;text-decoration:none;color:#fff;line-height:50px;font-size:18px;padding:0 70px;white-space:nowrap;margin-top:25px;transition:background .5s ease;overflow:hidden}.box .box__description .box__button:before{content:'';position:absolute;width:20px;height:100px;background:#fff;bottom:-25px;left:0;border:2px solid #fff;transform:translateX(-50px) rotate(45deg);transition:transform .5s ease}.box .box__description .box__button:hover{background:0 0;border-color:#fff}.box .box__description .box__button:hover:before{transform:translateX(250px) rotate(45deg)}@keyframes upndown{0%{transform:translateY(5px)}50%{transform:translateY(15px)}100%{transform:translateY(5px)}}@keyframes smallnbig{0%{width:90px}50%{width:100px}100%{width:90px}}@keyframes shine{0%{opacity:.2}25%{opacity:.1}50%{opacity:.2}100%{opacity:.2}}</style></head><body><div class="box"><div class="box__ghost"><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="box__ghost-container"><div class="box__ghost-eyes"><div class="box__eye-left"></div><div class="box__eye-right"></div></div><div class="box__ghost-bottom"><div></div><div></div><div></div><div></div><div></div></div></div><div class="box__ghost-shadow"></div></div><div class="box__description"><div class="box__description-container"><div class="box__description-title">404错误！</div><div class="box__description-text">404错误！</div></div><a href="#" class="box__button">返回</a></div></div><script>var pageX=$(document).width(),pageY=$(document).height(),mouseY=0,mouseX=0;$(document).mousemove(function(e){mouseY=e.pageY,yAxis=(pageY/2-mouseY)/pageY*300,mouseX=e.pageX/-pageX,xAxis=100*-mouseX-100,$(".box__ghost-eyes").css({transform:"translate("+xAxis+"%,-"+yAxis+"%)"})})</script></body></html>`