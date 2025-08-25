#!/bin/bash

# Parallel extraction of vocals from meditation audio files using Demucs
# This runs multiple Demucs processes concurrently for faster processing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_PARALLEL=${MAX_PARALLEL:-4}  # Number of parallel jobs (default: 4)
MODEL_NAME=${MODEL_NAME:-"mdx_extra_q"}  # Faster model

# Check if input directory is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Usage: $0 <input_directory> [output_directory]${NC}"
    echo "Example: $0 ./downloads/meditation"
    echo ""
    echo "Environment variables:"
    echo "  MAX_PARALLEL=4  # Number of parallel jobs"
    echo "  MODEL_NAME=mdx_extra_q  # Demucs model to use"
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

echo -e "${GREEN}🎵 Parallel Demucs Vocal Extraction${NC}"
echo -e "${GREEN}===================================${NC}"
echo -e "Input directory: ${YELLOW}$INPUT_DIR${NC}"
echo -e "Output directory: ${YELLOW}$OUTPUT_DIR${NC}"
echo -e "Parallel jobs: ${YELLOW}$MAX_PARALLEL${NC}"
echo -e "Model: ${YELLOW}$MODEL_NAME${NC}"
echo ""

# Find all audio files (including opus)
AUDIO_FILES=$(find "$INPUT_DIR" -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.m4a" -o -name "*.flac" -o -name "*.opus" \))

if [ -z "$AUDIO_FILES" ]; then
    echo -e "${RED}No audio files found in $INPUT_DIR${NC}"
    exit 1
fi

# Count files
FILE_COUNT=$(echo "$AUDIO_FILES" | wc -l | tr -d ' ')
echo -e "Found ${YELLOW}$FILE_COUNT${NC} audio file(s)"
echo ""

# Function to process a single file
process_file() {
    local file="$1"
    local index="$2"
    local total="$3"
    
    FILENAME=$(basename "$file")
    FILENAME_NO_EXT="${FILENAME%.*}"
    
    echo -e "${BLUE}[$index/$total]${NC} Starting: ${YELLOW}$FILENAME${NC}"
    
    # Run Demucs silently and capture only errors
    if demucs --two-stems=vocals -n "$MODEL_NAME" -o "$OUTPUT_DIR" "$file" > /dev/null 2>&1; then
        # The output will be in: $OUTPUT_DIR/$MODEL_NAME/FILENAME_NO_EXT/vocals.wav
        VOCAL_FILE="$OUTPUT_DIR/$MODEL_NAME/$FILENAME_NO_EXT/vocals.wav"
        
        if [ -f "$VOCAL_FILE" ]; then
            # Move and rename the vocal file to a more convenient location
            FINAL_OUTPUT="$OUTPUT_DIR/${FILENAME_NO_EXT}_vocals.wav"
            mv "$VOCAL_FILE" "$FINAL_OUTPUT"
            
            # Clean up the Demucs folder structure
            rm -rf "$OUTPUT_DIR/$MODEL_NAME/$FILENAME_NO_EXT"
            
            echo -e "${GREEN}  ✓ [$index/$total] Completed: $FILENAME_NO_EXT${NC}"
        else
            echo -e "${RED}  ✗ [$index/$total] Failed: $FILENAME${NC}"
        fi
    else
        echo -e "${RED}  ✗ [$index/$total] Error processing: $FILENAME${NC}"
    fi
}

# Export the function so it can be used in subshells
export -f process_file
export OUTPUT_DIR MODEL_NAME RED GREEN YELLOW BLUE NC

# Process files in parallel
echo -e "${GREEN}Processing $FILE_COUNT files with $MAX_PARALLEL parallel jobs...${NC}"
echo ""

# Counter for file indexing
COUNTER=0

# Create a temporary file to track jobs
JOBFILE=$(mktemp)

# Start processing files in parallel
while IFS= read -r file; do
    COUNTER=$((COUNTER + 1))
    
    # Wait if we have too many background jobs
    while [ $(jobs -r | wc -l) -ge $MAX_PARALLEL ]; do
        sleep 0.1
    done
    
    # Start the job in background
    process_file "$file" "$COUNTER" "$FILE_COUNT" &
    
    # Store the PID
    echo $! >> "$JOBFILE"
done <<< "$AUDIO_FILES"

# Wait for all background jobs to complete
echo ""
echo -e "${YELLOW}Waiting for all jobs to complete...${NC}"

while read pid; do
    wait $pid
done < "$JOBFILE"

# Clean up
rm -f "$JOBFILE"
rmdir "$OUTPUT_DIR/$MODEL_NAME" 2>/dev/null

echo ""
echo -e "${GREEN}🎉 Parallel vocal extraction complete!${NC}"
echo -e "Extracted vocals are in: ${YELLOW}$OUTPUT_DIR${NC}"

# Count successfully extracted files
EXTRACTED_COUNT=$(ls "$OUTPUT_DIR"/*_vocals.wav 2>/dev/null | wc -l | tr -d ' ')
echo -e "Successfully extracted: ${GREEN}$EXTRACTED_COUNT/$FILE_COUNT${NC} files"

if [ $EXTRACTED_COUNT -lt $FILE_COUNT ]; then
    echo -e "${YELLOW}Note: Some files may have failed. Check the output above for errors.${NC}"
fi

echo ""
echo -e "${YELLOW}Tip: These clean vocal files are perfect for:${NC}"
echo "  • Training a custom ElevenLabs voice clone"
echo "  • Creating a meditation-specific voice model"
echo "  • Analyzing speech patterns and pacing"