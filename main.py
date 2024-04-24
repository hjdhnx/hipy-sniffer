#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : main.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Date  : 2024/3/28

from sniffer.asyncSnifferPro import Sniffer, browser_drivers
from sniffer.nm_function import get_inner_iframe
from sniffer.live_spider import liveSearch
from time import time
from urllib.parse import urljoin
import json
import logging
from quart import (
    Quart,
    request,
    make_response,
    render_template,
    jsonify,
    send_from_directory,
    redirect
)
from threading import Lock
from common.resp import HTMLResponse, PlainTextResponse, M3u8Response, respSuccessJson, respErrorJson, respVodJson
from common import error_code
from common.data_map import head_excludes, real_url_excludes, ysp_map
import ast
import requests

_logger = logging.getLogger(__name__)
lock = Lock()
# 接口里储存嗅探过的链接
url_store = {

}

app = Quart(__name__, static_folder='static')
app.config['JSON_AS_ASCII'] = False  # 让jsonify()返回的json数据以utf8编码方式正常显示中文
app.config.from_file("quart_config.json", json.load)
_logger.info('---quart_config.json加载完毕---')


@app.route('/', methods=['GET'])
async def _index():
    resp = await render_template("index.html", port=app.config.get('PORT'))  # Required to be in templates/
    return resp


@app.route('/index', methods=['GET'])
async def index():
    resp = await PlainTextResponse('你好世界')
    return resp


@app.route('/static/<path:filename>')
async def serve_static(filename):
    return await send_from_directory(app.static_folder, filename)


@app.route("/active", methods=['GET'])
async def active_sniffer():
    _logger.info('访问了active激活程序,后续操作已加锁锁住')
    with lock:
        if not browser_drivers:
            try:
                async with Sniffer(debug=app.config.get('SNIFFER_DEBUG'),
                                   headless=app.config.get('SNIFFER_HEADLESS'),
                                   use_chrome=app.config.get('USE_CHROME'),
                                   is_pc=False,
                                   head_excludes=head_excludes,
                                   real_url_excludes=real_url_excludes,
                                   ) as browser:
                    browser_drivers.append(browser)
                async with Sniffer(debug=app.config.get('SNIFFER_DEBUG'),
                                   headless=app.config.get('SNIFFER_HEADLESS'),
                                   use_chrome=app.config.get('USE_CHROME'),
                                   is_pc=True,
                                   head_excludes=head_excludes,
                                   real_url_excludes=real_url_excludes,
                                   ) as browser:
                    browser_drivers.append(browser)
                return await respSuccessJson(data=f'嗅探器激活成功,使用的浏览器为:{browser.channel}')
            except Exception as e:
                return await respErrorJson(error_code.ERROR_INTERNAL.set_msg(f'嗅探器激活失败:{e}'))
        else:
            browser = browser_drivers[0]
            return await respSuccessJson(data=f'嗅探器已经激活,无需重复激活[{browser}]')


@app.route("/sniffer", methods=['GET'])
async def sniffer():
    # method = request.method
    # url = request.url
    # headers = request.headers
    # cookies = request.cookies
    # args = request.args
    # data = await request.get_data()
    # data_json = await request.get_json()
    def getParams(_key=None, _value=''):
        if _key:
            return request.args.get(_key) or _value
        else:
            return request.args.__dict__['_dict']

    try:
        url = getParams('url')
        is_pc = getParams('is_pc')
        css = getParams('css')
        script = getParams('script')
        _headers = getParams('headers')
        timeout = int(getParams('timeout') or 10000)
        custom_regex = getParams('custom_regex') or None
        mode = int(getParams('mode') or 0)
        headers = ast.literal_eval(_headers) if _headers else None
    except Exception as e:
        return await respErrorJson(error_code.ERROR_PARAMETER_ERROR.set_msg(f'参数校验错误:{e}'))

    if not str(url).startswith('http'):
        return await respErrorJson(error_code.ERROR_PARAMETER_ERROR.set_msg('传入的url不合法'))

    if not browser_drivers:
        return await respErrorJson(error_code.ERROR_INTERNAL.set_msg('嗅探器尚未激活,无法处理您的请求'))
    else:
        try:
            browser = browser_drivers[1] if is_pc else browser_drivers[0]
            ret = await browser.snifferMediaUrl(url, mode=mode, timeout=timeout, custom_regex=custom_regex, is_pc=is_pc,
                                                script=script, headers=headers,
                                                css=css)
            if app.config.get('DEBUG'):
                print(ret)
            return await respVodJson(data=ret)
        except Exception as e:
            return await respErrorJson(error_code.ERROR_INTERNAL.set_msg(f'执行嗅探发生了错误:{e}'))


