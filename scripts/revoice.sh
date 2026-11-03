#!/usr/bin/env bash
# Re-voice a video with ElevenLabs Speech-to-Speech, keeping timing and lip sync.
# Usage: scripts/revoice.sh IN.mp4 OUT.mp4 [VOICE_SECONDS] [VOICE_ID]
#   VOICE_SECONDS — length of the speech part; the rest (e.g. end-card music) is kept as is.
set -euo pipefail
IN=$1; OUT=$2; VOICE_ID=${4:-EXAVITQu4vr4xnSDxMaL}   # Sarah
[ -f .env ] && set -a && . ./.env && set +a
: "${ELEVENLABS_API_KEY:?set it in .env}"
TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
V=${3:-$TOTAL}
T=$(mktemp -d)
ffmpeg -v error -y -i "$IN" -t "$V" -vn -ac 1 -ar 44100 "$T/voice.wav"
ffmpeg -v error -y -i "$IN" -ss "$V" -vn -ac 2 -ar 48000 -f wav "$T/tail.wav" || true
curl -sSf -o "$T/sts.mp3" -X POST \
  "https://api.elevenlabs.io/v1/speech-to-speech/$VOICE_ID?output_format=mp3_44100_128" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -F audio=@"$T/voice.wav" \
  -F model_id=eleven_multilingual_sts_v2 -F remove_background_noise=true \
  -F 'voice_settings={"stability":0.5,"similarity_boost":0.8,"style":0.2,"use_speaker_boost":true}'
A="[1:a]atrim=0:$V,aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-14:TP=-1"
if [ -s "$T/tail.wav" ]; then
  FC="$A[v];[2:a]aformat=channel_layouts=stereo[t];[v][t]concat=n=2:v=0:a=1[ao]"; EXTRA=(-i "$T/tail.wav")
else
  FC="$A[ao]"; EXTRA=()
fi
ffmpeg -v error -y -i "$IN" -i "$T/sts.mp3" "${EXTRA[@]}" -filter_complex "$FC" \
  -map 0:v -map "[ao]" -c:v copy -c:a aac -b:a 160k -movflags +faststart -t "$TOTAL" "$OUT"
rm -rf "$T"; echo "Saved $OUT"
