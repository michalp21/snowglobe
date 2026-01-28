import argparse
import os
from concurrent.futures import ThreadPoolExecutor
import av


def _get_duration(video_path):
    with av.open(video_path) as container:
        stream = container.streams.video[0]
        duration = float(stream.duration * stream.time_base) if stream.duration else None

        if duration is None:
            for frame in container.decode(video=0):
                pass
            duration = float(frame.pts * stream.time_base) if frame.pts else None

    if not duration:
        raise RuntimeError("Could not determine video duration")
    return duration


def _extract_frame(video_path, target_sec, out_path):
    with av.open(video_path) as container:
        stream = container.streams.video[0]
        target_pts = int(target_sec / stream.time_base)
        container.seek(target_pts, stream=stream)
        closest = None
        for frame in container.decode(video=0):
            if frame.pts is None:
                continue
            if closest is None or abs(frame.pts - target_pts) < abs(closest.pts - target_pts):
                closest = frame
            if frame.pts >= target_pts:
                break
        if closest is not None:
            closest.to_image().save(out_path)
    return out_path


def sample(video_path, num_stills, output_dir):
    duration = _get_duration(video_path)

    if num_stills == 1:
        times = [duration / 2]
    else:
        times = [i * duration / (num_stills - 1) for i in range(num_stills)]

    basename = os.path.splitext(os.path.basename(video_path))[0]

    tasks = []
    for i, t in enumerate(times):
        out_path = os.path.join(output_dir, f"{basename}_{i:04d}.png")
        tasks.append((video_path, t, out_path))

    with ThreadPoolExecutor() as pool:
        futures = [pool.submit(_extract_frame, *task) for task in tasks]
        saved = [f.result() for f in futures]

    print(f"Saved {len(saved)} stills to {output_dir}")
    return saved


VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".mxf", ".webm"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract evenly spaced stills from all videos in a step's input folder")
    parser.add_argument("step", choices=["step1", "step2"], help="Processing step (step1 or step2)")
    parser.add_argument("num_stills", type=int, help="Number of stills to extract per video")
    args = parser.parse_args()

    input_dir = os.path.join(args.step, "input")
    output_dir = os.path.join(args.step, "output")
    
    os.makedirs(output_dir, exist_ok=True)
    for root, _, files in os.walk(output_dir, topdown=False):
        for file in files:
            os.remove(os.path.join(root, file))

    videos = sorted(
        f for f in os.listdir(input_dir)
        if os.path.splitext(f)[1].lower() in VIDEO_EXTENSIONS
    )

    if not videos:
        print(f"No videos found in {input_dir}")
    else:
        for video in videos:
            video_path = os.path.join(input_dir, video)
            print(f"Processing {video}...")
            sample(video_path, args.num_stills, output_dir)
