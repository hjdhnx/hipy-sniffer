/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 * 4K: 1080
 * https://cntv.playdreamer.cn/proxy/asp/hls/4000/0303000a/3/default/a35a7adab0ab4c4786188ec9fc455151/4000.m3u8
 * 非电视 720
 * https://cntv.playdreamer.cn/proxy/asp/hls/2000/0303000a/3/default/9eaf892ce08a49509fcf3595fb3eabd7/2000.m3u8
 * 电视 240
 * https://cntv.playdreamer.cn/proxy/asp/hls/2000/0303000a/3/default/37241820097b47bfb71c39651d8fd988/2000.m3u8
 * 电视 走向大西南 720
 * https://cntv.playdreamer.cn/proxy/asp/hls/2000/0303000a/3/default/ecdfeae7be694ae381f805aad83fabd7/2000.m3u8

 * https://dhlszb.cntv.myhwcdn.cn/
 * https://hls.cntv.myhwcdn.cn/
 * https://hls.cntv.lxdns.com/

 */

// 定义去掉右侧斜杠的函数
function removeTrailingSlash(url) {
    return url.replace(/\/+$/, ''); // 去掉一个或多个斜杠
}

let SOURCE_URLS;
let PROXY_URL;
let REDIRECT_ON_FAILURE;
let CDN_LISTS = [
    'http://hls.cntv.cdn20.com/',
    // 'https://dhlszb.cntv.myhwcdn.cn/',
    'https://hls.cntv.myhwcdn.cn/',
    'https://hls.cntv.lxdns.com/',
]

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 获取环境变量，使用用户定义的值或默认值
        SOURCE_URLS = (env.SOURCE_URLS ? JSON.parse(env.SOURCE_URLS) : CDN_LISTS)
            .map(removeTrailingSlash);

        PROXY_URL = removeTrailingSlash(env.PROXY_URL || 'https://cntv.playdreamer.cn/');

        // 获取重定向配置变量，默认为0
        REDIRECT_ON_FAILURE = env.REDIRECT_ON_FAILURE ? parseInt(env.REDIRECT_ON_FAILURE) : 1;

        // 处理 M3U8 请求
        if (url.pathname.startsWith('/proxy/')) {
            return handleM3U8Request(url);
        }

        // 处理 TS 文件请求
        if (url.pathname.startsWith('/ts/')) {
            return handleTSRequest(url);
        }

        return new Response('Not Found', {status: 404});
    },
};

async function tryFetchFromSourceList(path) {
    const triedUrls = [];  // 记录尝试过的 URL

    for (const baseUrl of SOURCE_URLS) {
        const fullUrl = `${baseUrl}/${path}`;
        triedUrls.push(fullUrl);  // 记录每次尝试的 URL

        const response = await fetch(fullUrl);
        if (response.ok) return {response, triedUrls};
    }

    return {response: null, triedUrls};
}

async function handleM3U8Request(url) {
    // 获取 M3U8 文件的路径
    const relativePath = url.pathname.replace('/proxy/', '');

    // 请求 M3U8 文件
    const {response: m3u8Response, triedUrls} = await tryFetchFromSourceList(relativePath);

    // 检查所有 URL 是否都失败
    if (!m3u8Response) {
        // 如果 REDIRECT_ON_FAILURE 为 1，则重定向到最后一个尝试的 URL
        if (REDIRECT_ON_FAILURE === 1) {
            return Response.redirect(triedUrls[triedUrls.length - 1], 302);
        }
        // 否则返回错误信息
        return new Response(`Failed to fetch M3U8 file. Tried URLs:\n${triedUrls.join('\n')}`, {status: 502});
    }

    // 读取 M3U8 内容
    let m3u8Text = await m3u8Response.text();

    // 替换相对路径为 Worker 的路径
    m3u8Text = m3u8Text.replace(/(?<=\n)([^#][^\/\n]*\.ts)/g, (match) => {
        return `${PROXY_URL}/ts/${relativePath.split('/').slice(0, -1).join('/')}/${match}`;
    });

    // 返回处理后的 M3U8 文件
    return new Response(m3u8Text, {
        headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache' // 可根据需要设置缓存
        }
    });
}

async function handleTSRequest(url) {
    // 获取 TS 文件的路径
    const tsFileName = url.pathname.replace('/ts/', '');

    // 请求 TS 文件
    const {response: tsResponse, triedUrls} = await tryFetchFromSourceList(tsFileName);

    // 检查所有 URL 是否都失败
    if (!tsResponse) {
        // 如果 REDIRECT_ON_FAILURE 为 1，则重定向到最后一个尝试的 URL
        if (REDIRECT_ON_FAILURE === 1) {
            return Response.redirect(triedUrls[triedUrls.length - 1], 302);
        }
        // 否则返回错误信息
        return new Response(`Failed to fetch TS file. Tried URLs:\n${triedUrls.join('\n')}`, {status: 502});
    }

    // 返回 TS 文件的响应
    return new Response(tsResponse.body, {
        headers: {
            'Content-Type': 'video/MP2T', // TS 文件的内容类型
            'Cache-Control': 'no-cache' // 可根据需要设置缓存
        }
    });
}

