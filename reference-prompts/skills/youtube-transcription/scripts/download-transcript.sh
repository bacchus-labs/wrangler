#!/bin/bash
#
# Download YouTube transcript with automatic fallback strategy.
#
# Priority:
#   1. Manual subtitles (highest quality)
#   2. Auto-generated subtitles (usually available)
#   3. Exit with message about Whisper option (requires separate script)
#
# Usage: ./download-transcript.sh <youtube_url> [output_dir]
#
# Arguments:
#   youtube_url   - YouTube video URL
#   output_dir    - Optional output directory (default: current directory)
#
# Exit codes:
#   0 - Success
#   1 - Invalid arguments
#   2 - yt-dlp not found
#   3 - No subtitles available
#   4 - Download failed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
VIDEO_URL="${1:-}"
OUTPUT_DIR="${2:-.}"

if [ -z "$VIDEO_URL" ]; then
    echo "Usage: $0 <youtube_url> [output_dir]"
    echo ""
    echo "Examples:"
    echo "  $0 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"
    echo "  $0 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' ./transcripts"
    exit 1
fi

# Check yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo "ERROR: yt-dlp is not installed."
    echo "Run: ${SCRIPT_DIR}/check-ytdlp.sh --install"
    exit 2
fi

# Create output directory if needed
mkdir -p "$OUTPUT_DIR"

# Get video info
echo "Fetching video information..."
VIDEO_ID=$(yt-dlp --print "%(id)s" "$VIDEO_URL" 2>/dev/null)
VIDEO_TITLE=$(yt-dlp --print "%(title)s" "$VIDEO_URL" 2>/dev/null | tr '/' '_' | tr ':' '-' | tr '?' '' | tr '"' '' | tr "'" '' | tr '\\' '_')

if [ -z "$VIDEO_ID" ]; then
    echo "ERROR: Could not extract video ID. Is the URL valid?"
    exit 1
fi

echo "Video: $VIDEO_TITLE"
echo "ID: $VIDEO_ID"
echo ""

# Temporary output name
TEMP_OUTPUT="${OUTPUT_DIR}/temp_${VIDEO_ID}"

# List available subtitles
echo "Checking available subtitles..."
yt-dlp --list-subs "$VIDEO_URL" 2>&1 | head -30

echo ""

# Strategy 1: Try manual subtitles
echo "Attempting to download manual subtitles..."
if yt-dlp --write-sub --sub-langs "en.*" --skip-download --output "$TEMP_OUTPUT" "$VIDEO_URL" 2>/dev/null; then
    VTT_FILE=$(ls ${TEMP_OUTPUT}*.vtt 2>/dev/null | head -n 1)
    if [ -n "$VTT_FILE" ] && [ -f "$VTT_FILE" ]; then
        echo "Manual subtitles downloaded successfully!"

        # Convert to plain text
        FINAL_OUTPUT="${OUTPUT_DIR}/${VIDEO_TITLE}.txt"
        python3 "${SCRIPT_DIR}/vtt-to-text.py" "$VTT_FILE" "$FINAL_OUTPUT"

        # Cleanup VTT
        rm "$VTT_FILE"

        echo ""
        echo "Transcript saved to: $FINAL_OUTPUT"
        exit 0
    fi
fi

# Strategy 2: Try auto-generated subtitles
echo "Manual subtitles not available. Trying auto-generated..."
if yt-dlp --write-auto-sub --sub-langs "en.*" --skip-download --output "$TEMP_OUTPUT" "$VIDEO_URL" 2>/dev/null; then
    VTT_FILE=$(ls ${TEMP_OUTPUT}*.vtt 2>/dev/null | head -n 1)
    if [ -n "$VTT_FILE" ] && [ -f "$VTT_FILE" ]; then
        echo "Auto-generated subtitles downloaded successfully!"

        # Convert to plain text
        FINAL_OUTPUT="${OUTPUT_DIR}/${VIDEO_TITLE}.txt"
        python3 "${SCRIPT_DIR}/vtt-to-text.py" "$VTT_FILE" "$FINAL_OUTPUT"

        # Cleanup VTT
        rm "$VTT_FILE"

        echo ""
        echo "Transcript saved to: $FINAL_OUTPUT"
        exit 0
    fi
fi

# No subtitles available
echo ""
echo "No subtitles available for this video."
echo ""
echo "Options:"
echo "  1. Use Whisper transcription (downloads audio and transcribes locally)"
echo "     Run: ${SCRIPT_DIR}/whisper-transcribe.sh '$VIDEO_URL'"
echo ""
echo "  2. Try a different video"
echo ""
exit 3
