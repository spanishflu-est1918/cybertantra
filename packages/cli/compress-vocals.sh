#!/bin/bash

# Directory containing the extracted vocals
VOCAL_DIR="/Users/gorkolas/Documents/www/cybertantra/packages/cli/apps/cybertantra/public/audio/extracted-vocals"
OUTPUT_DIR="$VOCAL_DIR/compressed"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Target size in MB
TARGET_SIZE_MB=10

echo "🎵 Compressing vocal files to less than ${TARGET_SIZE_MB}MB..."
echo "========================================="

# Find all vocal WAV files
find "$VOCAL_DIR" -name "*vocals*.wav" -type f | while read -r file; do
    filename=$(basename "$file")
    output_file="$OUTPUT_DIR/${filename%.wav}.mp3"
    
    echo "Processing: $filename"
    
    # Get file size in MB
    file_size_mb=$(du -m "$file" | cut -f1)
    echo "  Original size: ${file_size_mb}MB"
    
    # Calculate bitrate to achieve target size
    # Get duration in seconds
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$file")
    
    # Calculate target bitrate (in kbps) to achieve target size
    # Formula: bitrate = (target_size_in_bits) / (duration_in_seconds)
    # With some margin (using 9MB instead of 10MB for safety)
    target_bits=$((9 * 1024 * 1024 * 8))  # 9MB in bits
    target_bitrate=$(echo "scale=0; $target_bits / $duration / 1000" | bc)
    
    # Ensure minimum quality (don't go below 64kbps)
    if [ "$target_bitrate" -lt 64 ]; then
        target_bitrate=64
    fi
    
    # Cap at 192kbps for reasonable quality
    if [ "$target_bitrate" -gt 192 ]; then
        target_bitrate=192
    fi
    
    echo "  Target bitrate: ${target_bitrate}kbps"
    
    # Compress using ffmpeg
    ffmpeg -i "$file" \
        -codec:a libmp3lame \
        -b:a "${target_bitrate}k" \
        -ar 44100 \
        -ac 1 \
        -loglevel error \
        "$output_file"
    
    # Check final size
    if [ -f "$output_file" ]; then
        final_size_mb=$(du -m "$output_file" | cut -f1)
        echo "  ✅ Compressed to: ${final_size_mb}MB -> $output_file"
    else
        echo "  ❌ Failed to compress $filename"
    fi
    echo ""
done

echo "✨ Compression complete!"
echo "Compressed files saved to: $OUTPUT_DIR"

# Show summary
echo ""
echo "Summary:"
echo "--------"
total_original=$(find "$VOCAL_DIR" -name "*vocals*.wav" -type f -exec du -cm {} + | grep total | cut -f1)
total_compressed=$(find "$OUTPUT_DIR" -name "*.mp3" -type f -exec du -cm {} + | grep total | cut -f1)
echo "Total original size: ${total_original}MB"
echo "Total compressed size: ${total_compressed}MB"
echo "Space saved: $((total_original - total_compressed))MB"