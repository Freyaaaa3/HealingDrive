"""
疗愈 Agent 本地离线 ASR 服务
基于 Vosk 中文模型，通过 WebSocket 接收浏览器 PCM 音频流并返回识别结果。
无需连接互联网，可在国内正常使用。

依赖安装:
  pip install -r scripts/requirements-asr-server.txt

模型下载（自动）:
  python -c "from vosk import Model; Model(lang='cn')"

启动:
  python scripts/realtimeasr_server.py
  默认监听 ws://127.0.0.1:5124

前端配置:
  VITE_ASR_PROVIDER=local
  VITE_ASR_WS_URL=ws://127.0.0.1:5124
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="[Vosk ASR] %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger(__name__)

HOST = os.environ.get("ASR_HOST", "127.0.0.1")
PORT = int(os.environ.get("ASR_PORT", "5124"))
MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", "")
SAMPLE_RATE = 16000


def resolve_model_path() -> str:
    """查找 Vosk 中文模型路径。
    
    返回空字符串表示使用 Vosk 默认模型搜索路径（自动下载 + 缓存）。
    """
    # 环境变量显式指定
    if MODEL_PATH and os.path.isdir(MODEL_PATH):
        # 校验是否真的是 Vosk 模型目录（含有 am/ 或 mfcc.conf 等文件）
        has_model_files = any(
            f in os.listdir(MODEL_PATH)
            for f in ("am", "mfcc.conf", "conf", "graph")
        )
        if has_model_files:
            return MODEL_PATH
        log.warning("环境变量 VOSK_MODEL_PATH 指向的目录不是有效的 Vosk 模型，将使用默认路径")

    # 常见位置（增加有效性校验）
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "models", "vosk-model-small-cn-0.22"),
        os.path.expanduser("~/.cache/vosk/vosk-model-small-cn-0.22"),
        os.path.expanduser("~/AppData/Local/vosk/vosk-model-small-cn-0.22"),
    ]
    for p in candidates:
        expanded = os.path.abspath(p)
        if os.path.isdir(expanded) and os.path.isdir(os.path.join(expanded, "am")):
            return expanded

    return ""  # 让 Vosk 的 Model(lang="cn") 自动处理


def create_recognizer(model: object) -> object:
    """创建 Vosk 识别器（兼容不同 vosk 版本 API）。"""
    try:
        from vosk import KaldiRecognizer
        return KaldiRecognizer(model, SAMPLE_RATE)
    except TypeError:
        from vosk import KaldiRecognizer
        return KaldiRecognizer(model, SAMPLE_RATE, "[]")


async def handle_websocket(model: object, websocket) -> None:
    """处理单个 WebSocket 连接：接收 PCM 音频，返回识别结果。"""
    rec = create_recognizer(model)
    rec.SetWords(False)

    log.info("客户端已连接，开始识别...")

    try:
        async for message in websocket:
            if isinstance(message, bytes):
                # PCM int16, 16kHz, mono, little-endian
                if rec.AcceptWaveform(message):
                    result = json.loads(rec.Result())
                    text = result.get("text", "").strip()
                    if text:
                        await websocket.send(json.dumps({
                            "type": "final",
                            "text": text,
                        }))
                else:
                    partial = json.loads(rec.PartialResult())
                    text = partial.get("partial", "").strip()
                    if text:
                        await websocket.send(json.dumps({
                            "type": "interim",
                            "text": text,
                        }))
    except Exception:
        pass
    finally:
        log.info("客户端已断开")


async def main() -> None:
    import websockets
    from vosk import Model
    import functools

    # 检查是否有显式路径
    model_path = resolve_model_path()
    if model_path:
        log.info("加载模型: %s", model_path)
        vosk_model = Model(model_path)
    else:
        log.info("正在加载 Vosk 中文模型（可能自动下载，约42MB）...")
        vosk_model = Model(lang="cn")
    log.info("Vosk 模型加载完成")

    log.info("WebSocket 服务启动 ws://%s:%s", HOST, PORT)
    log.info("前端配置: VITE_ASR_PROVIDER=local | VITE_ASR_WS_URL=ws://%s:%s", HOST, PORT)

    handler = functools.partial(handle_websocket, vosk_model)
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
