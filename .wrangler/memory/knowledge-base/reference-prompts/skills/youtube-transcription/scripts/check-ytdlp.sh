#!/bin/bash
#
# Check if yt-dlp is installed, attempt installation if not.
#
# Usage: ./check-ytdlp.sh [--install]
#
# Options:
#   --install    Automatically attempt installation if not found
#
# Exit codes:
#   0 - yt-dlp is available
#   1 - yt-dlp not found and installation not attempted
#   2 - Installation failed

set -e

INSTALL_FLAG="${1:-}"

check_ytdlp() {
    if command -v yt-dlp &> /dev/null; then
        echo "yt-dlp is installed: $(which yt-dlp)"
        yt-dlp --version
        return 0
    else
        return 1
    fi
}

install_ytdlp() {
    echo "yt-dlp not found. Attempting installation..."

    # Try Homebrew (macOS)
    if command -v brew &> /dev/null; then
        echo "Installing via Homebrew..."
        if brew install yt-dlp; then
            echo "Successfully installed via Homebrew"
            return 0
        fi
    fi

    # Try apt (Debian/Ubuntu)
    if command -v apt &> /dev/null; then
        echo "Installing via apt..."
        if sudo apt update && sudo apt install -y yt-dlp; then
            echo "Successfully installed via apt"
            return 0
        fi
    fi

    # Try pip as fallback
    if command -v pip3 &> /dev/null; then
        echo "Installing via pip3..."
        if pip3 install yt-dlp; then
            echo "Successfully installed via pip3"
            return 0
        fi
    fi

    if command -v python3 &> /dev/null; then
        echo "Installing via python3 -m pip..."
        if python3 -m pip install yt-dlp; then
            echo "Successfully installed via python3 -m pip"
            return 0
        fi
    fi

    echo ""
    echo "ERROR: Could not install yt-dlp automatically."
    echo ""
    echo "Please install manually using one of these methods:"
    echo "  - macOS:   brew install yt-dlp"
    echo "  - Linux:   sudo apt install yt-dlp"
    echo "  - pip:     pip3 install yt-dlp"
    echo "  - Manual:  https://github.com/yt-dlp/yt-dlp#installation"
    echo ""
    return 1
}

# Main logic
if check_ytdlp; then
    exit 0
fi

if [ "$INSTALL_FLAG" = "--install" ]; then
    if install_ytdlp; then
        # Verify installation
        if check_ytdlp; then
            exit 0
        else
            echo "Installation appeared to succeed but yt-dlp still not found in PATH"
            exit 2
        fi
    else
        exit 2
    fi
else
    echo ""
    echo "yt-dlp is not installed."
    echo "Run with --install to attempt automatic installation."
    echo ""
    exit 1
fi
