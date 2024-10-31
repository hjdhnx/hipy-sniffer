/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 定义去掉右侧斜杠的函数
function removeTrailingSlash(url) {
    return url.replace(/\/+$/, ''); // 去掉一个或多个斜杠
}

// 获取环境变量，使用用户定义的值或默认值
const SOURCE_URL = removeTrailingSlash(
    (typeof env.SOURCE_URL !== 'undefined' ? env.SOURCE_URL : 'http://hls.cntv.cdn20.com/')
);

const PROXY_URL = removeTrailingSlash(
    (typeof env.PROXY_URL !== 'undefined' ? env.PROXY_URL : 'https://cntv.playdreamer.cn/')
);

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

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

async function handleM3U8Request(url) {
    // 获取 M3U8 文件的 URL
    const originalUrl = url.pathname.replace('/proxy/', SOURCE_URL);

    // 请求 M3U8 文件
    const m3u8Response = await fetch(originalUrl);

    // 检查响应是否成功
    if (!m3u8Response.ok) {
        return new Response('Failed to fetch M3U8 file: ' + originalUrl, {status: 502});
    }

    // 读取 M3U8 内容
    let m3u8Text = await m3u8Response.text();

    // 解析出原始 M3U8 URL 的目录
    const urlObj = new URL(originalUrl);
    const pathWithoutFileName = urlObj.pathname.substring(1, urlObj.pathname.lastIndexOf('/')); // 去掉前面的斜杠

    // 替换相对路径为 Worker 的路径
    m3u8Text = m3u8Text.replace(/(?<=\n)([^#][^\/\n]*\.ts)/g, (match) => {
        // 获取原始路径（包含最后的斜杠）
        const finalPath = `${pathWithoutFileName}/${match}`;
        return `${PROXY_URL}/ts/${finalPath}`; // 使用变量构建返回路径
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
    // 获取 TS 文件名
    const tsFileName = url.pathname.replace('/ts/', '');

    // 构建原始 TS 文件的 URL
    const originalTSUrl = `${SOURCE_URL}/${tsFileName}`;

    // 请求 TS 文件
    const tsResponse = await fetch(originalTSUrl);

    // 检查响应是否成功
    if (!tsResponse.ok) {
        return new Response('Failed to fetch TS file: ' + originalTSUrl, {status: 502});
    }

    // 返回 TS 文件的响应
    return new Response(tsResponse.body, {
        headers: {
            'Content-Type': 'video/MP2T', // TS 文件的内容类型
            'Cache-Control': 'no-cache' // 可根据需要设置缓存
        }
    });
}
