#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p icons

# Download Turndown library
curl -L https://unpkg.com/turndown/dist/turndown.js -o turndown.js

# Create placeholder icons (you should replace these with actual icons)
echo "Creating placeholder icons..."
for size in 16 48 128; do
  touch "icons/icon${size}.png"
done

echo "Dependencies downloaded successfully!" 