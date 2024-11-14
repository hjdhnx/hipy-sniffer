import asyncio
from playwright.async_api import async_playwright
from iptv_urls import *

# 定义一个信号量，限制最多同时运行20个任务
semaphore = asyncio.Semaphore(5)

# 设置 Cookie
cookies = [
    {"name": "isRedirectLang", "value": "1", "domain": ".example.com", "path": "/"},
    {"name": "is_mobile", "value": "pc", "domain": ".example.com", "path": "/"},
    {"name": "baseShowChange", "value": "false", "domain": ".example.com", "path": "/"},
    {"name": "viewOneHundredData", "value": "false", "domain": ".example.com", "path": "/"},
    {"name": "HMACCOUNT", "value": "6C75FD54BD647B42", "domain": ".example.com", "path": "/"},
    {"name": "_ga", "value": "GA1.1.1585317842.1728838507", "domain": ".example.com", "path": "/"},
    {"name": "Hm_lvt_4275507ba9b9ea6b942c7a3f7c66da90", "value": "1731605818", "domain": ".example.com", "path": "/"},
    {"name": "__fcd", "value": "HOUZOEADYLLKDKZR54FAA87EFAC332D2", "domain": ".example.com", "path": "/"},
    {"name": "befor_router", "value": "%2Fresult%3Fqbase64%3DIlpIR1hUViIgJiYgY2l0eT0iYmVpamluZyI%253D",
     "domain": ".example.com", "path": "/"},
    {"name": "fofa_token",
     "value": "eyJhbGciOiJIUzUxMiIsImtpZCI6Ik5XWTVZakF4TVRkalltSTJNRFZsWXpRM05EWXdaakF3TURVMlkyWTNZemd3TUdRd1pUTmpZUT09IiwidHlwIjoiSldUIn0.eyJpZCI6NjI0MDAwLCJtaWQiOjEwMDM2MTMyNywidXNlcm5hbWUiOiLpgZPplb8iLCJwYXJlbnRfaWQiOjAsImV4cCI6MTczMTg2NTM4NX0.ryg-dxC1jtOU024c5iJFkbKRhUQpIbH0r7fp8eUOe3jD3Jv3Hc4rOlJhdq3xPG1PmF3HHh-JJFqHmDsV-huPfw",
     "domain": ".example.com", "path": "/"},
    {"name": "user",
     "value": "%7B%22id%22%3A624000%2C%22mid%22%3A100361327%2C%22is_admin%22%3Afalse%2C%22username%22%3A%22%E9%81%93%E9%95%BF%22%2C%22nickname%22%3A%22%E9%81%93%E9%95%BF%22%2C%22email%22%3A%22hjdhnx%40chacuo.net%22%2C%22avatar_medium%22%3A%22https%3A%2F%2Fnosec.org%2Fmissing.jpg%22%2C%22avatar_thumb%22%3A%22https%3A%2F%2Fnosec.org%2Fmissing.jpg%22%2C%22key%22%3A%223f78a437e8b0e3bc806f841fe1009603%22%2C%22category%22%3A%22user%22%2C%22rank_avatar%22%3A%22%22%2C%22rank_level%22%3A0%2C%22rank_name%22%3A%22%E6%B3%A8%E5%86%8C%E7%94%A8%E6%88%B7%22%2C%22company_name%22%3A%22%E9%81%93%E9%95%BF%22%2C%22coins%22%3A0%2C%22can_pay_coins%22%3A0%2C%22fofa_point%22%3A0%2C%22credits%22%3A0%2C%22expiration%22%3A%22-%22%2C%22login_at%22%3A0%2C%22data_limit%22%3A%7B%22web_query%22%3A300%2C%22web_data%22%3A3000%2C%22api_query%22%3A0%2C%22api_data%22%3A0%2C%22data%22%3A-1%2C%22query%22%3A-1%7D%2C%22expiration_notice%22%3Afalse%2C%22remain_giveaway%22%3A0%2C%22fpoint_upgrade%22%3Afalse%2C%22account_status%22%3A%22%22%2C%22parents_id%22%3A0%2C%22parents_email%22%3A%22%22%2C%22parents_fpoint%22%3A0%7D",
     "domain": ".example.com", "path": "/"},
    {"name": "is_flag_login", "value": "1", "domain": ".example.com", "path": "/"},
    {"name": "Hm_lpvt_4275507ba9b9ea6b942c7a3f7c66da90", "value": "1731606194", "domain": ".example.com", "path": "/"},
    {"name": "_ga_9GWBD260K9", "value": "GS1.1.1731605817.5.1.1731606194.0.0.0", "domain": ".example.com", "path": "/"}
]


# 异步获取页面源码
async def get_page_source(url, timeout):
    async with semaphore:  # 在任务开始前获取信号量
        # 每个任务独立管理 Playwright 实例
        async with async_playwright() as p:
            browser = await p.chromium.launch(channel='chrome', headless=False)  # 启动浏览器
            context = await browser.new_context()  # 创建新的浏览器上下文
            await context.add_cookies(cookies)  # 添加 Cookies
            page = await context.new_page()  # 创建新页面
            await page.goto(url)  # 打开指定网址
            await page.wait_for_timeout(timeout)
            content = await page.content()  # 获取页面渲染后的源码
            await context.close()  # 关闭上下文
            await browser.close()  # 关闭浏览器
        return content


# 异步运行多个任务
async def open_browser_and_run_tasks(urls, timeout):
    tasks = [get_page_source(url, timeout) for url in urls]  # 创建任务列表
    # 使用 gather 并发执行所有任务，使用信号量控制并发数量
    results = await asyncio.gather(*tasks)
    return results


def get_page_content_multi(urls, timeout=5000):
    loop = asyncio.get_event_loop()
    page_sources = loop.run_until_complete(open_browser_and_run_tasks(urls, timeout))
    return page_sources


if __name__ == "__main__":
    urls = urls2
    page_sources = get_page_content_multi(urls)

    for idx, content in enumerate(page_sources):
        print(f"Page {idx + 1} source length: {len(content)}")
        if idx == 0:
            print(content)
