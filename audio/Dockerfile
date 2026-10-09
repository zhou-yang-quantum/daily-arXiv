FROM node:22-bookworm-slim
RUN apt-get update -qq && apt-get install -y -qq python3 python3-venv ffmpeg espeak-ng && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/speech
ENV PATH="/opt/speech/bin:${PATH}" PYTHONUTF8=1 OMP_NUM_THREADS=2
COPY requirements-speech.txt /tmp/requirements-speech.txt
RUN pip install --no-cache-dir -r /tmp/requirements-speech.txt
WORKDIR /app
ENTRYPOINT ["python", "tools/generate_audio.py"]
