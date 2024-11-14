/*
需添加环境变量localProxyUrl
localProxyUrl添加方式：
变量名称：localProxyUrl
值：你的转发地址
*/

// 开始处理
export default {
    async fetch(request, env) {
        env.localProxyUrl = env.localProxyUrl || proxyUrls[1]
        return await handleRequest(request, env);
    },
};

const proxyUrls = [
    'http://mediaproxy.fongmi.leuse.top/?url=',
    'https://mediaproxy.leuse.top/?url=',
    'http://mediaproxy.vpsdn.leuse.top/?url=',
    'https://mediaproxy.luci.rbtv.top/?url=',
];

// 搜索
async function searchContent(keywords, page, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';
    const items = [];
    const response = await fetch(`${localProxyUrl}https://huaren.live/vodsearch/page/${page}/wd/${keywords}.html`, {
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
        hasNextPage: page < maxPage
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

// 直播
async function live(proxyUrl, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';

    let content = '#EXTM3U\n';
    let tid = 1;

    for (const channels of channelsList) {
        for (const channel of channels.channels) {
            content += `#EXTINF:-1 tvg-id="${tid}" tvg-name="${channel.name}" tvg-logo="${localProxyUrl}${channel.logo}" group-title="${channels.group}",${channel.name}\n${proxyUrl}/live?url=${btoa(channel.url)}\n`;
            tid += 1;
        }
    }
    return content.replace(/\n$/, '');
}

// 获取直播地址
async function liveContent(url, proxyUrl, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';
    const response = await fetch(`${localProxyUrl}${url}`, {
        headers: header,
        cf: {
            timeout: 30000
        }
    });
    const text = await response.text();
    const line = text.match(/dplayer\.php\?url=(https.*?m3u8)/)[1];
    const content = await getM3U8(line, proxyUrl, env)
    return content
}

// 获取 M3U8 内容
async function getM3U8(url, proxyUrl, env) {
    let localProxyUrl = env.localProxyUrl;
    localProxyUrl = typeof localProxyUrl !== 'undefined' ? localProxyUrl : '';

    let useLocalProxyUrl = false;
    if (url.includes('huaren.')) {
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
                    m3u8Str += localProxyUrl + line + "\n";
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
                            fullURI = localProxyUrl + fullURI;
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
    const proxyUrl = localUrl.origin;
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
        // 直播爬虫
        else if (path === "/live") {
            const urlStr = params.get("url");
            if (urlStr !== null) {
                const url = atob(urlStr);
                const content = await liveContent(url, proxyUrl, env)
                return new Response(content.slice(4), {
                    headers: {
                        "Content-Type": "application/vnd.apple.mpegurl",
                        "Content-Disposition": "attachment; filename=huaren.m3u8",
                    },
                });
            } else {
                const content = await live(proxyUrl, env)
                return new Response(content, {
                    headers: {
                        'Content-Type': 'text/plain;charset=UTF-8'
                    }
                });
            }

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
        } else {
            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html'
                }
            });
        }
    } catch (erro) {
        console.error(erro.message)
        return new Response(`错误：${erro}`, {
            status: 404
        });
    }
}

