"""Take screenshots of all key pages and run a quick smoke test."""

import asyncio
import os
import sys
from pathlib import Path

OUT = Path("C:/Users/zhb/Desktop/screenshots_speakup")
OUT.mkdir(exist_ok=True)


async def main():
    from playwright.async_api import async_playwright

    BASE = "http://127.0.0.1:3000"

    pages_to_test = [
        ("01_onboarding_step1", f"{BASE}/onboarding", None),
        ("02_home", f"{BASE}/", "set_user"),
        ("03_expression", f"{BASE}/train/expression", "set_user"),
        ("04_scene", f"{BASE}/train/scene", "set_user"),
        ("05_optimize", f"{BASE}/train/optimize", "set_user"),
        ("06_etiquette", f"{BASE}/train/etiquette", "set_user"),
        ("07_voice", f"{BASE}/train/voice", "set_user"),
        ("08_growth", f"{BASE}/growth", "set_user"),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-proxy-server",
                "--proxy-bypass-list=*",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 414, "height": 896},  # iPhone 11 portrait
            device_scale_factor=2,
            locale="zh-CN",
        )

        for name, url, action in pages_to_test:
            page = await context.new_page()
            try:
                if action == "set_user":
                    # Seed localStorage so onboarding gate is bypassed
                    await page.goto(BASE)
                    await page.evaluate(
                        """() => {
                            localStorage.setItem('user_id', 'demo_screenshot');
                            localStorage.setItem('nickname', '小明');
                            localStorage.setItem('age_stage', 'college');
                        }"""
                    )
                await page.goto(url, wait_until="networkidle", timeout=20000)
                await page.wait_for_timeout(2500)
                target = OUT / f"{name}.png"
                await page.screenshot(path=str(target), full_page=True)
                print(f"OK {name}: {target}")
            except Exception as e:
                print(f"FAIL {name}: {e}")
            finally:
                await page.close()

        await context.close()
        await browser.close()


asyncio.run(main())
