"""End-to-end test: submit expression training and verify AI feedback."""

import asyncio
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")

OUT = "C:/Users/zhb/Desktop/screenshots_speakup/e2e_feedback.png"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-proxy-server", "--proxy-bypass-list=*"],
        )
        context = await browser.new_context(
            viewport={"width": 414, "height": 896},
            device_scale_factor=2,
            locale="zh-CN",
        )
        page = await context.new_page()

        # Seed localStorage so we skip onboarding
        await page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded")
        await page.evaluate("""() => {
            localStorage.setItem('user_id', 'e2e_test_user');
            localStorage.setItem('nickname', '小明');
            localStorage.setItem('age_stage', 'college');
        }""")

        # Go to expression training
        print("Navigating to /train/expression...")
        await page.goto("http://127.0.0.1:3000/train/expression", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Type a practice message
        print("Typing practice message...")
        textarea = await page.query_selector("textarea")
        await textarea.fill("领导让我加班完成一个不太重要的报告，我该怎么委婉拒绝？")

        # Click submit
        print("Submitting to backend (DeepSeek LLM)...")
        submit_btn = await page.query_selector("button:has-text('提交练习')")
        await submit_btn.click()

        # Wait for feedback to appear (up to 30s for LLM)
        print("Waiting for AI feedback...")
        try:
            await page.wait_for_selector("text=AI 教练", timeout=30000)
            print("AI feedback received!")
        except Exception:
            print("AI feedback did not appear in time")
            await page.screenshot(path=OUT, full_page=True)
            await browser.close()
            return

        await page.wait_for_timeout(1500)

        # Screenshot first
        await page.screenshot(path=OUT, full_page=True)
        print(f"Screenshot saved: {OUT}")

        # Extract feedback text via page content
        body_text = await page.inner_text("body")
        lines = [l.strip() for l in body_text.split('\n') if l.strip()]

        # Find AI reply line
        ai_reply = ""
        for i, line in enumerate(lines):
            if "AI 教练" in line or "AI 教练反馈" in line:
                # Next few lines should contain the reply
                ai_reply = " ".join(lines[i+1:i+5])
                break

        print(f"\nAI Reply preview: {ai_reply[:200]}...\n")

        # Check scores exist
        scores = sum(1 for l in lines if "/10" in l)
        print(f"Score bars found: {scores}")

        # Check strengths/improvements
        has_strengths = any("做得好的" in l or "亮点" in l for l in lines)
        has_improvements = any("可优化" in l for l in lines)
        print(f"Has strengths section: {has_strengths}")
        print(f"Has improvements section: {has_improvements}")

        # Verify all key parts
        ok = scores >= 4 and has_strengths and has_improvements and len(ai_reply) > 10
        if ok:
            print("\nEnd-to-end test PASSED!")
        else:
            print("\nEnd-to-end test FAILED")

        await browser.close()


asyncio.run(main())