let header = {
    "Referer": "https://huaren.live/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"
};
const channelsList = [{
    'group': '央视',
    'channels': [{
        'name': 'CCTV1综合',
        'url': 'https://huaren.live/viv/detail/id/538/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv1.jpg'
    }, {
        'name': 'CCTV2经济',
        'url': 'https://huaren.live/viv/detail/id/539/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv2.jpg'
    }, {
        'name': 'CCTV3综艺',
        'url': 'https://huaren.live/viv/detail/id/540/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv3.jpg'
    }, {
        'name': 'CCTV4中文国际',
        'url': 'https://huaren.live/viv/detail/id/541/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv4.jpg'
    }, {
        'name': 'CCTV5体育',
        'url': 'https://huaren.live/viv/detail/id/536/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv5.jpg'
    }, {
        'name': 'CCTV5+体育赛事',
        'url': 'https://huaren.live/viv/detail/id/537/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240323-1/fdb5649b176a44ff6a26667bd92c3ccd.jpeg'
    }, {
        'name': 'CCTV6电影',
        'url': 'https://huaren.live/viv/detail/id/611/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241031-1/127d1d5a2369bcb8d367b69e523eb24c.jpg'
    }, {
        'name': 'CCTV7军事',
        'url': 'https://huaren.live/viv/detail/id/542/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv7.jpg'
    }, {
        'name': 'CCTV8电视剧',
        'url': 'https://huaren.live/viv/detail/id/612/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241031-1/2194ed25b2105c7a846b725514647e20.jpg'
    }, {
        'name': 'CCTV9纪录片',
        'url': 'https://huaren.live/viv/detail/id/543/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv9.jpg'
    }, {
        'name': 'CCTV10科教',
        'url': 'https://huaren.live/viv/detail/id/544/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv10.jpg'
    }, {
        'name': 'CCTV11戏曲',
        'url': 'https://huaren.live/viv/detail/id/545/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv11.png'
    }, {
        'name': 'CCTV12社会与法',
        'url': 'https://huaren.live/viv/detail/id/546/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv12.jpg'
    }, {
        'name': 'CCTV-13新闻',
        'url': 'https://huaren.live/viv/detail/id/547/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv13.png'
    }, {
        'name': 'CCTV14少儿',
        'url': 'https://huaren.live/viv/detail/id/548/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv14.jpg'
    }, {
        'name': 'CCTV15音乐频道',
        'url': 'https://huaren.live/viv/detail/id/613/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241031-1/c9b645ce11e2b5f1159011ede4921ed5.png'
    }, {
        'name': 'CCTV16奥运频道',
        'url': 'https://huaren.live/viv/detail/id/535/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv16.png'
    }]
}, {
    'group': '卫视',
    'channels': [{
        'name': '湖南卫视',
        'url': 'https://huaren.live/viv/detail/id/554/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/hnws.jpg'
    }, {
        'name': '浙江卫视',
        'url': 'https://huaren.live/viv/detail/id/556/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/zj.png'
    }, {
        'name': '深圳卫视',
        'url': 'https://huaren.live/viv/detail/id/557/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/szws.jpg'
    }, {
        'name': '山东卫视',
        'url': 'https://huaren.live/viv/detail/id/552/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/sdws.jpg'
    }, {
        'name': '安徽卫视',
        'url': 'https://huaren.live/viv/detail/id/615/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241031-1/a688dba3baefe0e799f072509006880f.jpg'
    }, {
        'name': '江苏卫视',
        'url': 'https://huaren.live/viv/detail/id/553/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/jsws.jpg'
    }, {
        'name': '辽宁卫视',
        'url': 'https://huaren.live/viv/detail/id/616/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241031-1/fed5b6ec471cffb253f7c37037750afb.jpg'
    }, {
        'name': '四川卫视',
        'url': 'https://huaren.live/viv/detail/id/614/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241031-1/d2ced172eabc392982743d5bd7a72745.jpg'
    }, {
        'name': '天津卫视',
        'url': 'https://huaren.live/viv/detail/id/551/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/tjws.jpeg'
    }, {
        'name': '重庆卫视',
        'url': 'https://huaren.live/viv/detail/id/555/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cqws.jpg'
    }, {
        'name': '东方卫视',
        'url': 'https://huaren.live/viv/detail/id/549/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/dfws.jpg'
    }, {
        'name': '北京卫视',
        'url': 'https://huaren.live/viv/detail/id/550/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/bjws.jpg'
    }, {
        'name': '广东卫视',
        'url': 'https://huaren.live/viv/detail/id/573/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240830-1/b879989a4e83119e868f630c9594b49e.jpg'
    }]
}, {
    'group': '港台',
    'channels': [{
        'name': 'VIUTV6',
        'url': 'https://huaren.live/viv/detail/id/608/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241007-1/75e7c8014cdec52ad4ade9f83f6bd8aa.jpg'
    }, {
        'name': 'ViuTV',
        'url': 'https://huaren.live/viv/detail/id/572/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/e6b3e3894035e1d466ee944d181c638e.png'
    }, {
        'name': 'Hoy77',
        'url': 'https://huaren.live/viv/detail/id/617/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241105-1/19be49e3f73eee636632ca4955187194.jpg'
    }, {
        'name': 'HOY78资讯台',
        'url': 'https://huaren.live/viv/detail/id/636/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/f24ec246f98fe30bbc864c26ce8a3020.jpg'
    }, {
        'name': '凤凰卫视',
        'url': 'https://huaren.live/viv/detail/id/570/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/f0a3eee10e10d200a22f30546aa07d2b.jpeg'
    }, {
        'name': '凤凰资讯',
        'url': 'https://huaren.live/viv/detail/id/571/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/fcbb67fad4182afbe4a953bf35b72c99.jpeg'
    }, {
        'name': 'NOW爆谷台',
        'url': 'https://huaren.live/viv/detail/id/609/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241007-1/f719ca03c9991b7fdb17da8db0bfc6aa.jpg'
    }, {
        'name': '龍華日韓台',
        'url': 'https://huaren.live/viv/detail/id/628/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241104-1/3b10388e1f6f6cfe1dfa3b31f6483c00.png'
    }, {
        'name': '黄金翡翠',
        'url': 'https://huaren.live/viv/detail/id/579/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/6314888cb36a74179b09839cacbe382d.jpg'
    }, {
        'name': 'Now星影台',
        'url': 'https://huaren.live/viv/detail/id/626/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/db39a4a76a1bc4b8b80e4c818b963097.jpg'
    }, {
        'name': '靖天電影台',
        'url': 'https://huaren.live/viv/detail/id/623/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/d13bbbdb0d8f9e84c01d61587fad4037.png'
    }, {
        'name': '美亞電影台',
        'url': 'https://huaren.live/viv/detail/id/622/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/8fee95cfae19126f44c51e423b086e4c.jpg'
    }, {
        'name': '明珠台',
        'url': 'https://huaren.live/viv/detail/id/624/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/4f3be3c8600953165356ad92a2283535.png'
    }, {
        'name': 'TVB星河台',
        'url': 'https://huaren.live/viv/detail/id/625/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/139db8848362be81a6370c6b9ea59c4d.jpg'
    }, {
        'name': '千禧經典台',
        'url': 'https://huaren.live/viv/detail/id/621/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/39a78d25458bc9706ada257c7ea9dac4.jpg'
    }, {
        'name': 'PopC',
        'url': 'https://huaren.live/viv/detail/id/620/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/3a9590080b18108a27d6ec644cf9ff1a.jpeg'
    }, {
        'name': '娛樂新聞台',
        'url': 'https://huaren.live/viv/detail/id/619/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/ec155092735c8b362a720412fd86304a.jpg'
    }, {
        'name': '龍華電影台',
        'url': 'https://huaren.live/viv/detail/id/630/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/ae5d7c2d35ee63784dcaf6648797fc73.png'
    }, {
        'name': '龍華經典台',
        'url': 'https://huaren.live/viv/detail/id/629/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/64381eeda47b73e079e6a19ee59e6129.png'
    }, {
        'name': 'ROCK Action',
        'url': 'https://huaren.live/viv/detail/id/618/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/903aa34e8a696d33ea380ebb2d65e521.jpg'
    }, {
        'name': '无线新闻台',
        'url': 'https://huaren.live/viv/detail/id/578/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240903-1/fe5220c77c879075a81acdf7da5fce0f.jpeg'
    }, {
        'name': '台視',
        'url': 'https://huaren.live/viv/detail/id/600/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/743bea26132442446172aa4eb1ccafd0.jpg'
    }, {
        'name': 'TVBS',
        'url': 'https://huaren.live/viv/detail/id/599/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/e9066c86d3b0ff0bfc005b78926db2b4.jpg'
    }, {
        'name': '中視',
        'url': 'https://huaren.live/viv/detail/id/597/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/f5aa20e22a36bdec94fa7eea8d0f444a.png'
    }, {
        'name': '華視',
        'url': 'https://huaren.live/viv/detail/id/598/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/5215bfa01832deeea810c0d13fb011a5.jpeg'
    }, {
        'name': '民視',
        'url': 'https://huaren.live/viv/detail/id/596/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/60c05a90275528eb51fb59c6003941cf.png'
    }, {
        'name': 'NOWTV',
        'url': 'https://huaren.live/viv/detail/id/605/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240925-1/5c844a56d9395dc505a822c09a43bc1f.jpg'
    }, {
        'name': '翡翠台',
        'url': 'https://huaren.live/viv/detail/id/569/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/7395e3050cabb0a7345bf7fdddc4dcf7.jpeg'
    }]
}, {
    'group': '国际',
    'channels': [{
        'name': '日本全天新聞',
        'url': 'https://huaren.live/viv/detail/id/635/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241104-1/e810df13282f11ef9e459018c4ecee62.jpg'
    }, {
        'name': '明珠剧集台(北美)',
        'url': 'https://huaren.live/viv/detail/id/634/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241102-1/4f3be3c8600953165356ad92a2283535.png'
    }, {
        'name': '翡翠综合台(北美)',
        'url': 'https://huaren.live/viv/detail/id/633/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/7395e3050cabb0a7345bf7fdddc4dcf7.jpeg'
    }, {
        'name': '翡翠剧集台(北美)',
        'url': 'https://huaren.live/viv/detail/id/632/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/7395e3050cabb0a7345bf7fdddc4dcf7.jpeg'
    }, {
        'name': '无线新闻台(北美)',
        'url': 'https://huaren.live/viv/detail/id/631/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240903-1/fe5220c77c879075a81acdf7da5fce0f.jpeg'
    }, {
        'name': 'IQIYI',
        'url': 'https://huaren.live/viv/detail/id/561/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/cae4967b8ec680ee2dfe228f9c3f58fb.jpg'
    }, {
        'name': '8频道',
        'url': 'https://huaren.live/viv/detail/id/567/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/654c5121f29cacccf8ca3cca129ac7b7.png'
    }, {
        'name': 'U频道',
        'url': 'https://huaren.live/viv/detail/id/566/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/d9c4cde488a06e2b989593c8b91ffe9f.png'
    }, {
        'name': '5频道',
        'url': 'https://huaren.live/viv/detail/id/565/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/8bac7f217fbdef2a6974390077427a81.png'
    }, {
        'name': '欢喜台',
        'url': 'https://huaren.live/viv/detail/id/564/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/dba69b490f555749ca9131066f1769f2.png'
    }, {
        'name': 'Astro QJ',
        'url': 'https://huaren.live/viv/detail/id/562/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/45613addcbd785e4ca6012e4d853c352.webp'
    }, {
        'name': 'AEC',
        'url': 'https://huaren.live/viv/detail/id/560/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/e170ceda9a59c86c3c3df8bcc6fef5cf.jpg'
    }, {
        'name': '8TV',
        'url': 'https://huaren.live/viv/detail/id/559/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240825-1/1eb68d6b36ab27a5aa624650566f7317.png'
    }, {
        'name': 'TV2',
        'url': 'https://huaren.live/viv/detail/id/558/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240824-1/74355e44461af287513a6624ed8337a7.jpg'
    }, {
        'name': '新时代东',
        'url': 'https://huaren.live/viv/detail/id/601/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/04344880c899f02b1b42665f78618945.png'
    }, {
        'name': '新时代西',
        'url': 'https://huaren.live/viv/detail/id/610/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/04344880c899f02b1b42665f78618945.png'
    }, {
        'name': '新时代2台',
        'url': 'https://huaren.live/viv/detail/id/602/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/04344880c899f02b1b42665f78618945.png'
    }]
}, {
    'group': '体育',
    'channels': [{
        'name': '咪咕体育1',
        'url': 'https://huaren.live/viv/detail/id/574/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/d5181ec7d4a44c228e03c4b00f0e585f.png'
    }, {
        'name': '咪咕体育2',
        'url': 'https://huaren.live/viv/detail/id/575/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/d5181ec7d4a44c228e03c4b00f0e585f.png'
    }, {
        'name': '咪咕体育3',
        'url': 'https://huaren.live/viv/detail/id/576/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/d5181ec7d4a44c228e03c4b00f0e585f.png'
    }, {
        'name': '咪咕体育4',
        'url': 'https://huaren.live/viv/detail/id/580/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/d5181ec7d4a44c228e03c4b00f0e585f.png'
    }, {
        'name': 'NOW SPORTS 1',
        'url': 'https://huaren.live/viv/detail/id/584/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240914-1/8fd11a88904cb21ef061d7c46a3be743.jpg'
    }, {
        'name': '18台',
        'url': 'https://huaren.live/viv/detail/id/583/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240917-1/549daf5546531c92dec4029ab6c15e40.jpg'
    }, {
        'name': 'TVB J2',
        'url': 'https://huaren.live/viv/detail/id/606/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240925-1/7821e2c22d10a5785829e6d9aca2a9ba.jpg'
    }, {
        'name': '爱尔达体育1台',
        'url': 'https://huaren.live/viv/detail/id/582/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241007-1/elta.jpg'
    }, {
        'name': '爱尔达体育2台',
        'url': 'https://huaren.live/viv/detail/id/581/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241007-1/elta.jpg'
    }, {
        'name': '爱尔达体育3台',
        'url': 'https://huaren.live/viv/detail/id/603/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20241007-1/elta.jpg'
    }, {
        'name': 'CCTV5体育',
        'url': 'https://huaren.live/viv/detail/id/587/nid/1.html',
        'logo': 'https://huaren.live/upload/zb/20210318-1/cctv5.jpg'
    }, {
        'name': 'CCTV5+体育赛事',
        'url': 'https://huaren.live/viv/detail/id/586/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240323-1/fdb5649b176a44ff6a26667bd92c3ccd.jpeg'
    }, {
        'name': '博斯运动一台',
        'url': 'https://huaren.live/viv/detail/id/588/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯运动二台',
        'url': 'https://huaren.live/viv/detail/id/589/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯無限台',
        'url': 'https://huaren.live/viv/detail/id/590/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯無限二台',
        'url': 'https://huaren.live/viv/detail/id/591/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯網球台',
        'url': 'https://huaren.live/viv/detail/id/592/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯高球台',
        'url': 'https://huaren.live/viv/detail/id/593/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯高球二台',
        'url': 'https://huaren.live/viv/detail/id/594/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }, {
        'name': '博斯魅力台',
        'url': 'https://huaren.live/viv/detail/id/595/nid/1.html',
        'logo': 'https://huaren.live/upload/tv/20240915-1/192deb8ca413ada51a9af414ebd986e2.png'
    }]
}]

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"><title>404</title><style>body,html{background:#28254c;font-family:Ubuntu}*{box-sizing:border-box}.box{width:350px;height:100%;max-height:600px;min-height:450px;background:#332f63;border-radius:20px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:30px 50px}.box .box__ghost{padding:15px 25px 25px;position:absolute;left:50%;top:30%;transform:translate(-50%,-30%)}.box .box__ghost .symbol:nth-child(1){opacity:.2;animation:shine 4s ease-in-out 3s infinite}.box .box__ghost .symbol:nth-child(1):after,.box .box__ghost .symbol:nth-child(1):before{content:'';width:12px;height:4px;background:#fff;position:absolute;border-radius:5px;bottom:65px;left:0}.box .box__ghost .symbol:nth-child(1):before{transform:rotate(45deg)}.box .box__ghost .symbol:nth-child(1):after{transform:rotate(-45deg)}.box .box__ghost .symbol:nth-child(2){position:absolute;left:-5px;top:30px;height:18px;width:18px;border:4px solid;border-radius:50%;border-color:#fff;opacity:.2;animation:shine 4s ease-in-out 1.3s infinite}.box .box__ghost .symbol:nth-child(3){opacity:.2;animation:shine 3s ease-in-out .5s infinite}.box .box__ghost .symbol:nth-child(3):after,.box .box__ghost .symbol:nth-child(3):before{content:'';width:12px;height:4px;background:#fff;position:absolute;border-radius:5px;top:5px;left:40px}.box .box__ghost .symbol:nth-child(3):before{transform:rotate(90deg)}.box .box__ghost .symbol:nth-child(3):after{transform:rotate(180deg)}.box .box__ghost .symbol:nth-child(4){opacity:.2;animation:shine 6s ease-in-out 1.6s infinite}.box .box__ghost .symbol:nth-child(4):after,.box .box__ghost .symbol:nth-child(4):before{content:'';width:15px;height:4px;background:#fff;position:absolute;border-radius:5px;top:10px;right:30px}.box .box__ghost .symbol:nth-child(4):before{transform:rotate(45deg)}.box .box__ghost .symbol:nth-child(4):after{transform:rotate(-45deg)}.box .box__ghost .symbol:nth-child(5){position:absolute;right:5px;top:40px;height:12px;width:12px;border:3px solid;border-radius:50%;border-color:#fff;opacity:.2;animation:shine 1.7s ease-in-out 7s infinite}.box .box__ghost .symbol:nth-child(6){opacity:.2;animation:shine 2s ease-in-out 6s infinite}.box .box__ghost .symbol:nth-child(6):after,.box .box__ghost .symbol:nth-child(6):before{content:'';width:15px;height:4px;background:#fff;position:absolute;border-radius:5px;bottom:65px;right:-5px}.box .box__ghost .symbol:nth-child(6):before{transform:rotate(90deg)}.box .box__ghost .symbol:nth-child(6):after{transform:rotate(180deg)}.box .box__ghost .box__ghost-container{background:#fff;width:100px;height:100px;border-radius:100px 100px 0 0;position:relative;margin:0 auto;animation:upndown 3s ease-in-out infinite}.box .box__ghost .box__ghost-container .box__ghost-eyes{position:absolute;left:50%;top:45%;height:12px;width:70px}.box .box__ghost .box__ghost-container .box__ghost-eyes .box__eye-left{width:12px;height:12px;background:#332f63;border-radius:50%;margin:0 10px;position:absolute;left:0}.box .box__ghost .box__ghost-container .box__ghost-eyes .box__eye-right{width:12px;height:12px;background:#332f63;border-radius:50%;margin:0 10px;position:absolute;right:0}.box .box__ghost .box__ghost-container .box__ghost-bottom{display:flex;position:absolute;top:100%;left:0;right:0}.box .box__ghost .box__ghost-container .box__ghost-bottom div{flex-grow:1;position:relative;top:-10px;height:20px;border-radius:100%;background-color:#fff}.box .box__ghost .box__ghost-container .box__ghost-bottom div:nth-child(2n){top:-12px;margin:0 0;border-top:15px solid #332f63;background:0 0}.box .box__ghost .box__ghost-shadow{height:20px;box-shadow:0 50px 15px 5px #3b3769;border-radius:50%;margin:0 auto;animation:smallnbig 3s ease-in-out infinite}.box .box__description{position:absolute;bottom:30px;left:50%;transform:translateX(-50%)}.box .box__description .box__description-container{color:#fff;text-align:center;width:200px;font-size:16px;margin:0 auto}.box .box__description .box__description-container .box__description-title{font-size:24px;letter-spacing:.5px}.box .box__description .box__description-container .box__description-text{color:#8c8aa7;line-height:20px;margin-top:20px}.box .box__description .box__button{display:block;position:relative;background:#ff5e65;border:1px solid transparent;border-radius:50px;height:50px;text-align:center;text-decoration:none;color:#fff;line-height:50px;font-size:18px;padding:0 70px;white-space:nowrap;margin-top:25px;transition:background .5s ease;overflow:hidden}.box .box__description .box__button:before{content:'';position:absolute;width:20px;height:100px;background:#fff;bottom:-25px;left:0;border:2px solid #fff;transform:translateX(-50px) rotate(45deg);transition:transform .5s ease}.box .box__description .box__button:hover{background:0 0;border-color:#fff}.box .box__description .box__button:hover:before{transform:translateX(250px) rotate(45deg)}@keyframes upndown{0%{transform:translateY(5px)}50%{transform:translateY(15px)}100%{transform:translateY(5px)}}@keyframes smallnbig{0%{width:90px}50%{width:100px}100%{width:90px}}@keyframes shine{0%{opacity:.2}25%{opacity:.1}50%{opacity:.2}100%{opacity:.2}}</style></head><body><div class="box"><div class="box__ghost"><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="box__ghost-container"><div class="box__ghost-eyes"><div class="box__eye-left"></div><div class="box__eye-right"></div></div><div class="box__ghost-bottom"><div></div><div></div><div></div><div></div><div></div></div></div><div class="box__ghost-shadow"></div></div><div class="box__description"><div class="box__description-container"><div class="box__description-title">404错误！</div><div class="box__description-text">404错误！</div></div><a href="#" class="box__button">返回</a></div></div><script>var pageX=$(document).width(),pageY=$(document).height(),mouseY=0,mouseX=0;$(document).mousemove(function(e){mouseY=e.pageY,yAxis=(pageY/2-mouseY)/pageY*300,mouseX=e.pageX/-pageX,xAxis=100*-mouseX-100,$(".box__ghost-eyes").css({transform:"translate("+xAxis+"%,-"+yAxis+"%)"})})</script></body></html>`