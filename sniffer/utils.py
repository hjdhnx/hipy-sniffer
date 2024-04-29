#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File  : utils.py
# Author: DaShenHan&道长-----先苦后甜，任凭晚风拂柳颜------
# Author's Blog: https://blog.csdn.net/qq_32394351
# Date  : 2024/4/30

import base64


def base64Encode(text):
    """
    base64编码文本
    @param text:
    @return:
    """
    return base64.b64encode(text.encode("utf8")).decode("utf-8")  # base64编码


def base64Decode(text: str):
    """
    base64文本解码
    @param text:
    @return:
    """
    return base64.b64decode(text).decode("utf-8")  # base64解码


def atob(text):
    """
    base64编码文本-同浏览器
    :param text:
    :return:
    """
    return base64.b64decode(text.encode("utf8")).decode("latin1")


def btoa(text):
    """
    base64文本解码-同浏览器
    :param text:
    :return:
    """
    return base64.b64encode(text.encode("latin1")).decode("utf8")
