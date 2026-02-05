#!/usr/bin/env python3
"""
Convert VTT subtitle files to plain text with deduplication.

YouTube's auto-generated VTT files contain duplicate lines because captions
are shown progressively with overlapping timestamps. This script removes
duplicates while preserving the original speaking order.

Usage:
    python3 vtt-to-text.py input.vtt [output.txt]

If output file is not specified, prints to stdout.
"""

import sys
import re
import argparse


def convert_vtt_to_text(input_file: str, output_file: str = None) -> str:
    """
    Convert a VTT file to plain text, removing timestamps and duplicates.

    Args:
        input_file: Path to the VTT file
        output_file: Optional path to output file. If None, returns string.

    Returns:
        The converted text content
    """
    seen = set()
    lines = []

    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()

            # Skip VTT header and metadata
            if not line:
                continue
            if line.startswith('WEBVTT'):
                continue
            if line.startswith('Kind:'):
                continue
            if line.startswith('Language:'):
                continue
            if line.startswith('NOTE'):
                continue
            # Skip timestamp lines (format: 00:00:00.000 --> 00:00:00.000)
            if '-->' in line:
                continue
            # Skip numeric cue identifiers
            if line.isdigit():
                continue

            # Remove HTML-like tags (e.g., <c>, </c>, <00:00:00.000>)
            clean = re.sub(r'<[^>]*>', '', line)

            # Decode HTML entities
            clean = clean.replace('&amp;', '&')
            clean = clean.replace('&gt;', '>')
            clean = clean.replace('&lt;', '<')
            clean = clean.replace('&quot;', '"')
            clean = clean.replace('&apos;', "'")
            clean = clean.replace('&nbsp;', ' ')

            # Remove extra whitespace
            clean = ' '.join(clean.split())

            # Skip empty lines and duplicates
            if clean and clean not in seen:
                lines.append(clean)
                seen.add(clean)

    result = '\n'.join(lines)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result)
            f.write('\n')  # Add trailing newline
        return result
    else:
        return result


def main():
    parser = argparse.ArgumentParser(
        description='Convert VTT subtitle files to plain text with deduplication'
    )
    parser.add_argument('input', help='Input VTT file')
    parser.add_argument('output', nargs='?', help='Output text file (optional, prints to stdout if omitted)')

    args = parser.parse_args()

    try:
        result = convert_vtt_to_text(args.input, args.output)

        if args.output:
            print(f"Converted to: {args.output}")
        else:
            print(result)

    except FileNotFoundError:
        print(f"Error: File not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
