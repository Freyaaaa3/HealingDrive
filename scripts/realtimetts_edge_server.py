"""
疗愈 Agent 配套 TTS 服务：使用 Microsoft Edge 在线神经语音（edge_tts），
与仓库内 RealtimeTTS 的 EdgeEngine 相同合成通道；浏览器通过 VITE_TTS_HTTP_URL 调用。

依赖：
  pip install -r scripts/requirements-tts-server.txt

启动：
  python scripts/realtimetts_edge_server.py
  默认监听 http://127.0.0.1:5123
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

try:
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import Response
    import uvicorn
except ImportError as e:  # pragma: no cover
    raise SystemExit("请先安装依赖: pip install -r scripts/requirements-tts-server.txt") from e

try:
    import edge_tts
except ImportError as e:  # pragma: no cover
    raise SystemExit("请安装 edge-tts: pip install edge-tts") from e

DEFAULT_VOICE = os.environ.get("RTTS_VOICE", "zh-CN-XiaoxiaoNeural")
HOST = os.environ.get("RTTS_HOST", "127.0.0.1")
PORT = int(os.environ.get("RTTS_PORT", "5123"))

app = FastAPI(title="HealingDrive TTS (edge_tts / RealtimeTTS Edge channel)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "voice_default": DEFAULT_VOICE}


@app.post("/speak")
async def speak(request: Request) -> Response:
    body: dict[str, Any] = {}
    try:
        body = await request.json()
    except json.JSONDecodeError:
        body = {}

    text = (body.get("text") or "").strip()
    if not text:
        return Response(status_code=400, content=b"missing text")

    voice = (body.get("voice") or DEFAULT_VOICE).strip()
    rate = body.get("rate")
    volume = body.get("volume")

    # 前端 rate 约 0.5~2.0（SpeechSynthesis）；edge 使用百分比字符串
    rate_str = "+0%"
    if isinstance(rate, (int, float)):
        pct = int(round((float(rate) - 1.0) * 100))
        rate_str = f"{pct:+d}%"

    volume_str = "+0%"
    if isinstance(volume, (int, float)):
        v = float(volume)
        v = max(0.0, min(1.0, v))
        pct = int(round((v - 1.0) * 100))
        volume_str = f"{pct:+d}%"

    communicate = edge_tts.Communicate(
        text,
        voice,
        rate=rate_str,
        volume=volume_str,
        pitch="+0Hz",
    )

    buf = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            buf.extend(chunk["data"])

    return Response(content=bytes(buf), media_type="audio/mpeg")


def main() -> None:
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
