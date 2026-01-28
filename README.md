Any landmark can be captured in a snowglobe!

# Instructions

Requires python and uv.

1. Find a video encircling the landmark. Optionally dewarp in a video editor.
2. Sample 200 evenly-spaced positions around the landmark using `prep/sample.py`.
3. Use genAI to center the images around the landmark, filling in border areas if necessary.
4. Generate "crane to overhead" shots for each one with genAI.
5. Sample 300 evenly-spaced positions around the hemisphere using `prep/sample.py`.
6. Construct equirectangular projection using `prep/projection.py`.