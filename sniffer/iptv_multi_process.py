import asyncio
from playwright.async_api import async_playwright
from iptv_urls import *

# 定义一个信号量，限制最多同时运行20个任务
semaphore = asyncio.Semaphore(5)


# 异步获取页面源码
async def get_page_source(url, timeout):
    async with semaphore:  # 在任务开始前获取信号量
        # 每个任务独立管理 Playwright 实例
        async with async_playwright() as p:
            browser = await p.chromium.launch(channel='chrome', headless=False)  # 启动浏览器
            context = await browser.new_context()  # 创建新的浏览器上下文
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
