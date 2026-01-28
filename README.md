Any landmark can be captured in a snowglobe!

# Instructions

Requires python and uv.

1. Find a video encircling the landmark. Optionally dewarp in a video editor.
2. Sample 20 evenly-spaced positions around the landmark using `prep/sample.py`.
4. Generate "crane to overhead" shots for each one with genAI.
5. Sample 10 evenly-spaced positions around the hemisphere using `prep/sample.py`.
6. Add these to the `stills` folder.