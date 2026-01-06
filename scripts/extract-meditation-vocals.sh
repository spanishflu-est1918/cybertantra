#!/bin/bash

# Extract vocals from meditation audio files using Demucs
# This will separate voice from background music

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if input directory is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Usage: $0 <input_directory> [output_directory]${NC}"
    echo "Example: $0 ./meditations ./extracted_vocals"
    exit 1
fi

INPUT_DIR="$1"
OUTPUT_DIR="${2:-./apps/cybertantra/public/audio/extracted-vocals}"

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
    echo -e "${RED}Error: Input directory '$INPUT_DIR' does not exist${NC}"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}🎵 Demucs Vocal Extraction Script${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "Input directory: ${YELLOW}$INPUT_DIR${NC}"
echo -e "Output directory: ${YELLOW}$OUTPUT_DIR${NC}"
echo ""

# Find all audio files
AUDIO_FILES=$(find "$INPUT_DIR" -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.m4a" -o -name "*.flac" \))

if [ -z "$AUDIO_FILES" ]; then
    echo -e "${RED}No audio files found in $INPUT_DIR${NC}"
    exit 1
fi

# Count files
FILE_COUNT=$(echo "$AUDIO_FILES" | wc -l | tr -d ' ')
echo -e "Found ${YELLOW}$FILE_COUNT${NC} audio file(s)"
echo ""

# Process each file
COUNTER=0
while IFS= read -r file; do
    COUNTER=$((COUNTER + 1))
    FILENAME=$(basename "$file")
    FILENAME_NO_EXT="${FILENAME%.*}"
    
    echo -e "${GREEN}[$COUNTER/$FILE_COUNT]${NC} Processing: ${YELLOW}$FILENAME${NC}"
    
    # Run Demucs with two-stems model (vocals + accompaniment)
    # This is faster and perfect for vocal extraction
    echo "  Running Demucs vocal separation..."
    demucs --two-stems=vocals -o "$OUTPUT_DIR" "$file" 2>&1 | while read line; do
        echo "  $line"
    done
    
    # The output will be in: $OUTPUT_DIR/htdemucs/FILENAME_NO_EXT/vocals.wav
    VOCAL_FILE="$OUTPUT_DIR/htdemucs/$FILENAME_NO_EXT/vocals.wav"
    
    if [ -f "$VOCAL_FILE" ]; then
        # Move and rename the vocal file to a more convenient location
        FINAL_OUTPUT="$OUTPUT_DIR/${FILENAME_NO_EXT}_vocals.wav"
        mv "$VOCAL_FILE" "$FINAL_OUTPUT"
        
        echo -e "  ${GREEN}✓ Vocals extracted to: $FINAL_OUTPUT${NC}"
        
        # Clean up the Demucs folder structure
        rm -rf "$OUTPUT_DIR/htdemucs/$FILENAME_NO_EXT"
    else
        echo -e "  ${RED}✗ Failed to extract vocals${NC}"
    fi
    
    echo ""
done <<< "$AUDIO_FILES"

# Clean up empty Demucs folders
rmdir "$OUTPUT_DIR/htdemucs" 2>/dev/null

echo -e "${GREEN}🎉 Vocal extraction complete!${NC}"
echo -e "Extracted vocals are in: ${YELLOW}$OUTPUT_DIR${NC}"
echo ""
echo -e "${YELLOW}Tip: These clean vocal files are perfect for:${NC}"
echo "  • Training a custom ElevenLabs voice clone"
echo "  • Creating a meditation-specific voice model"
echo "  • Analyzing speech patterns and pacing"