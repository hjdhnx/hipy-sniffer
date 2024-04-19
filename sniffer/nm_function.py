#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : nm_function.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Date  : 2024/4/18

from urllib.parse import urljoin


async def get_inner_iframe(page, playUrl):
    await page.goto(playUrl)
    # 定位多层iframe嵌套直接对内部进行定位点击
    # frame = page.frame_locator('iframe').frame_locator("#WANG")
    # await frame.locator("li").click()

    html = await page.content()
    if 'playlist' in html or 'id="WANG"' in html or '线路①' in html:
        return playUrl, html
    tag = False
    if '<iframe' in html:
        tag = 'iframe'
    elif '<frame' in html:
        tag = 'frame'

    if tag:
        iframes = await page.locator(tag).all()
        src = await iframes[-1].get_attribute('src')
        playUrl = urljoin(playUrl, src)
        if '=' in playUrl:
            playUrl = playUrl[:playUrl.index('=') + 1]
        print('iframe playUrl:', playUrl)
        return await get_inner_iframe(page, playUrl)
    else:
        print('playUrl:', playUrl)
        return playUrl, html
