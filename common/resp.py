from pydantic import BaseModel
from typing import Union, Optional
import datetime
import decimal
import json
from quart import make_response
from .error_code import ErrorBase


class DateEncoder(json.JSONEncoder):
    """
    解决dict 转json 时 datetime 转换失败
    使用方法：json.dumps(data, cls=DateEncoder)
    """

    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(obj, datetime.date):
            return obj.strftime("%Y-%m-%d")
        elif isinstance(obj, decimal.Decimal):
            return float(obj)
        else:
            return json.JSONEncoder.default(self, obj)


def HTMLResponse(content, status_code=200):
    media_type = "text/html; charset=UTF-8"
    headers = {"Content-type": media_type}
    return make_response((content, status_code, headers))


def PlainTextResponse(content, status_code=200):
    media_type = "text/plain; charset=UTF-8"
    headers = {"Content-type": media_type}
    return make_response((content, status_code, headers))


def JSONResponse(content: dict, status_code=200):
    media_type = "application/json; charset=UTF-8"
    headers = {"Content-type": media_type}
    data = json.dumps(content, ensure_ascii=False, indent=4, cls=DateEncoder)
    return make_response((data, status_code, headers))


class RespJsonBase(BaseModel):
    code: int
    msg: str
    data: Union[dict, list]


def respSuccessJson(data: Union[list, dict, str] = None, msg: str = "Success"):
    """ 接口成功返回 """
    if not data and not isinstance(data, list) and not isinstance(data, dict):
        data = {}
    return JSONResponse(
        status_code=200,
        content={
            'code': 0,
            'msg': msg,
            'data': data
        }
    )


def respVodJson(data: Union[list, dict, str] = None):
    """ 接口成功返回 """
    if not data and not isinstance(data, list) and not isinstance(data, dict):
        data = {}
    return JSONResponse(
        status_code=200,
        content=data
    )


def respParseJson(data: Union[list, dict, str] = None, msg: str = '', code: int = 200, url: str = '', extra=None):
    """ 解析接口返回 """
    content = {'code': code, 'msg': msg, 'url': url}
    if not data and not isinstance(data, list) and not isinstance(data, dict):
        data = {}
    if extra is None:
        extra = {}

    if data:
        content['data'] = data
    headers = {
        "user-agent": "Mozilla/5.0"
    }
    if 'bilivideo.c' in url:
        headers.update({
            'referer': 'https://www.bilibili.com/'
        })
    content.update({'headers': headers})
    content.update(extra)
    return JSONResponse(
        status_code=code,
        content=content
    )


def respErrorJson(error: ErrorBase, *, msg: Optional[str] = None, msg_append: str = "",
                  data: Union[list, dict, str] = None, status_code: int = 200):
    """ 错误接口返回 """
    return JSONResponse(
        status_code=status_code,
        content={
            'code': error.code,
            'msg': (msg or error.msg) + msg_append,
            'data': data or {}
        }
    )


def abort(status_code=None, content=None):
    if status_code is None:
        status_code = 403
    if content is None:
        content = """
 <!doctype html>
<html lang=en>
<title>403 Forbidden</title>
<h1>Forbidden</h1>
<p>You don&#39;t have the permission to access the requested resource. It is either read-protected or not readable by the server.</p>       
        """.strip()
    return HTMLResponse(status_code=status_code, content=content)
