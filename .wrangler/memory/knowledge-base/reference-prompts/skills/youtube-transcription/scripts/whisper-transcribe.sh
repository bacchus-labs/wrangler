#!/bin/bash
#
# Transcribe YouTube video using Whisper when no subtitles are available.
#
# This is a LAST RESORT option that:
#   1. Downloads the audio from the video
#   2. Transcribes using OpenAI Whisper
#   3. Outputs a transcript file
#
# Usage: ./whisper-transcribe.sh <youtube_url> [output_dir] [--auto-confirm]
#
# Arguments:
#   youtube_url     - YouTube video URL
#   output_dir      - Optional output directory (default: current directory)
#   --auto-confirm  - Skip confirmation prompts (for automation)
#
# Exit codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - yt-dlp not found
#   3 - Whisper not found and user declined installation
#   4 - Download failed
#   5 - Transcription failed
#   6 - User cancelled

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
VIDEO_URL=""
OUTPUT_DIR="."
AUTO_CONFIRM=false

for arg in "$@"; do
    case "$arg" in
        --auto-confirm)
            AUTO_CONFIRM=true
            ;;
        *)
            if [ -z "$VIDEO_URL" ]; then
                VIDEO_URL="$arg"
            else
                OUTPUT_DIR="$arg"
            fi
            ;;
    esac
done

if [ -z "$VIDEO_URL" ]; then
    echo "Usage: $0 <youtube_url> [output_dir] [--auto-confirm]"
    echo ""
    echo "Examples:"
    echo "  $0 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"
    echo "  $0 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' ./transcripts"
    echo "  $0 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' ./transcripts --auto-confirm"
    exit 1
fi

# Check yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo "ERROR: yt-dlp is not installed."
    echo "Run: ${SCRIPT_DIR}/check-ytdlp.sh --install"
    exit 2
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get video info
echo "Fetching video information..."
VIDEO_ID=$(yt-dlp --print "%(id)s" "$VIDEO_URL" 2>/dev/null)
VIDEO_TITLE=$(yt-dlp --print "%(title)s" "$VIDEO_URL" 2>/dev/null)
DURATION=$(yt-dlp --print "%(duration)s" "$VIDEO_URL" 2>/dev/null || echo "unknown")
FILE_SIZE=$(yt-dlp --print "%(filesize_approx)s" -f "bestaudio" "$VIDEO_URL" 2>/dev/null || echo "unknown")

CLEAN_TITLE=$(echo "$VIDEO_TITLE" | tr '/' '_' | tr ':' '-' | tr '?' '' | tr '"' '' | tr "'" '' | tr '\\' '_')

echo ""
echo "Video: $VIDEO_TITLE"
echo "ID: $VIDEO_ID"

if [ "$DURATION" != "unknown" ]; then
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    echo "Duration: ${MINUTES}m ${SECONDS}s"
fi

if [ "$FILE_SIZE" != "unknown" ] && [ -n "$FILE_SIZE" ]; then
    SIZE_MB=$((FILE_SIZE / 1024 / 1024))
    echo "Audio size: ~${SIZE_MB} MB"
fi

echo ""

# Confirmation
if [ "$AUTO_CONFIRM" = false ]; then
    echo "This will download the audio and transcribe it using Whisper."
    echo "This may take several minutes depending on video length."
    echo ""
    read -p "Continue? (y/n): " RESPONSE
    if [[ ! "$RESPONSE" =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 6
    fi
fi

# Check Whisper
if ! command -v whisper &> /dev/null; then
    echo ""
    echo "Whisper is not installed."
    echo "Whisper requires ~1-3GB for the base model."

    if [ "$AUTO_CONFIRM" = true ]; then
        echo "Installing Whisper..."
        pip3 install openai-whisper
    else
        read -p "Install Whisper now? (y/n): " RESPONSE
        if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
            pip3 install openai-whisper
        else
            echo ""
            echo "Cannot proceed without Whisper."
            echo "Install manually with: pip3 install openai-whisper"
            exit 3
        fi
    fi
fi

# Download audio
AUDIO_FILE="${OUTPUT_DIR}/audio_${VIDEO_ID}.mp3"
echo ""
echo "Downloading audio..."
yt-dlp -x --audio-format mp3 --output "$AUDIO_FILE" "$VIDEO_URL"

if [ ! -f "$AUDIO_FILE" ]; then
    # yt-dlp might have added extension
    AUDIO_FILE=$(ls ${OUTPUT_DIR}/audio_${VIDEO_ID}.* 2>/dev/null | head -n 1)
fi

if [ ! -f "$AUDIO_FILE" ]; then
    echo "ERROR: Audio download failed."
    exit 4
fi

echo "Audio downloaded: $AUDIO_FILE"

# Transcribe
echo ""
echo "Transcribing with Whisper (this may take a few minutes)..."
echo "Using 'base' model for good balance of speed and accuracy."
echo ""

# Run Whisper and output to the same directory
cd "$OUTPUT_DIR"
if whisper "$(basename "$AUDIO_FILE")" --model base --output_format vtt --output_dir .; then
    echo ""
    echo "Transcription complete!"
else
    echo "ERROR: Transcription failed."
    exit 5
fi

# Find the VTT file
VTT_FILE=$(ls audio_${VIDEO_ID}*.vtt 2>/dev/null | head -n 1)

if [ -z "$VTT_FILE" ] || [ ! -f "$VTT_FILE" ]; then
    echo "ERROR: Could not find transcription output."
    exit 5
fi

# Convert to plain text
FINAL_OUTPUT="${CLEAN_TITLE}.txt"
python3 "${SCRIPT_DIR}/vtt-to-text.py" "$VTT_FILE" "$FINAL_OUTPUT"

# Cleanup VTT
rm "$VTT_FILE"

cd - > /dev/null

# Cleanup audio
echo ""
if [ "$AUTO_CONFIRM" = true ]; then
    rm "$AUDIO_FILE"
    echo "Audio file deleted."
else
    read -p "Delete audio file to save space? (y/n): " RESPONSE
    if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
        rm "$AUDIO_FILE"
        echo "Audio file deleted."
    else
        echo "Audio file kept: $AUDIO_FILE"
    fi
fi

echo ""
echo "Transcript saved to: ${OUTPUT_DIR}/${FINAL_OUTPUT}"
exit 0
