#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : gaze.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Author's Blog: https://blog.csdn.net/qq_32394351
# Date  : 2024/4/12

import asyncio
from asyncSnifferPro import Sniffer
from time import time, localtime, strftime
import requests
import json
from urllib3 import encode_multipart_formdata
import warnings
import os
import re

# 关闭警告
warnings.filterwarnings("ignore")
requests.packages.urllib3.disable_warnings()


async def _route_interceptor(route):
    """
    全局路由拦截器,禁止加载某些资源
    @param route:
    @return:
    """
    excluded_resource_types = ["stylesheet", "image", "font"]
    resource_type = route.request.resource_type
    # print(resource_type)
    if resource_type in excluded_resource_types:
        # print('禁止加载资源:', excluded_resource_types, route.request.url, route.request.resource_type)
        await route.abort()
    else:
        await route.continue_()


async def main(playUrl='https://gaze.run/play/3e535f6add8302fd5a82600124a26733'):
    """
    @return:
    """
    t1 = time()
    async with Sniffer(debug=True, headless=True, use_chrome=True, is_pc=False) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    page = await browser.browser.new_page()
    # 添加初始化脚本 提高速度并且过无法播放的验证
    await page.add_init_script(path=os.path.join(os.path.dirname(__file__), './stealth.min.js'))
    await page.add_init_script(path=os.path.join(os.path.dirname(__file__), './devtools.js'))
    # 屏蔽控制台监听器 https://cdn.staticfile.net/devtools-detector/2.0.14/devtools-detector.min.js
    await page.route(re.compile(r"devtools-detector.*\.js$"), lambda route: route.abort())
    # 打开静态资源拦截器
    # await page.route(re.compile(r"\.(png|jpg|jpeg|css|ttf)$"), _route_interceptor)
    await page.route(re.compile(r"\.(png|jpg|jpeg|ttf)$"), _route_interceptor)
    await page.expose_function("log", lambda *args: print(*args))
    await page.goto(playUrl)
    # 点击播放按钮
    await page.locator('.vjs-big-play-button').click()
    # 等待页面加载出来播放链接
    await page.wait_for_function(
        '() => document.querySelector("#gaze_video_html5_api")&&document.querySelector("#gaze_video_html5_api").src')
    src = await page.locator('#gaze_video_html5_api').get_attribute('src')
    await browser.close_page(page)
    await browser.close()

    t2 = time()
    cost = round((t2 - t1) * 1000, 2)
    ctime = localtime(t2)
    time_str = strftime("%Y-%m-%d %H:%M:%S", ctime)
    print(f'共计耗时{cost}毫秒,当前时间:{time_str},嗅探来源: {playUrl}')
    print(f'嗅探到的真实播放链接为: {src}')


if __name__ == '__main__':
    # 运行事件循环
    # asyncio.run(main())
    asyncio.run(main('https://gaze.run/play/b42e9f9b1f9fa9f6c9887d307f6fb0c4'))
    # asyncio.run(main('https://gaze.run/play/df637347db183050499050991e4ebc8b'))
