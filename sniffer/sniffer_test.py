#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : sniffer_test.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Author's Blog: https://blog.csdn.net/qq_32394351
# Date  : 2024/4/13

from time import time
from asyncSnifferPro import Sniffer
import asyncio


async def specail_test():
    t1 = time()
    urls = [
        # 'https://m.xiangdao.me/vod-play-id-38792-src-1-num-12.html',
        # 'https://www.7xiady.cc/play/62209-1-1/',
        # 'https://www.zxzjhd.com/video/4383-1-1.html',
        # 'https://v.nmvod.cn/vod-play-id-38792-src-1-num-12.html',
        # 'https://www.mgtv.com/b/290346/3664551.html',
        # 'https://v.qq.com/x/page/i3038urj2mt.html',
        'https://gaze.run/play/3e535f6add8302fd5a82600124a26733',
        # 'https://gaze.run/play/b42e9f9b1f9fa9f6c9887d307f6fb0c4',
        # 'https://gaze.run/play/df637347db183050499050991e4ebc8b',
    ]
    _count = 0
    async with Sniffer(debug=True, headless=False) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    for url in urls:
        _count += 1
        # ret = await browser.snifferMediaUrl(url, timeout=10000, css='button.dplayer-play-icon')
        ret = await browser.snifferMediaUrl(url, timeout=10000, custom_regex='review_video')
        print(ret)

    await browser.close()
    t2 = time()
    print(f'嗅探{_count}个页面共计耗时:{round(t2 - t1, 2)}s')


# 使用异步上下文管理器来调用异步函数
async def demo_test():
    t1 = time()
    async with Sniffer(debug=True) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    # browser = Sniffer(debug=True)
    ret = await browser.fetCodeByWebView('https://www.ip.cn/api/index?ip&type=0')
    print(ret)
    await browser.close()
    t2 = time()
    print(f'访问ip网站源码共计耗时:{round(t2 - t1, 2)}s')


async def demo_test_csdn():
    async with Sniffer(debug=True, headless=True) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    ret = await browser.fetCodeByWebView('https://blog.csdn.net/qq_32394351')
    print(ret)
    await browser.close()


async def demo_test_nm():
    async with Sniffer(debug=True, headless=False) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    page = await browser.browser.new_page()
    await page.goto('https://api.cnmcom.com/webcloud/nmm.php?url=')  #
    lis = await page.locator('li').count()
    print('共计线路路:', lis)
    lis = await page.locator('li').all()
    urls = []
    for li in lis:
        await li.click()
        # iframe = page.locator('#WANG')
        iframe = page.locator('iframe').first
        src = await iframe.get_attribute('src')
        urls.append(src)
    print(len(urls), urls)
    # ret = await page.content()
    # print(ret)
    await browser.close()


async def demo_test_nmjx():
    async with Sniffer(debug=True, headless=False) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    ret = await browser.fetCodeByWebView('https://api.cnmcom.com/webcloud/nmm.php?url=', css='.line',
                                         headers={'referer': 'https://m.emsdn.cn/'},
                                         script="document.querySelector('.line').click()")
    print(ret['content'])
    await browser.close()


async def demo_test_gaze():
    t1 = time()
    urls = [
        'https://gaze.run/play/3e535f6add8302fd5a82600124a26733',
        # 'https://gaze.run/play/b42e9f9b1f9fa9f6c9887d307f6fb0c4',
    ]
    _count = 0
    async with Sniffer(debug=True, headless=False) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    for url in urls:
        _count += 1
        # ret = await browser.snifferMediaUrl(url, timeout=10000, css='button.dplayer-play-icon')
        ret = await browser.snifferMediaUrl(url, timeout=10000, custom_regex='review_video',
                                            script="""  
   function gazeCheck() {
        log("正在执行js的gazeCheck");
        let button = document.querySelector(".vjs-big-play-button");
        if (button) {
            button.click();
            log("点击了gaze播放按钮");
        } else {
            setTimeout(gazeCheck, 200);
        }
    } 
    gazeCheck();                                  
""")
        print(ret)

    await browser.close()
    t2 = time()
    print(f'嗅探{_count}个页面共计耗时:{round(t2 - t1, 2)}s')


if __name__ == '__main__':
    # 运行事件循环
    # asyncio.run(demo_test())
    # asyncio.run(specail_test())
    asyncio.run(demo_test_nmjx())
    # asyncio.run(demo_test_gaze())
    # asyncio.run(demo_test_nm())
    # asyncio.run(demo_test_csdn())
