#!/usr/bin/env python3
import sys
import json
import struct
import subprocess

def get_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length: return None
    length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(length).decode('utf-8')
    return json.loads(message)

msg = get_message()
if msg and "text" in msg:
	sender = msg.get("sender", "Unknown")
	text = msg["text"]
	# Send notification
	subprocess.run(["notify-send", "-t", "5000", "💬", f"{text}"])


    