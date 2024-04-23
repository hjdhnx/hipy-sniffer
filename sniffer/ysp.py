#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : ysp.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Author's Blog: https://blog.csdn.net/qq_32394351
# Date  : 2024/4/23

import asyncio
from asyncSnifferPro import Sniffer
from time import time

timeout = 4000
MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36'


async def main():
    """
    自动爬取农民解析链接然后对比剪切板内容，如果发生了改变就重新写到剪切板。
    @return:
    """
    ysp_map = {}
    t1 = time()
    async with Sniffer(debug=True, headless=True, is_pc=True) as browser:
        # 在这里，async_func已被调用并已完成
        pass

    # result = await browser.snifferMediaUrl('https://www.yangshipin.cn/#/tv/home?pid=600001859',is_pc=True,
    #                                        headers={'referer': 'https://www.yangshipin.cn/'}
    #                                        )
    # print(result)

    page = await browser.browser.new_page()
    await page.expose_function("log", lambda *args: print(*args))
    await page.set_extra_http_headers(headers={'referer': 'https://www.yangshipin.cn/'})
    js = """
    Object.defineProperties(navigator, {webdriver: {get: () => undefined}});
    Object.defineProperties(navigator, {platform: {get: () => 'iPhone'}});
        """
    await page.add_init_script(js)
    await page.goto('https://www.yangshipin.cn/#/tv/home?pid=600002264')
    await page.wait_for_selector('#app .tv-main-con-r-list-left .tv-main-con-r-list-left-imga')

    lis = await page.locator('#app .tv-main-con-r-list-left .tv-main-con-r-list-left-imga').count()
    print('央视共计线路数:', lis)
    lis = await page.locator('#app .tv-main-con-r-list-left .tv-main-con-r-list-left-imga').all()
    for li in lis:
        li_name = await li.inner_text()
        li_name = li_name.strip().replace('\n', '').replace(' ', '').lower()
        await li.click()
        src = await page.evaluate('location.href')
        ysp_map[li_name] = src.split('pid=')[-1]
    print(ysp_map)
    print('开始获取卫视')
    # await page.goto('https://www.yangshipin.cn/#/tv/home?pid=600002309')
    tabs = await page.locator('.tv-main-con-r-tab-img').all()
    print('len tabs', len(tabs))
    await tabs[-1].click()
    await page.wait_for_selector('#app .tv-main-con-r-list-left .tv-main-con-r-list-left-imgb')
    lis = await page.locator('#app .tv-main-con-r-list-left .tv-main-con-r-list-left-imgb').count()
    print('卫视共计线路数:', lis)
    lis = await page.locator('#app .tv-main-con-r-list-left .tv-main-con-r-list-left-imgb').all()
    for li in lis:
        li_name = await li.inner_text()
        li_name = li_name.strip().replace('\n', '').replace(' ', '').lower()
        await li.click()
        src = await page.evaluate('location.href')
        # print(li_name,src)
        ysp_map[li_name] = src.split('pid=')[-1]

    print(ysp_map)
    t2 = time()
    count = len(ysp_map.keys())
    print(f'共计耗时:{round((t2 - t1) * 1000, 2)}毫秒,{count} 条直播频道')


if __name__ == '__main__':
    asyncio.run(main())
