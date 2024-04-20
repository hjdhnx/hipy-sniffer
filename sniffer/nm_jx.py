#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : nm_jx.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Date  : 2024/4/11

import asyncio
from asyncSnifferPro import Sniffer
from nm_function import get_inner_iframe
from time import time, localtime, strftime
import requests
import json
import re
from urllib3 import encode_multipart_formdata
from urllib.parse import urljoin
import warnings

# 关闭警告
warnings.filterwarnings("ignore")
requests.packages.urllib3.disable_warnings()

nm_host = 'https://m.emsdn.cn/'

nm_get_url = 'https://igdux.top/~nmjx'
nm_put_url = 'https://igdux.top/~nmjx:6Q2bC4BWAayiZ3sifysBpJPE'
timeout = 4000
MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36'


def update_content(content, boundary=None):
    """
    更新剪切板内容为指定的content文本，返回剪切板服务端回应文本
    @param content: str
    @param boundary:
    @return:
    """
    if boundary is None:
        boundary = f'--dio-boundary-{int(time())}'
    headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}
    fields = []
    data = {
        'c': content
    }
    for key, value in data.items():
        fields.append((key, (None, value, None)))
    m = encode_multipart_formdata(fields, boundary=boundary)
    data = m[0]
    r = requests.put(nm_put_url, data=data, headers=headers, timeout=round(timeout / 1000, 2), verify=False)
    print(r.text)
    return r.text


def get_content():
    """
    获取剪切板内容的字符串
    @return:
    """
    r = requests.get(nm_get_url, timeout=round(timeout / 1000, 2))
    ret = r.text
    return ret


def get_content_dict():
    """
    获取剪切板内容python字典
    @return:
    """
    r = requests.get(nm_get_url, timeout=round(timeout / 1000, 2))
    ret = r.json()
    return ret


def get_nm_jx():
    try:
        url = 'https://m.emsdn.cn/vod-play-id-38905-src-1-num-1.html'
        headers = {'referer': nm_host, 'user-agent': MOBILE_UA}
        r = requests.get(url=url, headers=headers, timeout=5)
        html = r.text
        # mac_from=r.text.split('mac_from=')[1].split(',')[0].replace("'",'').replace('"','')
        mac_from = re.search("mac_from='(.*?)'", html).groups()[0]
        print('mac_from:', mac_from)
        # print(html)
        scripts = re.findall('script src="(.*?)"', html, re.M)
        print(scripts)
        scripts = [script for script in scripts if
                   nm_host in script or not str(script).startswith('http') or 'cnmcom' in script]
        # print(scripts)
        js_url = ''
        for script in scripts:
            if 'config' not in script:
                js_url = urljoin(url, script)
                break
        if not js_url:
            print(f'未能获取到js文件')
            return 'https://api.cnmcom.com/webcloud/nmm.php?url='
        print('js_url:', js_url)
        r = requests.get(url=js_url, headers=headers, timeout=5)
        html = r.text
        # print(html)
        jx_path = re.search('this.Path=.*?"(.*?)"', html).groups()[0]
        jx_path = urljoin(nm_host, jx_path)
        print('jx_path:', jx_path)
        # js_url = f'{nm_host}player/{mac_from}.js'
        js_url = f'{jx_path}{mac_from}.js'
        print('js_url:', js_url)
        r = requests.get(js_url, headers=headers, timeout=2)
        html = r.text
        jx_url = re.search('src="(.*?)\'', html).groups()[0]
        # print(jx_url.groups())
        print('解析入口地址:', jx_url)
        return jx_url
    except Exception as e:
        print(f'动态获取解析入口地址发生了错误:{e}')
        return 'https://api.cnmcom.com/webcloud/nmm.php?url='


async def get_jx_urls(playUrl='https://m.emsdn.cn/vod-play-id-38917-src-1-num-1.html'):
    urls = []
    from_url = playUrl
    async with Sniffer(debug=True, headless=True) as browser:
        # 在这里，async_func已被调用并已完成
        pass
    page = await browser.browser.new_page()
    await page.expose_function("log", lambda *args: print(*args))
    await page.set_extra_http_headers(headers={'referer': nm_host})
    js = """
    Object.defineProperties(navigator, {webdriver: {get: () => undefined}});
    Object.defineProperties(navigator, {platform: {get: () => 'iPhone'}});
        """
    await page.add_init_script(js)
    # ==================== 获取iframe解析入口地址 from_url ======================
    # from_url = get_nm_jx() # 代码获取from_url解析入口地址
    # await page.goto(playUrl)
    # html = await page.content()
    # print(len(html))
    # iframes = await page.locator('iframe').all()
    # src = await iframes[-1].get_attribute('src')
    #
    try:
        src, html = await get_inner_iframe(page, playUrl)
        from_url = src.split('=')[0] + '='

        # html 已经是获取过的了，所以不需要再次访问页面
        # await page.goto(from_url)
        # html = await page.content()
        # print(html)

        print('解析入口地址:', from_url)
        lis = await page.locator('li').count()
        print('共计线路数:', lis)
        lis = await page.locator('li').all()
        for li in lis:
            await li.click()
            # iframe = page.locator('#WANG')
            iframe = page.locator('iframe').first
            src = await iframe.get_attribute('src')
            urls.append(urljoin(from_url, src))
    except Exception as e:
        print(f'获取 urls, from_url 发生了错误:{e}')
    await browser.close_page(page)
    await browser.close()
    return urls, from_url


async def demo_test_nm():
    """
    自动爬取农民解析链接然后对比剪切板内容，如果发生了改变就重新写到剪切板。
    @return:
    """
    t1 = time()
    playUrl = 'https://m.emsdn.cn/vod-play-id-38917-src-1-num-1.html'
    error_msg = ''
    try:
        urls, from_url = await get_jx_urls(playUrl)
    except Exception as e:
        urls = []
        from_url = playUrl
        error_msg = f'{e}'

    t2 = time()
    cost = round((t2 - t1) * 1000, 2)
    ctime = localtime(t2)
    time_str = strftime("%Y-%m-%d %H:%M:%S", ctime)
    print(f'共计耗时{cost}毫秒,解析数:{len(urls)} 列表为: {urls}')
    c_data = {
        "data": urls,
        "code": 200,
        "cost": cost,
        "msg": "农民解析获取成功",
        "from": from_url,
        "update": time_str,
    }
    old_data = get_content_dict()
    old_urls = old_data.get('data')
    if old_urls != urls and len(urls) > 0:
        print('检测到农民影视解析地址发生变化,开始写入剪切板')
        # 如果剪切板里存的解析接口数据跟爬出来的接口数据不一致就更新剪切板内容
        c_data = json.dumps(c_data, ensure_ascii=False)
        update_content(c_data)
    elif len(urls) == 0:
        print('本次没有成功嗅探到农民解析，记录失败时间到剪切板')
        old_data['error_update'] = time_str
        old_data['error_msg'] = error_msg
        c_data = json.dumps(old_data, ensure_ascii=False)
        update_content(c_data)
    elif old_urls == urls:
        print('本次成功嗅探到农民解析并与剪切板内容一致，无需进行任何操作')


if __name__ == '__main__':
    # 主文件，作为linux定时任务调用，python3 nm_jx.py  建议1分钟一次
    # 运行事件循环
    asyncio.run(demo_test_nm())
    print(get_content())
    # get_nm_jx()
