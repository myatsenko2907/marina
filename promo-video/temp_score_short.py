#!/usr/bin/env python3
"""TEMP soundtrack (placeholder only): 120 BPM hybrid-cinematic pulse matching edl.json sections.
Replace music.mp3 with a licensed/ElevenLabs track for the final cut."""
import numpy as np, wave, subprocess, sys
from pathlib import Path

SR = 48000
import os
LEN = float(os.environ.get('LEN', 120))
KS = LEN / 120.0
BEAT = 0.5
N = int(SR * LEN)
t = np.arange(N) / SR
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)

def env(n, a, d):
    e = np.ones(n); ai = int(a * SR); di = n - ai
    if ai: e[:ai] = np.linspace(0, 1, ai)
    e[ai:] = np.exp(-np.linspace(0, d, di))
    return e

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - pan) ** 0.5; R[i:j] += s * (1 + pan) ** 0.5

def lowpass(x, a):
    y = np.empty_like(x); acc = 0.0
    for k in range(0, len(x), 4096):
        seg = x[k:k + 4096]
        out = np.empty_like(seg)
        for m, v in enumerate(seg):
            acc += a * (v - acc); out[m] = acc
        y[k:k + 4096] = out
    return y

def note(f): return 440 * 2 ** ((f - 69) / 12)

# --- pad: Am F C G (4 s per chord), detuned saws, slow filter via one-pole + chorus
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
pad = np.zeros(N)
for c in range(int(LEN / 4)):
    ch = chords[c % 4]; s, e = int(c * 4 * SR), int((c + 1) * 4 * SR)
    tt = t[s:e] - c * 4
    seg = np.zeros(e - s)
    for m in ch + [ch[0] - 12]:
        for det in (-0.12, 0.0, 0.12):
            f = note(m + det)
            seg += 2 * ((tt * f) % 1) - 1
    fade = np.minimum(1, np.minimum(tt / 0.4, (4 - tt) / 0.4))
    pad[s:e] = seg * fade
pad = np.convolve(pad, np.ones(24) / 24, mode="same")  # soften
pad *= 0.035
# swell: quiet intro, full in body, bigger in montage, decay in outro
sw = np.interp(t, [0, 3, 4, LEN-20, LEN-19, LEN-7, LEN-6, LEN], [0.5, 0.85, 0.95, 0.9, 1.15, 1.15, 1.3, 0.0])
L += pad * sw; R += np.roll(pad, 300) * sw

# --- sub bass pulse on 8ths (root of chord)
for k in range(int(4 / 0.25), int((LEN-7) / 0.25)):
    st = k * 0.25; ch = chords[int(st // 4) % 4]
    n = int(0.22 * SR); tt = np.arange(n) / SR
    b = np.sin(2 * np.pi * note(ch[0] - 24) * tt) * env(n, 0.005, 6)
    add(b, st, 0, 0.22 if k % 2 == 0 else 0.13)

# --- kick
def kick():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    f = 45 + 110 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 9)
K = kick()
for k in range(int(LEN / BEAT)):
    st = k * BEAT
    if 4 <= st < LEN-7 or (1 <= st < 4 and k % 4 == 0):
        add(K, st, 0, 0.7 if st >= 4 else 0.45)

# --- snare/clap on 2 & 4 in body, toms build in montage
def noise_hit(dur, dec, lp):
    n = int(dur * SR); x = rng.standard_normal(n) * env(n, 0.001, dec)
    return np.convolve(x, np.ones(lp) / lp, mode="same")
SN = noise_hit(0.3, 14, 3)
HH = noise_hit(0.05, 40, 1) - noise_hit(0.05, 40, 6)
for k in range(int(LEN / BEAT)):
    st = k * BEAT
    if 4 <= st < LEN-7 and k % 2 == 1:
        add(SN, st, 0.1, 0.32)
for k in range(int(LEN / 0.25)):
    st = k * 0.25
    if 8 <= st < LEN-7:
        add(HH, st, 0.4 if k % 2 else -0.4, 0.10 if k % 2 else 0.05)
def tom(f):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-tt * 20))) / SR) * env(n, 0.002, 7)
T1, T2 = tom(90), tom(65)
for k in range(int((LEN-20) / 0.25), int((LEN-7) / 0.25)):
    st = k * 0.25
    if k % 4 in (1, 3): add(T1 if k % 8 < 4 else T2, st, -0.3 if k % 8 < 4 else 0.3, 0.32)

# --- risers into each big section + impacts
def riser(d):
    n = int(d * SR); tt = np.arange(n) / SR
    x = rng.standard_normal(n); x = np.convolve(x, np.ones(8) / 8, mode="same")
    return x * (tt / d) ** 2.5 * 0.5
def impact():
    n = int(3.5 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 80 * np.exp(-tt * 6)) / SR) * env(n, 0.002, 2.2)
    return boom + noise_hit(3.5, 5, 12) * 0.5
IMP = impact()
for at, d in [(4, 2), (LEN-20, 2), (LEN-7, 3)]:
    add(riser(d), at - d, 0, 0.5)
    add(IMP, at, 0, 0.9 if at in (4, LEN-7) else 0.6)

# --- piano-ish arpeggio motif (sine + harmonics), sparse in intro, steady in body
def pluck(f, d=0.6):
    n = int(d * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt) + 0.15 * np.sin(6 * np.pi * f * tt)) * env(n, 0.003, 7)
for k in range(int(LEN / 0.25)):
    st = k * 0.25
    if st >= LEN-7: break
    ch = chords[int(st // 4) % 4]
    step = [0, 1, 2, 1, 0, 2, 1, 2][k % 8]
    if st < 4 and k % 2: continue
    add(pluck(note(ch[step] + 12)), st, 0.5 if k % 2 else -0.5, 0.06 if st < 4 else 0.05)

# master: soft clip, normalise
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.9
out = Path(sys.argv[1] if len(sys.argv) > 1 else "music_temp.wav")
with wave.open(str(out), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("wrote", out)
