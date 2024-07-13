#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : data_map.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Author's Blog: https://blog.csdn.net/qq_32394351
# Date  : 2024/4/23
import re

# 对以下站点屏蔽head请求尝试
head_excludes = [
    'https://capi.yangshipin.cn/api/.*',
    'https://csapi.yangshipin.cn/voapi/.*',
    'https://comment.yangshipin.cn/web/web_channel_config.*',
    'https://www.google.com/recaptcha.*',
    '.*google.com.*',
    'https://googleads.g.doubleclick.net/pagead.*',
    'https://ia.51.la/go1.*',
    'khmdaawd.rg8e4tt5.com.*',
]

# 排除以下链接视为直链
real_url_excludes = [
    'https://p.data.cctv.com/play.*',
    '.*cdrmldcctv3_1/index.m3u8',
    # '.*cdrmldcctv3_1_480P/playlist.m3u8',
]

# 央视电视台对应的pid
ysp_map = {'cctv4k': '600002264', 'cctv1': '600001859', 'cctv2': '600001800', 'cctv3(vip)': '600001801',
           'cctv4': '600001814', 'cctv5(限免)': '600001818', 'cctv5+(限免)': '600001817', 'cctv6(vip)': '600001802',
           'cctv7': '600004092', 'cctv8(vip)': '600001803', 'cctv9': '600004078', 'cctv10': '600001805',
           'cctv11': '600001806', 'cctv12': '600001807', 'cctv13': '600001811', 'cctv14': '600001809',
           'cctv15': '600001815', 'cctv16-hd': '600098637', 'cctv16(4k）(vip)': '600099502', 'cctv17': '600001810',
           'cgtn': '600014550', 'cgtn法语频道': '600084704', 'cgtn俄语频道': '600084758',
           'cgtn阿拉伯语频道': '600084782', 'cgtn西班牙语频道': '600084744', 'cgtn外语纪录频道': '600084781',
           'cctv风云剧场频道(vip)': '600099658', 'cctv第一剧场频道(vip)': '600099655',
           'cctv怀旧剧场频道(vip)': '600099620', 'cctv世界地理频道(vip)': '600099637',
           'cctv风云音乐频道(vip)': '600099660', 'cctv兵器科技频道(vip)': '600099649',
           'cctv风云足球频道(vip)': '600099636', 'cctv高尔夫·网球频道(vip)': '600099659',
           'cctv女性时尚频道(vip)': '600099650', 'cctv央视文化精品频道(vip)': '600099653',
           'cctv央视台球频道(vip)': '600099652', 'cctv电视指南频道(vip)': '600099656',
           'cctv卫生健康频道(vip)': '600099651', '北京卫视': '600002309', '江苏卫视': '600002521',
           '东方卫视': '600002483', '浙江卫视': '600002520', '湖南卫视': '600002475', '湖北卫视': '600002508',
           '广东卫视': '600002485', '广西卫视': '600002509', '黑龙江卫视': '600002498', '海南卫视': '600002506',
           '重庆卫视': '600002531', '深圳卫视': '600002481', '四川卫视': '600002516', '河南卫视': '600002525',
           '福建东南卫视': '600002484', '贵州卫视': '600002490', '江西卫视': '600002503', '辽宁卫视': '600002505',
           '安徽卫视': '600002532', '河北卫视': '600002493', '山东卫视': '600002513'}


def can_head_check(url):
    can_check = True
    for h in head_excludes:
        if re.search(h, url):
            can_check = False
            break
    return can_check


if __name__ == '__main__':
    url = 'https://capi.yangshipin.cn/api/oms/pc/config?342777256'
    print(can_head_check(url))
