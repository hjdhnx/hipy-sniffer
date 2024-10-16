#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : iptv_test.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Date  : 2024/10/16

from playwright.sync_api import sync_playwright
import os
import re
from iptv_urls import *

_description = r"""
pip install playwright
手动安装谷歌浏览器即可，不需要playwright install,因为它自带的三个浏览器都太垃圾了不好用
参考官方接口文档
https://playwright.dev/python/docs/intro
https://playwright.dev/python/docs/api/class-playwright
"""


class IptvSpider:
    _browser = None

    def __init__(self, urls, timeout=10000, init_main_page=True):
        self.urls = urls
        self.timeout = timeout

        self.playwright = sync_playwright().start()
        _browser, context, main_page, request = self.init_browser(init_main_page)
        self._browser = _browser
        self.context = context
        self.browser = context
        self.main_page = main_page
        self.request = request

    def init_browser(self, init_main_page=True):
        _browser = self.playwright.chromium.launch(channel='chrome', headless=False)
        context = _browser.new_context()
        main_page = context.new_page() if init_main_page else None
        request = context.request
        return _browser, context, main_page, request

    def close_browser(self):
        if self.main_page:
            self.main_page.close()
        self.context.close()
        self.playwright.stop()

    @staticmethod
    def _route_interceptor(route):
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
            route.abort()
        else:
            route.continue_()

    @staticmethod
    def _on_dialog(dialog):
        """
        全局弹窗拦截器
        @param dialog:
        @return:
        """
        # print('on_dialog:', dialog)
        dialog.accept()

    @staticmethod
    async def _on_pageerror(error):
        """
        全局页面请求错误拦截器
        @param error:
        @return:
        """
        # print('on_pageerror:', error)
        pass

    def init_page_script(self, page):
        # 设置全局导航超时
        page.set_default_navigation_timeout(self.timeout)
        # 设置全局等待超时
        page.set_default_timeout(self.timeout)
        page.expose_function("log", lambda *args: print(*args))
        # page.add_init_script(path=os.path.join(os.path.dirname(__file__), './stealth.min.js'))
        page.add_init_script(path=os.path.join(os.path.dirname(__file__), './devtools.js'))
        js = """
                Object.defineProperties(navigator, {webdriver: {get: () => undefined}});
                Object.defineProperties(navigator, {platform: {get: () => 'iPhone'}});
                """
        page.add_init_script(js)
        page.route(re.compile(r"devtools-detector.*\.js$"), lambda route: route.abort())
        page.route(re.compile(r".*google\.com.*"), lambda route: route.abort())
        page.route(re.compile(r"\.(png|jpg|jpeg|ttf)$"), self._route_interceptor)
        # 打开弹窗拦截器
        page.on("dialog", self._on_dialog)
        # 打开页面错误监听
        page.on("pageerror", self._on_pageerror)
        return page

    def get_page_content(self, url, timeout=10000):
        page = self.browser.new_page()
        page = self.init_page_script(page)
        try:
            page.goto(url)
            page.wait_for_timeout(timeout)
            content = page.content()
        except Exception as e:
            print(f'get_page_content 发生了错误: {e}')
            content = ''
        page.close()
        return content


if __name__ == '__main__':
    ip1 = IptvSpider(urls2)
    html = ip1.get_page_content(urls2[0])
