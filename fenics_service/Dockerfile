FROM ghcr.io/scientificcomputing/fenics-gmsh:2024-05-30

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /app/requirements.txt

COPY . /app/fenics_service

ENV PYTHONUNBUFFERED=1
CMD ["bash", "-lc", "uvicorn fenics_service.main:app --host 0.0.0.0 --port ${PORT:-8001}"]