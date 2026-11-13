#!/usr/bin/env python3
"""
Genera la voz y la linea de tiempo de un video.

Uso:
    python scripts/voice.py --slug=lehman
    python scripts/voice.py --slug=lehman --rate=-6% --gap=0.28

Entrada:
    scripts/narration/<slug>.txt   una frase por plano (una por linea).
                                   Las lineas vacias y las que empiezan por # se ignoran.

Salida:
    public/<slug>/voice.mp3        voz procesada (high-pass, de-esser, compresor, -14 LUFS)
    src/videos/<slug>/timeline.json  palabras con tiempos y un plano por frase

Requisitos: pip install edge-tts  +  ffmpeg/ffprobe en el PATH.
Todo es local y gratuito: no hay claves ni cuotas.
"""
import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent

# Cadena de voz: quita retumbe, suaviza las eses, iguala dinamica y normaliza.
CHAIN = (
    "highpass=f=80,"
    "deesser=i=0.4,"
    "acompressor=threshold=-18dB:ratio=3:attack=8:release=180:makeup=2,"
    "loudnorm=I=-14:TP=-1.5:LRA=11"
)


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"ERROR: {' '.join(cmd)}\n{result.stderr[-2000:]}")


def duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ]
    )
    return float(out.strip())


def read_lines(slug: str) -> list[str]:
    source = ROOT / "scripts" / "narration" / f"{slug}.txt"
    if not source.exists():
        sys.exit(f"Falta {source.relative_to(ROOT)} (una frase por plano).")

    lines = [
        line.strip()
        for line in source.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not lines:
        sys.exit(f"{source.relative_to(ROOT)} no tiene ninguna frase util.")
    return lines


async def synth(text: str, voice: str, rate: str, mp3: Path) -> list[dict]:
    communicate = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words: list[dict] = []

    with open(mp3, "wb") as handle:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                handle.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append(
                    {
                        "text": chunk["text"],
                        "start": chunk["offset"] / 1e7,
                        "end": (chunk["offset"] + chunk["duration"]) / 1e7,
                    }
                )
    return words


def main():
    parser = argparse.ArgumentParser(description="Voz y timeline de un video.")
    parser.add_argument("--slug", required=True)
    parser.add_argument("--voice", default="es-ES-AlvaroNeural")
    parser.add_argument("--rate", default="-4%")
    parser.add_argument("--gap", type=float, default=0.32)
    parser.add_argument("--tail", type=float, default=0.75)
    parser.add_argument("--keep-raw", action="store_true", help="no procesa la voz")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.slug):
        parser.error("--slug solo puede contener letras minusculas, numeros y guiones")

    work = ROOT / ".cache" / f"voice-{args.slug}"
    work.mkdir(parents=True, exist_ok=True)
    public = ROOT / "public" / args.slug
    public.mkdir(parents=True, exist_ok=True)

    lines = read_lines(args.slug)
    timeline = {"voice": args.voice, "gap": args.gap, "lines": [], "scenes": []}
    parts: list[Path] = []
    cursor = 0.0

    for index, text in enumerate(lines, start=1):
        mp3 = work / f"line-{index:02d}.mp3"
        wav = work / f"line-{index:02d}.wav"
        words = asyncio.run(synth(text, args.voice, args.rate, mp3))
        if not words:
            sys.exit(f"Plano {index}: edge-tts no devolvio tiempos de palabra.")

        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "44100", "-ac", "1", str(wav)])
        line_duration = duration(wav)

        for word in words:
            word["start"] = round(word["start"] + cursor, 3)
            word["end"] = round(word["end"] + cursor, 3)

        timeline["lines"].append(
            {
                "index": index,
                "text": text,
                "start": round(cursor, 3),
                "end": round(cursor + line_duration, 3),
                "duration": round(line_duration, 3),
                "words": words,
            }
        )
        timeline["scenes"].append(
            {
                "frame": index,
                "start": round(cursor, 3),
                "end": round(cursor + line_duration, 3),
                "duration": round(line_duration, 3),
                "text": text,
            }
        )

        parts.append(wav)
        cursor += line_duration
        if index < len(lines):
            silence = work / f"gap-{args.gap:.3f}.wav"
            if not silence.exists():
                run(
                    [
                        "ffmpeg", "-y", "-loglevel", "error",
                        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                        "-t", str(args.gap), str(silence),
                    ]
                )
            parts.append(silence)
            cursor += args.gap

    concat = work / "concat.txt"
    concat.write_text("".join(f"file '{part}'\n" for part in parts))
    raw = work / "voice-raw.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(raw)])

    # Cada plano dura hasta que empieza el siguiente; el ultimo llega al final.
    for index in range(len(timeline["scenes"]) - 1):
        timeline["scenes"][index]["end"] = timeline["scenes"][index + 1]["start"]
    timeline["scenes"][-1]["end"] = round(cursor + args.tail, 3)
    for scene in timeline["scenes"]:
        scene["duration"] = round(scene["end"] - scene["start"], 3)

    voice = public / "voice.mp3"
    filters = [] if args.keep_raw else ["-af", CHAIN]
    run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
            *filters,
            "-ar", "44100", "-ac", "1", "-b:a", "192k", str(voice),
        ]
    )

    timeline["total"] = round(duration(voice), 3)
    timeline["video_duration"] = round(cursor + args.tail, 3)

    out = ROOT / "src" / "videos" / args.slug / "timeline.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Voz: {timeline['total']}s | Video: {timeline['video_duration']}s | {len(lines)} planos")
    for scene in timeline["scenes"]:
        print(f"  {scene['frame']:02d}  {scene['start']:6.2f} -> {scene['end']:6.2f}  {scene['text'][:56]}")
    print(f"\n{out.relative_to(ROOT)} y {voice.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