@app.route("/fetCodeByWebView", methods=['GET'])
async def fetCodeByWebView():
    def getParams(_key=None, _value=''):
        if _key:
            return request.args.get(_key) or _value
        else:
            return request.args.__dict__['_dict']

    try:
        url = getParams('url')
        css = getParams('css')
        html = getParams('html')
        script = getParams('script')
        _headers = getParams('headers')
        # headers = json.loads(_headers) if _headers else None
        headers = ast.literal_eval(_headers) if _headers else None
    except Exception as e:
        return await respErrorJson(error_code.ERROR_PARAMETER_ERROR.set_msg(f'参数校验错误:{e}'))

    if not str(url).startswith('http'):
        return await respErrorJson(error_code.ERROR_PARAMETER_ERROR.set_msg('传入的url不合法'))

    if not browser_drivers:
        return await respErrorJson(error_code.ERROR_INTERNAL.set_msg('嗅探器尚未激活,无法处理您的请求'))
    else:
        try:
            browser = browser_drivers[0]
            ret = await browser.fetCodeByWebView(url, headers, css=css, script=script)
            if app.config.get('DEBUG'):
                print(ret)
            if html:
                return await HTMLResponse(ret['content'])
            else:
                return await respVodJson(data=ret)
        except Exception as e:
            return await respErrorJson(error_code.ERROR_INTERNAL.set_msg(f'执行嗅探发生了错误:{e}'))


@app.route("/nm", methods=['GET'])
async def fetNmJx():
    def getParams(_key=None, _value=''):
        if _key:
            return request.args.get(_key) or _value
        else:
            return request.args.__dict__['_dict']

    is_all = getParams('all')
    # url = getParams('url') or 'https://api.cnmcom.com/webcloud/nmm.php?url='
    url = getParams('url') or 'https://api.cnmcom.com/webcloud/kan.php?url='
    timeout = 2000

    t1 = time()
    if not browser_drivers:
        return await respErrorJson(error_code.ERROR_INTERNAL.set_msg('嗅探器尚未激活,无法处理您的请求'))
    else:
        try:
            browser = browser_drivers[0]

            page = await browser.browser.new_page()
            await page.expose_function("log", lambda *args: print(*args))
            await page.set_extra_http_headers(headers={'referer': 'https://m.emsdn.cn/'})
            js = """
                Object.defineProperties(navigator, {webdriver: {get: () => undefined}});
                Object.defineProperties(navigator, {platform: {get: () => 'iPhone'}});
                    """
            await page.add_init_script(js)
            # 设置全局导航超时
            page.set_default_navigation_timeout(timeout)
            # 设置全局等待超时
            page.set_default_timeout(timeout)
            urls = []
            from_url = url
            error_msg = ''
            try:
                src, html = await get_inner_iframe(page, url)
                from_url = src.split('=')[0] + '='

                # await page.goto(url)  #

                lis_count = await page.locator('li').count()
                # print('共计线路数:', lis_count)
                if is_all:
                    lis = await page.locator('li').all()
                else:
                    lis = [page.locator('li').first]
                for li in lis:
                    await li.click()
                    # iframe = page.locator('#WANG')
                    iframe = page.locator('iframe').first
                    src = await iframe.get_attribute('src')
                    urls.append(urljoin(url, src))
            except Exception as e:
                error_msg = f'获取 urls, from_url 发生了错误:{e}'
                # print(error_msg)
            cost = round((time() - t1) * 1000, 2)
            ret = {'data': urls, 'code': 200, 'cost': cost, 'msg': '农民解析获取成功', 'from': from_url}
            if app.config.get('DEBUG'):
                print(ret)
            await browser.close_page(page)
            if len(urls) > 0:
                return await respVodJson(data=ret)
            else:
                return await respErrorJson(error_code.ERROR_INTERNAL.set_msg(f'获取农民解析发生了错误:{error_msg}'))
        except Exception as e:
            return await respErrorJson(error_code.ERROR_INTERNAL.set_msg(f'获取农民解析发生了错误:{e}'))


