"""
Sucht in .md und .html Dateien nach Bildern ohne Alt-Text
und lässt Claude (Vision) eine kurze Beschreibung generieren.
Läuft als GitHub Action bei jedem Push.
"""
import os
import re
import base64
import requests
from pathlib import Path

API_KEY = os.environ["ANTHROPIC_API_KEY"]
API_URL = "https://api.anthropic.com/v1/messages"

MD_IMG_PATTERN = re.compile(r'!\[(.*?)\]\((.*?)\)')
HTML_IMG_PATTERN = re.compile(r'<img([^>]*?)src="([^"]+)"([^>]*?)>')


def get_image_description(image_path_or_url):
    """Ruft Claude Vision auf, um eine kurze Alt-Text-Beschreibung zu generieren."""
    try:
        if image_path_or_url.startswith("http"):
            img_data = requests.get(image_path_or_url, timeout=10).content
        else:
            local_path = Path(image_path_or_url)
            if not local_path.exists():
                return None
            img_data = local_path.read_bytes()

        b64 = base64.b64encode(img_data).decode("utf-8")
        media_type = "image/png" if image_path_or_url.endswith(".png") else "image/jpeg"

        response = requests.post(
            API_URL,
            headers={
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 60,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                        {"type": "text", "text": "Beschreibe dieses Bild in einem kurzen, prägnanten Satz auf Deutsch, geeignet als HTML alt-Attribut. Nur den Satz, keine Anführungszeichen, keine Einleitung."}
                    ]
                }]
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"].strip()
    except Exception as e:
        print(f"  Fehler bei {image_path_or_url}: {e}")
        return None


def process_markdown(filepath):
    text = filepath.read_text(encoding="utf-8")
    changed = False

    def replace(match):
        nonlocal changed
        alt_text, src = match.group(1), match.group(2)
        if alt_text.strip():
            return match.group(0)  # Alt-Text existiert schon
        description = get_image_description(src)
        if description:
            changed = True
            print(f"  + Alt-Text für {src}: {description}")
            return f'![{description}]({src})'
        return match.group(0)

    new_text = MD_IMG_PATTERN.sub(replace, text)
    if changed:
        filepath.write_text(new_text, encoding="utf-8")


def process_html(filepath):
    text = filepath.read_text(encoding="utf-8")
    changed = False

    def replace(match):
        nonlocal changed
        before, src, after = match.group(1), match.group(2), match.group(3)
        if 'alt=' in before or 'alt=' in after:
            return match.group(0)  # Alt-Text existiert schon
        description = get_image_description(src)
        if description:
            changed = True
            print(f"  + Alt-Text für {src}: {description}")
            return f'<img{before}src="{src}" alt="{description}"{after}>'
        return match.group(0)

    new_text = HTML_IMG_PATTERN.sub(replace, text)
    if changed:
        filepath.write_text(new_text, encoding="utf-8")


def main():
    root = Path(".")
    for filepath in root.rglob("*.md"):
        if ".git" in filepath.parts:
            continue
        print(f"Prüfe {filepath}")
        process_markdown(filepath)

    for filepath in root.rglob("*.html"):
        if ".git" in filepath.parts:
            continue
        print(f"Prüfe {filepath}")
        process_html(filepath)


if __name__ == "__main__":
    main()
