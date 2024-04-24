#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : live_spider.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Date  : 2024/4/24
import requests
import re


def liveSearch(name):
    data = {
        'search': name.lower(),
        'Submit': '+',
    }
    headers = {
        'Referer': 'http://tonkiang.us/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    }
    try:
        r = requests.post('http://tonkiang.us/', data=data, headers=headers, timeout=5)
        html = r.text
        # print(html)
        play_urls = re.findall('onclick=.*\("(.*?)"\)', html, re.M)
        play_urls = [p for p in play_urls if str(p).startswith('http')]
        return play_urls
    except Exception as e:
        print(f'liveSearch发生了错误:{e}')
        return []


if __name__ == '__main__':
    cctv3 = liveSearch('cctv3')
    print(len(cctv3), cctv3[0])
    cctv8 = liveSearch('cctv8')
    print(len(cctv8), cctv8[0])