@app.route("/ysp/<name>", methods=['GET'])
async def getYsp(name: str):
    def getParams(_key=None, _value=''):
        if _key:
            return request.args.get(_key) or _value
        else:
            return request.args.__dict__['_dict']

    proxy = getParams('proxy')
    # cctv1: 600001859
    _name = name.lower().replace('.m3u8', '')
    pid = ysp_map.get(_name)
    if not pid:
        _name = 'cctv1'
        pid = ysp_map[_name]

    # 直播真实m3u8地址
    ysp_url = ''
    referer = 'https://www.yangshipin.cn/'
    if _name.startswith('cctv6'):
        url = 'https://www.1905.com/cctv6/live/?index'
        referer = 'https://www.1905.com/'
    elif _name.startswith('cctv3'):
        cctv3 = liveSearch('cctv3')
        if len(cctv3) > 0:
            ysp_url = cctv3[0]
            url = 'http://tonkiang.us/'
        else:
            url = 'https://tv.cctv.com/live/cctv3/'
            referer = 'https://tv.cctv.com/'
    elif _name.startswith('cctv8'):
        cctv8 = liveSearch('cctv8')
        if len(cctv8) > 0:
            ysp_url = cctv8[0]
            url = 'http://tonkiang.us/'
        else:
            url = 'https://tv.cctv.com/live/cctv8/'
            referer = 'https://tv.cctv.com/'
    else:
        url = f'https://www.yangshipin.cn/#/tv/home?pid={pid}'

    headers = {'referer': referer}
    if not browser_drivers:
        return await respErrorJson(error_code.ERROR_INTERNAL.set_msg('嗅探器尚未激活,无法处理您的请求'))
    else:
        ret = {'url': '', 'from': url, 'headers': headers, 'msg': 'failed', 'code': 404,
               'data': '超级嗅探失败'}
        try:
            if not ysp_url:
                need_sniffer = True
                # 配置是否缓存央视|可能缓存结果会断流
                if app.config.get('YSP_CACHE'):
                    if _name in url_store:
                        ysp_url = url_store[_name]
                        try:
                            r = requests.head(ysp_url, headers={'referer': 'https://www.yangshipin.cn/'})
                            r_headers = r.headers
                            if r_headers.get('Content-Type') and r_headers[
                                'Content-Type'] == 'application/vnd.apple.mpegurl':
                                need_sniffer = False
                                ret = {'url': ysp_url, 'from': url, 'headers': headers, 'msg': 'success', 'code': 200,
                                       'data': '超级嗅探缓存获取成功'}

                        except Exception as e:
                            print(f'head检查时效性失败:{e}')

                if need_sniffer:
                    browser = browser_drivers[1]
                    ret = await browser.snifferMediaUrl(url, is_pc=True, timeout=8000,
                                                        headers=headers
                                                        )
                    ysp_url = ret.get('url')
                    if ysp_url:
                        url_store[_name] = ysp_url
                        headers = ret['headers']

            if ysp_url:
                if proxy == '1':
                    r = requests.get(ysp_url, headers=headers)
                    ret = r.text
                    new_ret = []
                    for i in ret.split('\n'):
                        if '.ts' in i:
                            new_ret.append(urljoin(ysp_url, i))
                        else:
                            new_ret.append(i)
                    ret = '\n'.join(new_ret).strip()
                    return await M3u8Response(ret)
                else:
                    return redirect(ysp_url)
            return await respVodJson(data=ret)
        except Exception as e:
            return await respErrorJson(error_code.ERROR_INTERNAL.set_msg(f'获取央视频发生了错误:{e}'))


@app.route("/ysp", methods=['GET'])
async def getYspLive():
    def getParams(_key=None, _value=''):
        if _key:
            return request.args.get(_key) or _value
        else:
            return request.args.__dict__['_dict']

    proxy = getParams('proxy')
    # url = request.url  # 这个会带query
    url = request.base_url
    # print('url:',url)
    live_tab1 = '央视频道,#genre#'
    live_tab2 = '卫视频道,#genre#'
    texts = [live_tab1]
    for key, value in ysp_map.items():
        if '卫视' in key and live_tab2 not in texts:
            texts.append(live_tab2)
        # texts.append(f'{key.upper()},http://192.168.1.100:2519/ysp/{value}')
        texts.append(f'{key.upper()},{url}/{key}.m3u8?proxy={proxy}&type={value}.m3u8')
    live_text = '\n'.join(texts).strip()
    return await PlainTextResponse(live_text)


if __name__ == '__main__':
    app.run(debug=app.config.get('DEBUG') or False, host=app.config.get('HOST') or '0.0.0.0',
            port=app.config.get('PORT') or 5708)
