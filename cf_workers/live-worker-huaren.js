export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 匹配 /proxy 路由
        if (url.pathname.startsWith('/proxy/')) {
            return handleProxyRequest(url, env);
        }

        // 返回 404 对于其他路由
        return new Response('Not Found', {status: 404});
    },
};
// https://live.playdreamer.cn/proxy/https://live.huaren.live/stream/CCTV6.m3u8
// https://live.playdreamer.cn/proxy/stream/CCTV6.m3u8
// let base_url = 'https://live.playdreamer.cn/proxy/';
let proxy_url = 'https://mediaproxy.leuse.top/?url=';
// proxy_url = '';
let base_url = 'https://live.huaren.live/';
let headers = {
    "Referer": base_url,
    "User-Agent": "Mozilla/5.0 (Linux；； Android 14；； 23013RK75C Build/UKQ1.230804.001；； wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36"
};

async function handleProxyRequest(url, env) {
    const relativePath = url.pathname.replace('/proxy/', '');
    base_url = removeTrailingSlash(env.BASE_URL || base_url);
    const targetUrl = `${proxy_url}${base_url}/${relativePath}`;
    // const targetUrl = relativePath;

    // 检查文件扩展名
    const extension = targetUrl.split('.').pop().toLowerCase();
    if (extension !== 'ts' && extension !== 'm3u8') {
        return new Response(JSON.stringify({error: 'Only .ts and .m3u8 files are supported'}), {
            status: 400,
            headers: {'Content-Type': 'application/json'}
        });
    }
    const filename = getFileNameFromUrl(url);

    try {
        // 设置内容类型
        const contentType = extension === 'ts' ? 'video/MP2T' : 'application/vnd.apple.mpegurl';

        // 发起请求到目标 URL
        const response = await fetch(targetUrl, {
            headers: headers,
            cf: {
                timeout: 30000
            }
        });


        // 检查请求是否成功
        if (!response.ok) {
            let html = await response.text()
            throw new Error(`Failed to fetch file: ${response.statusText}\n${html}`);
        }

        // 返回代理响应
        // return new Response(response.body, {
        //     headers: {
        //         'Content-Disposition': `attachment; filename="${filename}"`,
        //         'Content-Type': contentType,
        //         'Cache-Control': 'no-cache'
        //     }
        // });
        const responseHeaders = {
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': '*',
        };

        if (extension === 'ts') {
            // 创建流式响应
            return new Response(
                new ReadableStream({
                    async start(controller) {
                        const reader = response.body.getReader();
                        try {
                            while (true) {
                                const {done, value} = await reader.read();
                                if (done) break;
                                controller.enqueue(value); // 将数据块推送到响应流
                            }
                            controller.close();
                        } catch (error) {
                            console.error('Stream error:', error);
                            controller.error(error);
                        } finally {
                            reader.releaseLock();
                        }
                    }
                }),
                {
                    headers: responseHeaders
                }
            );
        } else {
            const lines = await response.text();
            const linesArray = lines.split("\n");
            const newlinesArray = [];
            for (let line of linesArray) {
                if (line.startsWith('http')) {
                    // newlinesArray.push(proxy_url + line)
                    newlinesArray.push(line)
                } else {
                    newlinesArray.push(line)
                }
            }
            const content = newlinesArray.join('\n').trim()
            return new Response(content, {
                headers: responseHeaders,
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({error: `Failed to process file:[${targetUrl}] ${error.message}`}), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
}

// 去掉右侧的斜杠
function removeTrailingSlash(url) {
    return url.replace(/\/+$/, '');
}

function getFileNameFromUrl(url) {
    // 获取 URL 的 pathname
    const pathname = new URL(url).pathname;
    // 提取 basename（最后一个斜杠之后的部分）
    return pathname.substring(pathname.lastIndexOf('/') + 1);
}
